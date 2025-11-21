"use client"

import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Badge } from "~/components/ui/badge"
import {
  ArrowUpDown,
  Check,
  UserRound,
  UserRoundCog,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react"
import { Button } from "~/components/ui/button"

export type EmployeeRow = {
  id: string
  name: string
  email: string | null
  rfidTag: string | null
  role: string
  active: boolean
}

export const columns: ColumnDef<EmployeeRow>[] = [
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
    enableSorting: true,
    cell: ({ row }) => (
      <Link
        href={`/employees/${row.original.id}`}
        className="text-sm font-medium text-primary hover:underline"
      >
        {row.original.name}
      </Link>
    ),
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="flex items-center gap-1 px-0 -ml-3"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        <span>Name</span>
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email ?? "—",
  },
  {
    accessorKey: "rfidTag",
    header: "RFID Tag",
    cell: ({ row }) => row.original.rfidTag ?? "—",
  },
  {
    accessorKey: "role",
    enableSorting: true,
    cell: ({ row }) => {
      const value = row.original.role ?? ""
      const isAdmin = value === "ADMIN"

      return (
        <Badge
          variant="outline"
          className={
            isAdmin
              ? "border-pink-200 bg-pink-50 text-pink-700 px-2 py-0.5 text-[11px] font-medium tracking-wide"
              : "border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium tracking-wide"
          }
        >
          {isAdmin ? (
            <UserRoundCog className="mr-1 h-3.5 w-3.5" />
          ) : (
            <UserRound className="mr-1 h-3.5 w-3.5" />
          )}
          {value}
        </Badge>
      )
    },
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="flex items-center gap-1 px-0 -ml-3"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        <span>Role</span>
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "active",
    enableSorting: true,
    cell: ({ row }) => {
      const isActive = row.original.active

      return (
        <Badge
          variant="outline"
          className={
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-medium tracking-wide"
              : "border-gray-200 bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-medium tracking-wide"
          }
        >
          {isActive ? (
            <UserRoundCheck className="mr-1 h-3.5 w-3.5" />
          ) : (
            <UserRoundX className="mr-1 h-3.5 w-3.5" />
          )}
          {isActive ? "ACTIVE" : "INACTIVE"}
        </Badge>
      )
    },
    header: ({ column }) => (
      <Button
        type="button"
        variant="ghost"
        className="flex items-center gap-1 px-0 -ml-3"
        onClick={() =>
          column.toggleSorting(column.getIsSorted() === "asc")
        }
      >
        <span>Active</span>
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    ),
  },
  {
    id: "actions",
    header: "",
    enableHiding: false,
  },
]


