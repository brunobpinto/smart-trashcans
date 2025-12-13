import mqtt from "mqtt"
import { db } from "~/server/db"

// LoRaWAN device IDs to send downlinks to
const LORAWAN_IDS = ["44111", "44102"]

// Operation codes
const OPERATION_INSERT = 0x01
const OPERATION_DELETE = 0x02

// Role codes
const ROLE_WORKER = 0x01
const ROLE_ADMIN = 0x02

type UserLike = {
  name: string
  rfidTag: string | null
  role: string
}

function getMqttConfig() {
  const brokerUrl = process.env.MQTT_BROKER_URL
  const topicTemplate = process.env.MQTT_DOWNLINK_TOPIC

  if (!brokerUrl || !topicTemplate) {
    return null
  }

  return {
    brokerUrl,
    topicTemplate,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  }
}

/**
 * Convert RFID tag string to 4 bytes
 * Format: "AA BB CC DD" - 4 hex bytes separated by spaces
 */
function rfidTagToBytes(rfidTag: string): number[] {
  // Split by space and parse each hex byte
  const hexParts = rfidTag.trim().split(" ")
  
  const bytes: number[] = []
  for (const hex of hexParts) {
    const byteValue = parseInt(hex, 16)
    if (!isNaN(byteValue)) {
      bytes.push(byteValue & 0xff)
    }
  }
  
  // Ensure we always return exactly 4 bytes (pad with zeros if needed)
  while (bytes.length < 4) {
    bytes.push(0)
  }
  
  return bytes.slice(0, 4)
}

/**
 * Build the payload for INSERT operation
 * Format:
 *   byte 1: 0x01 (INSERT)
 *   bytes 2-5: 4 bytes of RFID tag
 *   byte 6: 0x01 for WORKER, 0x02 for ADMIN
 */
function buildInsertPayload(user: UserLike): string {
  const bytes: number[] = []
  
  // Byte 1: Operation (INSERT = 0x01)
  bytes.push(OPERATION_INSERT)
  
  // Bytes 2-5: RFID tag (4 bytes)
  const rfidBytes = rfidTagToBytes(user.rfidTag ?? "00 00 00 00")
  bytes.push(...rfidBytes)
  
  // Byte 6: Role (WORKER = 0x01, ADMIN = 0x02)
  const roleValue = user.role.toUpperCase() === "ADMIN" ? ROLE_ADMIN : ROLE_WORKER
  bytes.push(roleValue)
  
  // Convert to base64
  const buffer = Buffer.from(bytes)
  return buffer.toString("base64")
}

/**
 * Build the payload for DELETE operation
 * Format:
 *   byte 1: 0x02 (DELETE)
 *   bytes 2-5: 4 bytes of RFID tag
 *   (no role byte for delete)
 */
function buildDeletePayload(user: UserLike): string {
  const bytes: number[] = []
  
  // Byte 1: Operation (DELETE = 0x02)
  bytes.push(OPERATION_DELETE)
  
  // Bytes 2-5: RFID tag (4 bytes)
  const rfidBytes = rfidTagToBytes(user.rfidTag ?? "00 00 00 00")
  bytes.push(...rfidBytes)
  
  // No byte 6 for DELETE operation
  
  // Convert to base64
  const buffer = Buffer.from(bytes)
  return buffer.toString("base64")
}

/**
 * Build the JSON payload for TTN/TTS downlink
 */
function buildDownlinkMessage(frmPayload: string) {
  return JSON.stringify({
    downlinks: [{
      f_port: 5,
      frm_payload: frmPayload,
      priority: "HIGH",
    }],
  })
}

/**
 * Publish a message to all LoRaWAN devices
 */
