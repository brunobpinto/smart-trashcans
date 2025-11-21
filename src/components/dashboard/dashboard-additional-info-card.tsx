import { Trash2 } from "lucide-react"

import { Card, CardContent } from "~/components/ui/card"

interface DashboardAdditionalInfoCardProps {
  below33: number
  between33And66: number
  above66: number
}

export function DashboardAdditionalInfoCard({
  below33,
  between33And66,
  above66,
}: DashboardAdditionalInfoCardProps) {
  return (
    <>
      <h3 className="px-1 text-md font-semibold tracking-tight">
        Trashcan Fill Summary
      </h3>
      <p className="mb-1 px-1 text-muted-foreground text-sm -mt-4">Summary of fill levels across all trashcans</p>
      <Card className="mr-4 -mt-1">
        <CardContent>
          <div className="flex h-8 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Low Fill Level (&lt; 33%)</span>
                <span className="text-xs text-muted-foreground">
                  Trashcans under 33% capacity.
                </span>
              </div>
            </div>
            <span className="text-3xl font-semibold pr-1">{below33}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mr-4">
        <CardContent>
          <div className="flex h-8 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Moderate Fill Level (33–66%)</span>
                <span className="text-xs text-muted-foreground">
                  Trashcans between 33% and 66% capacity.
                </span>
              </div>
            </div>
            <span className="text-3xl font-semibold pr-1">
              {between33And66}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mr-4">
        <CardContent>
          <div className="flex h-8 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-700 border border-red-200">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">High Fill Level (&gt; 66%)</span>
                <span className="text-xs text-muted-foreground">
                  Trashcans over 66% capacity.
                </span>
              </div>
            </div>
            <span className="text-3xl font-semibold pr-1">{above66}</span>
          </div>
        </CardContent>
      </Card>
    </>
  )
}


