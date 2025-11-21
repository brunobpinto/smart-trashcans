import { auth } from "~/server/auth"
import { db } from "~/server/db"
import { DashboardUsageChart } from "~/components/dashboard/dashboard-usage-chart"
import { DashboardCapacityChart } from "~/components/dashboard/dashboard-capacity-chart"
import { DashboardMostFullTrashcansCard } from "~/components/dashboard/dashboard-most-full-trashcans-card"
import { DashboardAdditionalInfoCard } from "~/components/dashboard/dashboard-additional-info-card"
import { Button } from "~/components/ui/button"
import Image from "next/image"

export default async function DashboardPage() {
  const session = await auth()
  const userName = session?.user?.name ?? "there"
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL ?? "https://grafana.com"

  const now = new Date()
  const startWindow = new Date()
  startWindow.setDate(now.getDate() - 13)

  const statuses = await db.status.findMany({
    where: {
      hour: {
        gte: startWindow,
      },
    },
    orderBy: { hour: "asc" },
    select: {
      hour: true,
      useCount: true,
    },
  })

  // Daily aggregation for last 14 days across all trashcans
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
      usageByDay.set(key, (usageByDay.get(key) ?? 0) + s.useCount)
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

  // Hourly aggregation for "today" across all trashcans
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

  // Capacity data per trashcan (last status)
  const trashcans = await db.trashcan.findMany({
    select: {
      id: true,
      name: true,
      location: true,
    },
  })

  const latestStatuses = await db.status.findMany({
    orderBy: {
      hour: "desc",
    },
    distinct: ["trashcanId"],
    select: {
      trashcanId: true,
      capacityPct: true,
    },
  })

  const statusByTrashcan = new Map(
    latestStatuses.map((s) => [s.trashcanId, s.capacityPct ?? 0])
  )

  const capacityData = trashcans.map((t) => {
    const capacityPct = statusByTrashcan.get(t.id) ?? 0

    return {
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      capacityPct,
    }
  })

  const totalCapacity = capacityData.reduce(
    (sum, t) => sum + t.capacityPct,
    0
  )
  const avgCapacity =
    capacityData.length > 0 ? totalCapacity / capacityData.length : 0

  let below33 = 0
  let between33And66 = 0
  let above66 = 0

  for (const t of capacityData) {
    const value = t.capacityPct
    if (value < 33) {
      below33 += 1
    } else if (value < 66) {
      between33And66 += 1
    } else {
      above66 += 1
    }
  }

  const mostFullTrashcans = [...capacityData]
    .sort((a, b) => b.capacityPct - a.capacityPct)
    .slice(0, 4)

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1 ml-2">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0">
            Welcome back, {userName}!
          </h3>
          <p className="text-muted-foreground text-md">
            Here&apos;s an overview of your smart trashcans and activity.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="-mb-8 mr-2">
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2"
          >
            <Image
              src="/grafana-logo.svg"
              alt="Grafana"
              width={18}
              height={18}
            />
            <span>Open Grafana</span>
          </a>
        </Button>
      </div>
      <div className="px-2 -mt-3">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
          <div className="flex-1 flex flex-col gap-4">
            <DashboardUsageChart
              dailyData={dailyUsageChartData}
              hourlyTodayData={hourlyUsageChartData}
            />
            <DashboardMostFullTrashcansCard rows={mostFullTrashcans} />
          </div>
          <div className="w-full lg:w-72 xl:w-100 flex flex-col gap-4">
            <DashboardCapacityChart value={avgCapacity} />
            <DashboardAdditionalInfoCard
              below33={below33}
              between33And66={between33And66}
              above66={above66}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

