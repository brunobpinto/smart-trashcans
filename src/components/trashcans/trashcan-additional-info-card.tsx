import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"

interface TrashcanAdditionalInfoCardProps {
  location: string | null
  latitude: number | null
  longitude: number | null
  height: number
}

export function TrashcanAdditionalInfoCard({
  location,
  latitude,
  longitude,
  height,
}: TrashcanAdditionalInfoCardProps) {
  return (
    <Card className="mr-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Additional Information</CardTitle>
        <CardDescription className="-mt-2.5">
          Static details for this trashcan.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-sm -mt-5 -mb-1.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium">{location ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Latitude</span>
            <span className="font-medium">
              {latitude != null ? latitude.toFixed(6) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Longitude</span>
            <span className="font-medium">
              {longitude != null ? longitude.toFixed(6) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Height</span>
            <span className="font-medium">{height} cm</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