async function publishToAllDevices(message: string, operationName: string) {
  const config = getMqttConfig()

  // If MQTT is not configured, just skip without failing the request
  if (!config) return

  // Send to all LoRaWAN devices
  const publishPromises = LORAWAN_IDS.map((lorawanId) => {
    const topic = config.topicTemplate.replace("LORAWAN-ID", lorawanId)
    
    return new Promise<void>((resolve) => {
    try {
      const client = mqtt.connect(config.brokerUrl, {
        username: config.username,
        password: config.password,
      })

      client.on("connect", () => {
          client.publish(topic, message, { qos: 0 }, () => {
            console.log(`MQTT ${operationName} downlink sent to device ${lorawanId}`)
          client.end()
          resolve()
        })
      })

      client.on("error", (err) => {
          console.error(`MQTT connection error for device ${lorawanId} (${operationName}):`, err)
        try {
          client.end(true)
        } catch {
          // ignore
        }
        resolve()
      })
    } catch (err) {
        console.error(`MQTT publish setup error for device ${lorawanId} (${operationName}):`, err)
      resolve()
      }
    })
  })

  await Promise.all(publishPromises)
}

/**
 * Publish INSERT message when a user is created
 */
export async function publishUserCreatedMqtt(user: UserLike) {
  const frmPayload = buildInsertPayload(user)
  const message = buildDownlinkMessage(frmPayload)
  await publishToAllDevices(message, "INSERT")
}

/**
 * Publish DELETE message when a user is deleted
 */
export async function publishUserDeletedMqtt(user: UserLike) {
  const frmPayload = buildDeletePayload(user)
  const message = buildDownlinkMessage(frmPayload)
  await publishToAllDevices(message, "DELETE")
}

// ============================================
// UPLINK LISTENER
// ============================================

/**
 * Get MQTT uplink configuration
 */
function getUplinkConfig() {
  const brokerUrl = process.env.MQTT_BROKER_URL
  const uplinkTopic = process.env.MQTT_UPLINK_TOPIC

  if (!brokerUrl || !uplinkTopic) {
    return null
  }

  return {
    brokerUrl,
    uplinkTopic,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  }
}

/**
 * TTN Uplink message structure (partial)
 */
interface TtnUplinkMessage {
  uplink_message?: {
    decoded_payload?: {
      operation?: string
      // Cleanup fields
      rfidTag?: string
      trashcanName?: string
      // Status fields
      fillPercentage?: number
      usageCount?: number
    }
  }
}

/**
 * Handle cleanup operation from uplink message
 */
async function handleCleanupOperation(rfidTag: string, trashcanName: string) {
  try {
    // Find user by rfidTag
    const user = await db.user.findUnique({
      where: { rfidTag },
    })

    if (!user) {
      console.error(`[MQTT Uplink] User not found with rfidTag: ${rfidTag}`)
      return
    }

    // Find trashcan by name
    const trashcan = await db.trashcan.findFirst({
      where: { name: trashcanName },
    })

    if (!trashcan) {
      console.error(`[MQTT Uplink] Trashcan not found with name: ${trashcanName}`)
      return
    }

    // Create cleanup record
    const cleanup = await db.cleanup.create({
      data: {
        userId: user.id,
        trashcanId: trashcan.id,
      },
    })

    console.log(`[MQTT Uplink] Cleanup created: ${cleanup.id} (user: ${user.name}, trashcan: ${trashcan.name})`)
  } catch (error) {
    console.error("[MQTT Uplink] Error handling cleanup operation:", error)
  }
}

/**
 * Handle status operation from uplink message
 */
async function handleStatusOperation(
  trashcanName: string,
  fillPercentage: number,
  usageCount: number
) {
  try {
    // Find trashcan by name
    const trashcan = await db.trashcan.findFirst({
      where: { name: trashcanName },
    })

    if (!trashcan) {
      console.error(`[MQTT Uplink] Trashcan not found with name: ${trashcanName}`)
      return
    }

    // Create status record with hour set to current time
    const now = new Date()
    const status = await db.status.create({
      data: {
        trashcanId: trashcan.id,
        capacityPct: fillPercentage,
        useCount: usageCount,
        hour: now,
      },
    })

    console.log(
      `[MQTT Uplink] Status created: ${status.id} (trashcan: ${trashcan.name}, capacity: ${fillPercentage}%, useCount: ${usageCount})`
    )
  } catch (error) {
    console.error("[MQTT Uplink] Error handling status operation:", error)
  }
}

