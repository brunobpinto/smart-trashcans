import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"

interface EmployeeMonthlyCleanupsCardProps {
  value: number
}

export function EmployeeMonthlyCleanupsCard({
  value,
}: EmployeeMonthlyCleanupsCardProps) {
  return (
    <Card className="mt-4 w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-base">Monthly cleanups</CardTitle>
        <CardDescription className="-mt-2">
          Total cleanups performed by this employee this month.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex h-53 w-full flex-col items-center justify-center gap-2 text-center">
          <span className="text-7xl font-semibold leading-tight">{value}</span>
          <span className="text-xs text-muted-foreground max-w-80">
            Across all trashcans for the current month.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}


