import { Trash2 } from "lucide-react"
import { db } from "~/server/db"
import { TrashcansTable } from "~/components/trashcans/trashcans-table"
import { columns, type TrashcanRow } from "~/components/trashcans/trashcans-columns"

export default async function TrashcansPage() {
  const trashcans = await db.trashcan.findMany({
    orderBy: { name: "asc" },
  })

  const data: TrashcanRow[] = trashcans.map((t) => ({
    id: t.id,
    name: t.name,
    location: t.location ?? null,
    description: t.description ?? null,
    latitude: t.latitude ?? null,
    longitude: t.longitude ?? null,
    height: t.height,
    binType: t.binType,
  }))

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0">
            Trashcans
          </h3>
          <p className="text-muted-foreground text-md">
            Here&apos;s a list of the smart trashcans located in the campus.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f2f2] border border-[#eeeeee]">
          <span className="text-xl" aria-hidden="true">
            <Trash2 />
          </span>
          <span className="sr-only">Trashcans</span>
        </div>
      </div>
      <div className="px-5">
        <TrashcansTable columns={columns} data={data} />
      </div>
    </main>
  )
}