/**
 * Process incoming uplink message
 */
async function processUplinkMessage(messageBuffer: Buffer) {
  try {
    const messageStr = messageBuffer.toString("utf-8")
    const message = JSON.parse(messageStr) as TtnUplinkMessage

    const decodedPayload = message.uplink_message?.decoded_payload
    if (!decodedPayload) {
      console.log("[MQTT Uplink] No decoded_payload in message")
      return
    }

    const operation = decodedPayload.operation
    console.log(`[MQTT Uplink] Received operation: ${operation}`)

    if (operation === "CLEANUP") {
      const rfidTag = decodedPayload.rfidTag
      const trashcanName = decodedPayload.trashcanName

      if (!rfidTag || !trashcanName) {
        console.error("[MQTT Uplink] Cleanup message missing rfidTag or trashcanName")
        return
      }

      await handleCleanupOperation(rfidTag, trashcanName)
    } else if (operation === "STATUS") {
      const trashcanName = decodedPayload.trashcanName
      const fillPercentage = decodedPayload.fillPercentage
      const usageCount = decodedPayload.usageCount

      if (!trashcanName || fillPercentage === undefined || usageCount === undefined) {
        console.error("[MQTT Uplink] Status message missing trashcanName, fillPercentage, or usageCount")
        return
      }

      await handleStatusOperation(trashcanName, fillPercentage, usageCount)
    }
  } catch (error) {
    console.error("[MQTT Uplink] Error processing uplink message:", error)
  }
}

// Track if the listener is already running
let uplinkListenerRunning = false

/**
 * Start the MQTT uplink listener
 * This should be called once when the server starts
 */
export function startMqttUplinkListener() {
  if (uplinkListenerRunning) {
    console.log("[MQTT Uplink] Listener already running")
    return
  }

  const config = getUplinkConfig()
  if (!config) {
    console.log("[MQTT Uplink] Not configured, skipping listener setup")
    return
  }

  console.log(`[MQTT Uplink] Starting listener for topic: ${config.uplinkTopic}`)

  const client = mqtt.connect(config.brokerUrl, {
    username: config.username,
    password: config.password,
  })

  client.on("connect", () => {
    console.log("[MQTT Uplink] Connected to broker")
    
    client.subscribe(config.uplinkTopic, { qos: 0 }, (err) => {
      if (err) {
        console.error("[MQTT Uplink] Failed to subscribe:", err)
      } else {
        console.log(`[MQTT Uplink] Subscribed to: ${config.uplinkTopic}`)
        uplinkListenerRunning = true
      }
    })
  })

  client.on("message", (topic, message) => {
    console.log(`[MQTT Uplink] Message received on topic: ${topic}`)
    void processUplinkMessage(message)
  })

  client.on("error", (err) => {
    console.error("[MQTT Uplink] Connection error:", err)
  })

  client.on("close", () => {
    console.log("[MQTT Uplink] Connection closed")
    uplinkListenerRunning = false
  })

  client.on("reconnect", () => {
    console.log("[MQTT Uplink] Reconnecting...")
  })
}

// ============================================
// TELEGRAM NOTIFICATIONS
// ============================================

/**
 * Get Telegram configuration from environment
 */
function getTelegramConfig() {
  const botKey = process.env.TELEGRAM_BOT_KEY
  const chatId = process.env.TELEGRAM_ADMIN_MSG_ID

  if (!botKey || !chatId) {
    return null
  }

  return { botKey, chatId }
}

/**
 * Send a message via Telegram bot
 */
async function sendTelegramMessage(message: string) {
  const config = getTelegramConfig()
  if (!config) {
    console.log("[Telegram] Not configured, skipping message")
    return
  }

  try {
    const url = `https://api.telegram.org/bot${config.botKey}/sendMessage`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[Telegram] Failed to send message:", errorText)
    } else {
      console.log("[Telegram] Message sent successfully")
    }
  } catch (error) {
    console.error("[Telegram] Error sending message:", error)
  }
}

