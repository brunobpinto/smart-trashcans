import { BrushCleaning } from "lucide-react"
import { db } from "~/server/db"
import {
  CleanupsTable,
} from "~/components/cleanups/cleanups-table"
import {
  columns,
  type CleanupRow,
} from "~/components/cleanups/cleanups-columns"

export default async function CleanupsPage() {
  const cleanups = await db.cleanup.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      trashcan: true,
      user: true,
    },
  })

  const data: CleanupRow[] = cleanups.map((c) => ({
    id: c.id,
    trashcanId: c.trashcanId,
    trashcanName: c.trashcan.name,
    workerId: c.userId,
    workerName: c.user.name,
    location: c.trashcan.location ?? null,
    description: c.trashcan.description ?? null,
    binType: c.trashcan.binType,
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0">
            Cleanups
          </h3>
          <p className="text-muted-foreground text-md">
            Here&apos;s a list of the cleaning events of a trashcan
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f2f2] border border-[#eeeeee]">
          <span className="text-xl" aria-hidden="true">
            <BrushCleaning />
          </span>
          <span className="sr-only">Cleanups</span>
        </div>
      </div>
      <div className="px-5">
        <CleanupsTable columns={columns} data={data} />
      </div>
    </main>
  )
}

