"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart"
import type { ChartConfig } from "~/components/ui/chart"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"

export type TrashcanUsagePoint = {
  rawKey?: string
  date: string
  useCount: number
}

interface TrashcanUsageChartProps {
  dailyData: TrashcanUsagePoint[]
  hourlyTodayData: TrashcanUsagePoint[]
}

export function TrashcanUsageChart({
  dailyData,
  hourlyTodayData,
}: TrashcanUsageChartProps) {
  const [range, setRange] = React.useState<"14d" | "7d" | "1d">("14d")

  const title =
    range === "14d"
      ? "Usage in the last 14 days"
      : range === "7d"
        ? "Usage in the last 7 days"
        : "Usage today"

  const chartConfig = React.useMemo(
    () =>
      ({
        useCount: {
          label: "Usage Count",
          color: "#9ca3af", // gray
        },
      }) satisfies ChartConfig,
    []
  )

  const filteredData = React.useMemo(() => {
    if (range === "1d") {
      return hourlyTodayData
    }

    if (!dailyData.length) return []

    if (range === "14d") {
      return dailyData
    }

    if (range === "7d") {
      return dailyData.slice(-7)
    }

    return dailyData
  }, [dailyData, hourlyTodayData, range])

  return (
    <Card className="mt-4 ml-4 -mr-4">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>
            Total number of uses per day for this trashcan.
          </CardDescription>
        </div>
        <div className="flex items-center">
          <ButtonGroup>
            <Button
              size="sm"
              variant={range === "14d" ? "default" : "outline"}
              onClick={() => setRange("14d")}
            >
              Last 14 Days
            </Button>
            <Button
              size="sm"
              variant={range === "7d" ? "default" : "outline"}
              onClick={() => setRange("7d")}
            >
              Last 7 Days
            </Button>
            <Button
              size="sm"
              variant={range === "1d" ? "default" : "outline"}
              onClick={() => setRange("1d")}
            >
              Today
            </Button>
          </ButtonGroup>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig} className="h-40 w-full">
          <BarChart accessibilityLayer data={filteredData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel 
              className="w-36"/>}
            />
            <Bar dataKey="useCount" fill="var(--color-useCount)" radius={6} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}



