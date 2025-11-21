import { UserRound, UserRoundCog } from "lucide-react"
import { notFound } from "next/navigation"

import { db } from "~/server/db"
import { Badge } from "~/components/ui/badge"
import { EmployeeCleanupsChart } from "~/components/employees/employee-cleanups-chart"
import { EmployeeMonthlyCleanupsCard } from "~/components/employees/employee-monthly-cleanups-card"
import { EmployeeAdditionalInfoCard } from "~/components/employees/employee-additional-info-card"
import { EmployeeRecentTrashcansCard } from "~/components/employees/employee-recent-trashcans-card"

interface EmployeeDetailsPageProps {
  params: { id: string }
}

export default async function EmployeeDetailsPage({
  params,
}: EmployeeDetailsPageProps) {
  const employee = await db.user.findUnique({
    where: { id: params.id },
  })

  if (!employee) {
    notFound()
  }

  const now = new Date()

  // Last 14 days (including today)
  const since14 = new Date(now)
  since14.setDate(since14.getDate() - 13)

  const cleanupsLast14 = await db.cleanup.findMany({
    where: {
      userId: params.id,
      createdAt: {
        gte: since14,
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Daily aggregation for last 14 days
  const dayKeys: string[] = []
  const cleanupsByDay = new Map<string, number>()

  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
    dayKeys.push(key)
    cleanupsByDay.set(key, 0)
  }

  for (const c of cleanupsLast14) {
    const key = c.createdAt.toISOString().slice(0, 10)
    if (cleanupsByDay.has(key)) {
      cleanupsByDay.set(key, (cleanupsByDay.get(key) ?? 0) + 1)
    }
  }

  const dailyCleanupChartData = dayKeys.map((key) => {
    const d = new Date(key)
    return {
      rawKey: key,
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: cleanupsByDay.get(key) ?? 0,
    }
  })

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyTotal = await db.cleanup.count({
    where: {
      userId: params.id,
      createdAt: {
        gte: monthStart,
      },
    },
  })

  const recentTrashcans = await db.cleanup.findMany({
    where: {
      userId: params.id,
    },
    include: {
      trashcan: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  })

  const recentTrashcanRows = recentTrashcans.map((c) => ({
    id: c.id,
    trashcanName: c.trashcan.name,
    location: c.trashcan.location ?? null,
    createdAt: c.createdAt.toISOString(),
  }))

  const isAdmin = employee.role === "ADMIN"

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1 ml-2">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0 flex items-center gap-2">
            <span>{employee.name}</span>
            <Badge
              variant="outline"
              className={
                isAdmin
                  ? "border-pink-200 bg-pink-50 text-pink-700 flex items-center gap-1 px-2 py-0.5 ml-2"
                  : "border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 px-2 py-0.5 ml-2"
              }
            >
              {isAdmin ? (
                <UserRoundCog className="h-3.5 w-3.5" />
              ) : (
                <UserRound className="h-3.5 w-3.5" />
              )}
              <span className="text-[11px] font-medium tracking-wide">
                {employee.role}
              </span>
            </Badge>
          </h3>
          <p className="text-muted-foreground text-md">
            Here&apos;s some information and statistics about this employee
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f2f2] border border-[#eeeeee]">
          <span className="text-xl" aria-hidden="true">
            {isAdmin ? <UserRoundCog /> : <UserRound />}
          </span>
          <span className="sr-only">Employee details</span>
        </div>
      </div>
      <div className="px-2">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
          <div className="flex-1 flex flex-col gap-4">
            <EmployeeCleanupsChart dailyData={dailyCleanupChartData} />
            <EmployeeRecentTrashcansCard rows={recentTrashcanRows} />
          </div>
          <div className="w-full lg:w-72 xl:w-100 flex flex-col gap-4">
            <EmployeeMonthlyCleanupsCard value={monthlyTotal} />
            <EmployeeAdditionalInfoCard
              email={employee.email ?? null}
              rfidTag={employee.rfidTag ?? null}
              active={employee.active}
            />
          </div>
        </div>
      </div>
    </main>
  )
}


