import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"

interface EmployeeAdditionalInfoCardProps {
  email: string | null
  rfidTag: string | null
  active: boolean
}

export function EmployeeAdditionalInfoCard({
  email,
  rfidTag,
  active,
}: EmployeeAdditionalInfoCardProps) {
  const hasActiveRfid = !!rfidTag && active

  return (
    <Card className="mr-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Additional information</CardTitle>
        <CardDescription className="-mt-2.5">
          Static details for this employee.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-sm -mt-5 -mb-1.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">RFID Tag</span>
            <span className="font-medium">{rfidTag ?? "None"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">RFID Tag Active</span>
            <span className="font-medium">
              {hasActiveRfid ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


