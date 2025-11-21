import mqtt from "mqtt"

type UserLike = {
  name: string
  rfidTag: string | null
  role: string
}

function getMqttConfig() {
  const brokerUrl = process.env.MQTT_BROKER_URL
  const topic = process.env.MQTT_USER_CREATED_TOPIC

  if (!brokerUrl || !topic) {
    return null
  }

  return {
    brokerUrl,
    topic,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  }
}

export async function publishUserCreatedMqtt(user: UserLike) {
  const config = getMqttConfig()

  // If MQTT is not configured, just skip without failing the request
  if (!config) return

  const payload = JSON.stringify({
    name: user.name,
    rfidTag: user.rfidTag,
    role: String(user.role).toUpperCase(),
  })

  await new Promise<void>((resolve) => {
    try {
      const client = mqtt.connect(config.brokerUrl, {
        username: config.username,
        password: config.password,
      })

      client.on("connect", () => {
        client.publish(config.topic, payload, { qos: 0 }, () => {
          client.end()
          resolve()
        })
      })

      client.on("error", (err) => {
        console.error("MQTT connection error (user created):", err)
        try {
          client.end(true)
        } catch {
          // ignore
        }
        resolve()
      })
    } catch (err) {
      console.error("MQTT publish setup error (user created):", err)
      resolve()
    }
  })
}


