import { FolderClock } from "lucide-react"
import { db } from "~/server/db"
import {
  StatusesTable,
} from "~/components/statuses/statuses-table"
import {
  columns,
  type StatusRow,
} from "~/components/statuses/statuses-columns"

export default async function StatusesPage() {
  const statuses = await db.status.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      trashcan: true,
    },
  })

  const data: StatusRow[] = statuses.map((s) => ({
    id: s.id,
    trashcanId: s.trashcanId,
    trashcanName: s.trashcan.name,
    location: s.trashcan.location ?? null,
    description: s.trashcan.description ?? null,
    binType: s.trashcan.binType,
    capacityPct: s.capacityPct,
    useCount: s.useCount,
    createdAt: s.createdAt.toISOString(),
  }))

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0">
            Statuses
          </h3>
          <p className="text-muted-foreground text-md">
            Here&apos;s a list of the hourly status of the trashcans.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f2f2] border border-[#eeeeee]">
          <span className="text-xl" aria-hidden="true">
            <FolderClock />
          </span>
          <span className="sr-only">Statuses</span>
        </div>
      </div>
      <div className="px-5">
        <StatusesTable columns={columns} data={data} />
      </div>
    </main>
  )
}

