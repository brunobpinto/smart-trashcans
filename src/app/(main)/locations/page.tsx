import { MapPin } from "lucide-react"
import { db } from "~/server/db"
import { LocationsMap, type TrashcanLocation } from "~/components/locations/locations-map"

export default async function LocationsPage() {
  const trashcans = await db.trashcan.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { name: "asc" },
    include: {
      statuses: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  const trashcanLocations: TrashcanLocation[] = trashcans
    .filter((t) => t.latitude != null && t.longitude != null)
    .map((t) => ({
      id: t.id,
      name: t.name,
      location: t.location ?? null,
      description: t.description ?? null,
      latitude: t.latitude!,
      longitude: t.longitude!,
      binType: t.binType,
      capacityPct: t.statuses[0]?.capacityPct ?? null,
    }))

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0">
            Locations
          </h3>
          <p className="text-muted-foreground text-md">
            Here&apos;s a view of where your smart trashcans are located on campus.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f2f2] border border-[#eeeeee]">
          <span className="text-xl" aria-hidden="true">
            <MapPin />
          </span>
          <span className="sr-only">Locations</span>
        </div>
      </div>
      <div className="px-5">
        <LocationsMap trashcans={trashcanLocations} />
      </div>
    </main>
  )
}

