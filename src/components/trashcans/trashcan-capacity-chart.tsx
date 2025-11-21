    "use client"

    import * as React from "react"
    import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts"

    import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    } from "~/components/ui/card"
    import {
    ChartContainer,
    } from "~/components/ui/chart"
    import type { ChartConfig } from "~/components/ui/chart"

    interface TrashcanCapacityChartProps {
    value: number
    }

    export function TrashcanCapacityChart({ value }: TrashcanCapacityChartProps) {
    const clamped = Math.max(0, Math.min(100, value))

    const chartConfig = React.useMemo(
    () => {
      let color = "#22c55e" // green 0–33%
      if (clamped >= 66) {
        color = "#ef4444" // red 66–100%
      } else if (clamped >= 33) {
        color = "#eab308" // yellow 33–66%
      }

      return {
        capacity: {
          label: "Capacity",
          color,
        },
      } satisfies ChartConfig
    },
    [clamped]
    )

    const data = React.useMemo(
        () => [
        {
            name: "Capacity",
            capacity: clamped,
        },
        ],
        [clamped]
    )

    return (
        <Card className="mt-4 w-full max-w-sm">
        <CardHeader>
            <CardTitle className="text-base">Current Fill Level (%)</CardTitle>
            <CardDescription className="-mt-2">
            Last reported capacity for this trashcan.
            </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
            <div className="relative h-52 w-full">
            <ChartContainer config={chartConfig} className="h-60 w-full">
                <RadialBarChart
                data={data}
                innerRadius="70%"
                outerRadius="100%"
                startAngle={180}
                endAngle={0}
                >
                <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    dataKey="capacity"
                    tick={false}
                />
                
                <RadialBar
                    dataKey="capacity"
                    cornerRadius={8}
                    fill="var(--color-capacity)"
                    background
                />
                </RadialBarChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-semibold">
                {clamped.toFixed(0)}%
                </span>
            </div>
            </div>
        </CardContent>
        </Card>
    )
    }



