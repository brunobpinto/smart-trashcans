import { Trash2 } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"

export interface EmployeeRecentTrashcan {
  id: string
  trashcanName: string
  location: string | null
  createdAt: string
}

interface EmployeeRecentTrashcansCardProps {
  rows: EmployeeRecentTrashcan[]
}

export function EmployeeRecentTrashcansCard({
  rows,
}: EmployeeRecentTrashcansCardProps) {
  const description =
    rows.length === 0
      ? "This employee has not cleaned any trashcans yet."
      : rows.length === 1
        ? "Last trashcan cleaned by this employee."
        : "Last 2 trashcans cleaned by this employee."

  return (
    <Card className="ml-4 mr-4 w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent trashcans</CardTitle>
        <CardDescription className="-mt-2">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 -mt-3">
        <div className="flex min-h-32 flex-col justify-start">
          {rows.length ? (
            <div className="flex flex-col gap-3">
              {rows.map((row) => {
                const date = new Date(row.createdAt)
                const formattedDate = Number.isNaN(date.getTime())
                  ? row.createdAt
                  : date.toLocaleString()

                const location = row.location ?? "No location"

                return (
                  <div
                    key={row.id}
                    className="flex items-start gap-3 rounded-md border border-muted bg-muted/40 px-3 py-2.5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {row.trashcanName}
                        </span>
                        <span className="text-[11px] text-muted-foreground ml-1">
                          {location}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Cleaned at {formattedDate}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}


