export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMqttUplinkListener, startTelegramScheduler } = await import("~/server/mqtt")
    startMqttUplinkListener()
    startTelegramScheduler()
  }
}

