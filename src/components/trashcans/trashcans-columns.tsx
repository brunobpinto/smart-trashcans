"use client"

import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Badge } from "~/components/ui/badge"
import { Check, Recycle, Trash2 } from "lucide-react"

export type TrashcanRow = {
  id: string
  name: string
  location: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  height: number
  binType: string
  actions?: string
}

export const columns: ColumnDef<TrashcanRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <button
        type="button"
        onClick={() => {
          const allSelected = table.getIsAllRowsSelected()
          table.toggleAllRowsSelected(!allSelected)
        }}
        aria-label="Select all"
        className="flex h-4 w-4 items-center justify-center rounded border border-input text-foreground"
      >
        {(() => {
          const allSelected = table.getIsAllRowsSelected()
          const someSelected = table.getIsSomeRowsSelected()

          if (allSelected) {
            return (
              <span className="flex h-full w-full items-center justify-center rounded bg-foreground text-background">
                <Check className="h-3 w-3" />
              </span>
            )
          }

          if (someSelected) {
            return (
              <span className="flex h-full w-full items-center justify-center rounded bg-background text-foreground">
                <Check className="h-3 w-3" />
              </span>
            )
          }

          return null
        })()}
      </button>
    ),
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => row.toggleSelected(!row.getIsSelected())}
        aria-label="Select row"
        className="flex h-4 w-4 items-center justify-center rounded border border-input text-foreground"
      >
        {row.getIsSelected() && (
          <span className="flex h-full w-full items-center justify-center rounded bg-foreground text-background">
            <Check className="h-3 w-3" />
          </span>
        )}
      </button>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/trashcans/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const value = row.original.description
      if (!value) return "—"

      const maxLength = 60
      const display =
        value.length > maxLength ? `${value.slice(0, maxLength-3)}...` : value

      return display
    },
  },
  {
    accessorKey: "latitude",
    header: "Latitude",
    cell: ({ row }) => {
      const value = row.original.latitude
      return value == null ? "—" : value.toFixed(6)
    },
  },
  {
    accessorKey: "longitude",
    header: "Longitude",
    cell: ({ row }) => {
      const value = row.original.longitude
      return value == null ? "—" : value.toFixed(6)
    },
  },
  {
    accessorKey: "height",
    header: "Height (cm)",
  },
  {
    accessorKey: "binType",
    header: "Bin Type",
    cell: ({ row }) => {
      const value = row.original.binType
      const isRecycle = value === "RECYCLE"

      return (
        <Badge
          variant="outline"
          className={
            isRecycle
              ? "border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 px-2 py-0.5"
              : "border-gray-200 bg-gray-100 text-gray-700 flex items-center gap-1 px-2 py-0.5"
          }
        >
          {isRecycle ? (
            <Recycle className="h-3.5 w-3.5" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span className="text-[11px] font-medium tracking-wide">
            {value}
          </span>
        </Badge>
      )
    },
  },
  {
    id: "actions",
    header: "",
    enableHiding: false,
  },
]
