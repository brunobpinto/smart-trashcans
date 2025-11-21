import { Trash, Recycle, Trash2 } from "lucide-react"
import { db } from "~/server/db"
import { notFound } from "next/navigation"
import { Badge } from "~/components/ui/badge"
import { TrashcanUsageChart } from "~/components/trashcans/trashcan-usage-chart"
import { TrashcanCapacityChart } from "~/components/trashcans/trashcan-capacity-chart"
import { TrashcanRecentCleanupsCard } from "~/components/trashcans/trashcan-recent-cleanups-card"
import { TrashcanAdditionalInfoCard } from "~/components/trashcans/trashcan-additional-info-card"

interface TrashcanDetailsPageProps {
  params: { id: string }
}

export default async function TrashcanDetailsPage({
  params,
}: TrashcanDetailsPageProps) {
  const trashcan = await db.trashcan.findUnique({
    where: { id: params.id },
  })

  if (!trashcan) {
    notFound()
  }

  const now = new Date()
  const startWindow = new Date()
  startWindow.setDate(now.getDate() - 13)

  const statuses = await db.status.findMany({
    where: {
      trashcanId: params.id,
      hour: {
        gte: startWindow,
      },
    },
    orderBy: { hour: "asc" },
  })

  // Daily aggregation for last 14 days
  const dayKeys: string[] = []
  const usageByDay = new Map<string, number>()

  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
    dayKeys.push(key)
    usageByDay.set(key, 0)
  }

  for (const s of statuses) {
    const key = s.hour.toISOString().slice(0, 10)
    if (usageByDay.has(key)) {
      usageByDay.set(key, usageByDay.get(key)! + s.useCount)
    }
  }

  const dailyUsageChartData = dayKeys.map((key) => {
    const d = new Date(key)
    return {
      rawKey: key,
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      useCount: usageByDay.get(key) ?? 0,
    }
  })

  // Hourly aggregation for "today"
  const todayKey = now.toISOString().slice(0, 10)
  const hourlyUsage = new Array<number>(24).fill(0)

  for (const s of statuses) {
    const hourDate = s.hour
    if (!hourDate) continue

    const key = hourDate.toISOString().slice(0, 10)
    if (key === todayKey) {
      const hour = hourDate.getHours()
      const safeUseCount = typeof s.useCount === "number" ? s.useCount : 0
      if (hour >= 0 && hour < hourlyUsage.length) {
        hourlyUsage[hour] = (hourlyUsage[hour] ?? 0) + safeUseCount
      }
    }
  }

  const hourlyUsageChartData = hourlyUsage.map((count, hour) => ({
    rawKey: `${todayKey}T${hour.toString().padStart(2, "0")}:00`,
    date: `${hour.toString().padStart(2, "0")}:00`,
    useCount: count,
  }))

  const lastStatus = statuses[statuses.length - 1]
  const lastCapacityPct =
    lastStatus && typeof lastStatus.capacityPct === "number"
      ? lastStatus.capacityPct
      : 0

  const isRecycle = trashcan.binType === "RECYCLE"

  const recentCleanups = await db.cleanup.findMany({
    where: {
      trashcanId: params.id,
    },
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  })

  const recentCleanupRows = recentCleanups.map((c) => ({
    id: c.id,
    name: c.user.name,
    email: c.user.email ?? null,
    rfidTag: c.user.rfidTag ?? null,
    role: c.user.role,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1 ml-2">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0 flex items-center gap-2">
            <span>{trashcan.name}</span>
            <Badge
              variant="outline"
              className={
                isRecycle
                  ? "border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 px-2 py-0.5 ml-2"
                  : "border-gray-200 bg-gray-100 text-gray-700 flex items-center gap-1 px-2 py-0.5 ml-2"
              }
            >
              {isRecycle ? (
                <Recycle className="h-3.5 w-3.5" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span className="text-[11px] font-medium tracking-wide">
                {trashcan.binType}
              </span>
            </Badge>
          </h3>
          <p className="text-muted-foreground text-md">
            {trashcan.description ?? "This trashcan does not have a description yet."}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f2f2] border border-[#eeeeee]">
          <span className="text-xl" aria-hidden="true">
            <Trash />
          </span>
          <span className="sr-only">Trashcan details</span>
        </div>
      </div>
      <div className="px-2">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
          <div className="flex-1 flex flex-col gap-4">
            <TrashcanUsageChart
              dailyData={dailyUsageChartData}
              hourlyTodayData={hourlyUsageChartData}
            />
            <TrashcanRecentCleanupsCard rows={recentCleanupRows} />
          </div>
          <div className="w-full lg:w-72 xl:w-100 flex flex-col gap-4">
            <TrashcanCapacityChart value={lastCapacityPct} />
            <TrashcanAdditionalInfoCard
              location={trashcan.location ?? null}
              latitude={trashcan.latitude ?? null}
              longitude={trashcan.longitude ?? null}
              height={trashcan.height}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