/**
 * Query trashcans with their latest status data
 */
async function getTrashcansWithStatus() {
  try {
    // Get all trashcans with their latest status
    const trashcans = await db.trashcan.findMany({
      include: {
        statuses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    // Map to include capacity and useCount, filter those with status
    return trashcans
      .filter((t) => t.statuses.length > 0)
      .map((t) => ({
        name: t.name,
        description: t.description,
        capacityPct: t.statuses[0]!.capacityPct,
        useCount: t.statuses[0]!.useCount,
        binType: t.binType,
        latitude: t.latitude,
        longitude: t.longitude,
      }))
  } catch (error) {
    console.error("[Telegram] Error querying trashcans:", error)
    return []
  }
}

type TrashcanData = {
  name: string
  description: string | null
  capacityPct: number
  useCount: number
  binType: string
  latitude: number | null
  longitude: number | null
}

/**
 * Format the trashcan data into a Telegram message
 */
function formatTelegramMessage(trashcans: TrashcanData[]): string {
  if (trashcans.length === 0) {
    return "📊 <b>Relatório de Lixeiras</b>\n\nNenhuma lixeira com dados disponíveis."
  }

  const now = new Date()
  const timeStr = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })

  // Get top 5 fullest (by capacityPct)
  const top5Fullest = [...trashcans]
    .sort((a, b) => b.capacityPct - a.capacityPct)
    .slice(0, 5)

  let message = `📊 <b>Top 5 Lixeiras Mais Cheias</b>\n`
  message += `🕐 ${timeStr}\n\n`

  // Table for top 5 fullest
  message += `<pre>`
  message += `┌────┬──────────┬────────┬─────────┐\n`
  message += `│ #  │ Nome     │   %    │  Tipo   │\n`
  message += `├────┼──────────┼────────┼─────────┤\n`

  top5Fullest.forEach((t, index) => {
    const emoji = t.capacityPct >= 66 ? "🔴" : t.capacityPct >= 33 ? "🟡" : "🟢"
    const name = t.name.length > 8 ? t.name.substring(0, 7) + "…" : t.name.padEnd(8)
    const pct = `${emoji} ${t.capacityPct.toFixed(0).padStart(1)}%`
    const type = t.binType === "RECYCLE" ? "RECYCLE" : "COMMON "
    
    message += `│ ${(index + 1).toString().padStart(2)} │ ${name} │ ${pct} │ ${type} │\n`
  })

  message += `└────┴──────────┴────────┴─────────┘`
  message += `</pre>\n\n`

  // Details section
  message += `<b>📋 Detalhes:</b>\n`
  top5Fullest.forEach((t, index) => {
    message += `\n${index + 1}. <b>${t.name}</b> (${t.capacityPct.toFixed(0)}%)`
    if (t.description) {
      message += `\nDescrição: ${t.description}`
    }
    message += `\n`
  })

  return message
}

/**
 * Send the trashcan report via Telegram
 */
async function sendTrashcanReport() {
  console.log("[Telegram] Generating trashcan report...")
  const trashcans = await getTrashcansWithStatus()
  const message = formatTelegramMessage(trashcans)
  await sendTelegramMessage(message)
}

// Track if the Telegram scheduler is running
let telegramSchedulerRunning = false

/**
 * Start the Telegram notification scheduler
 * Sends a report every 5 minutes
 */
export function startTelegramScheduler() {
  if (telegramSchedulerRunning) {
    console.log("[Telegram] Scheduler already running")
    return
  }

  const config = getTelegramConfig()
  if (!config) {
    console.log("[Telegram] Not configured, skipping scheduler setup")
    return
  }

  console.log("[Telegram] Starting scheduler (every 5 minutes)")
  telegramSchedulerRunning = true

  // Send initial report after 10 seconds
  setTimeout(() => {
    void sendTrashcanReport()
  }, 10000)

  // Then send every 5 minutes (300000 ms)
  setInterval(() => {
    void sendTrashcanReport()
  }, 5 * 60 * 1000)
}
