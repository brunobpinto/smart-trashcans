import { UserRound, UserRoundCog } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"

export interface TrashcanRecentCleanup {
  id: string
  name: string
  email: string | null
  rfidTag: string | null
  role: string
  createdAt: string
}

interface TrashcanRecentCleanupsCardProps {
  rows: TrashcanRecentCleanup[]
}

export function TrashcanRecentCleanupsCard({
  rows,
}: TrashcanRecentCleanupsCardProps) {
  return (
    <Card className="ml-4 mr-4 w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Cleanups</CardTitle>
        <CardDescription className="-mt-2">
          Last 2 employees who cleaned this trashcan.
        </CardDescription>
      </CardHeader>
        <CardContent className="pt-0 -mt-3">
         {rows.length ? (
           <div className="flex flex-col gap-3">
             {rows.map((row) => {
               const date = new Date(row.createdAt)
               const formattedDate = Number.isNaN(date.getTime())
                 ? row.createdAt
                 : date.toLocaleString()

               const isAdmin = row.role === "ADMIN"
               const badgeClasses = isAdmin
                 ? "bg-pink-50 text-pink-700"
                 : "bg-blue-50 text-blue-700"
               const iconBgClasses = isAdmin
                 ? "bg-pink-50 text-pink-700 border border-pink-200"
                 : "bg-blue-50 text-blue-700 border border-blue-200"

               const email = row.email ?? "No email"
               const rfid = row.rfidTag ?? "None"

               return (
                 <div
                   key={row.id}
                   className="flex items-start gap-3 rounded-md border border-muted bg-muted/40 px-3 py-2.5"
                 >
                   <div
                     className={`flex h-9 w-9 items-center justify-center rounded-md ${iconBgClasses}`}
                   >
                     {isAdmin ? (
                       <UserRoundCog className="h-4 w-4" />
                     ) : (
                       <UserRound className="h-4 w-4" />
                     )}
                   </div>
                   <div className="flex flex-1 flex-col gap-0.5 text-xs">
                     <div className="flex flex-wrap items-center gap-2">
                       <span className="text-sm font-medium text-foreground">
                         {row.name}
                       </span>
                       <span
                         className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClasses}`}
                       >
                         {row.role}
                       </span>
                       <span className="text-[11px] text-muted-foreground ml-1">
                         {email}
                       </span>
                       <span className="text-[11px] text-muted-foreground">
                         •
                       </span>
                       <span className="text-[11px] text-muted-foreground">
                         RFID: {rfid}
                       </span>
                     </div>
                     <div className="text-[11px] text-muted-foreground">
                       Cleanup at {formattedDate}
                     </div>
                   </div>
                 </div>
               )
             })}
           </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No cleanups recorded for this trashcan yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}


