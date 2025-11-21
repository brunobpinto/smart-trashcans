import { MapPin } from "lucide-react"

export default async function LocationsPage() {
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
        {/* TODO: Add locations map / list here */}
      </div>
    </main>
  )
}

