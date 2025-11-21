import { Trash2 } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"

export interface DashboardFullTrashcan {
  id: string
  name: string
  location: string | null
  capacityPct: number
}

interface DashboardMostFullTrashcansCardProps {
  rows: DashboardFullTrashcan[]
}

export function DashboardMostFullTrashcansCard({
  rows,
}: DashboardMostFullTrashcansCardProps) {
  return (
    <Card className="ml-4 mr-4 w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Fullest Trashcans</CardTitle>
        <CardDescription className="-mt-2">
          Trashcans with the highest current fill level (%).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 -mt-3">
        <div className="flex min-h-32 flex-col justify-start">
          {rows.length ? (
            <div className="flex flex-col gap-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-start gap-3 rounded-md border border-muted bg-muted/40 px-3 py-2.5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {row.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {row.location ?? "No location"}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {row.capacityPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No capacity data available yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


