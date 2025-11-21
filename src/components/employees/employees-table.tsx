"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useRouter } from "next/navigation"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Badge } from "~/components/ui/badge"
import {
  MoreHorizontal,
  Settings2,
  Check,
  Filter as Funnel,
  X,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react"
import type { EmployeeRow } from "./employees-columns"
import { EmployeesCreateDialog } from "./employees-create"
import { EmployeesEditDialog } from "./employees-edit"
import { EmployeesDeleteDialog } from "./employees-delete"
import { showErrorToast, showInfoToast } from "~/components/app-toast"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

type RoleFilterState = "BOTH" | "ADMIN" | "WORKER" | "NONE"
const ROLE_FILTER_OPTIONS: Array<Exclude<RoleFilterState, "BOTH" | "NONE">> = [
  "ADMIN",
  "WORKER",
]

type StatusFilterState = "BOTH" | "ACTIVE" | "INACTIVE" | "NONE"
const STATUS_FILTER_OPTIONS: Array<
  Exclude<StatusFilterState, "BOTH" | "NONE">
> = ["ACTIVE", "INACTIVE"]

export function EmployeesTable({
  columns,
  data,
}: DataTableProps<EmployeeRow, unknown>) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [roleState, setRoleState] = React.useState<RoleFilterState>("BOTH")
  const [statusState, setStatusState] =
    React.useState<StatusFilterState>("BOTH")

  const filteredData = React.useMemo(() => {
    if (roleState === "NONE" || statusState === "NONE") return []

    let result = data

    if (roleState !== "BOTH") {
      result = result.filter((row) => {
        const typedRow = row as unknown as { role?: string }
        return typedRow.role === roleState
      })
    }

    if (statusState !== "BOTH") {
      result = result.filter((row) => {
        const typedRow = row as unknown as { active?: boolean }
        const isActive = !!typedRow.active
        return statusState === "ACTIVE" ? isActive : !isActive
      })
    }

    return result
  }, [data, roleState, statusState])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      columnFilters,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    enableRowSelection: true,
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const nameColumn = table.getColumn("name")

  const hasNameFilter = !!nameColumn?.getFilterValue()
  const hasRoleFilter = roleState !== "BOTH"
  const hasStatusFilter = statusState !== "BOTH"
  const hasColumnVisibilityChanges = table
    .getAllLeafColumns()
    .some((column) => column.getCanHide() && !column.getIsVisible())
  const hasSortingChanges = sorting.length > 0

  const hasChanges =
    hasNameFilter ||
    hasRoleFilter ||
    hasStatusFilter ||
    hasColumnVisibilityChanges ||
    hasSortingChanges

  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const totalCount = table.getFilteredRowModel().rows.length

  return (
    <div className="mt-4 flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={(nameColumn?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            const value = event.target.value || undefined
            nameColumn?.setFilterValue(value)
          }}
          className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Funnel className="h-4 w-4 mr-1" />
                <span className="mr-1">Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="text-sm tracking-wide">
                Filter Role
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ROLE_FILTER_OPTIONS.map((value) => {
                const isSelected =
                  roleState === "BOTH" || roleState === value
                const isAdmin = value === "ADMIN"

                return (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => {
                      // Toggle multi-select behaviour
                      let next: RoleFilterState

                      if (roleState === "BOTH") {
                        next = value === "ADMIN" ? "WORKER" : "ADMIN"
                      } else if (roleState === value) {
                        next = "NONE"
                      } else if (roleState === "NONE") {
                        next = value
                      } else {
                        next = "BOTH"
                      }

                      setRoleState(next)
                    }}
                  >
                    {isSelected && (
                      <Check className="mr-1 h-4 w-4 text-primary" />
                    )}
                    {!isSelected && <span className="mr-6" />}
                    <Badge
                      variant="outline"
                      className={
                        isAdmin
                          ? "border-pink-200 bg-pink-50 text-pink-700 px-2 py-0.5 text-[11px] font-medium tracking-wide"
                          : "border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium tracking-wide"
                      }
                    >
                      {value}
                    </Badge>
                  </DropdownMenuItem>
                )
              })}

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-sm tracking-wide">
                Filter Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_FILTER_OPTIONS.map((value) => {
                const isSelected =
                  statusState === "BOTH" || statusState === value
                const isActive = value === "ACTIVE"

                return (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => {
                      // Toggle multi-select behaviour
                      let next: StatusFilterState

                      if (statusState === "BOTH") {
                        next = value === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                      } else if (statusState === value) {
                        next = "NONE"
                      } else if (statusState === "NONE") {
                        next = value
                      } else {
                        next = "BOTH"
                      }

                      setStatusState(next)
                    }}
                  >
                    {isSelected && (
                      <Check className="mr-1 h-4 w-4 text-primary" />
                    )}
                    {!isSelected && <span className="mr-6" />}
                    <Badge
                      variant="outline"
                      className={
                        isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-medium tracking-wide"
                          : "border-gray-200 bg-gray-100 text-gray-600 px-2 py-0.5 text-[11px] font-medium tracking-wide"
                      }
                    >
                      {value}
                    </Badge>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasChanges && (
            <Button
              size="sm"
              variant="ghost"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                // Reset search
                setColumnFilters([])
                // Reset role filter
                setRoleState("BOTH")
                // Reset status filter
                setStatusState("BOTH")
                // Reset sorting
                setSorting([])
                // Reset column visibility
                table
                  .getAllLeafColumns()
                  .filter((column) => column.getCanHide())
                  .forEach((column) => column.toggleVisibility(true))
              }}
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Column visibility dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" />
                <span className="mr-1">View</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-sm tracking-wide">
                Toggle columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const visible = column.getIsVisible()
                  const header = column.columnDef.header
                  const headerLabel =
                    typeof header === "string"
                      ? header
                      : column.id.charAt(0).toUpperCase() + column.id.slice(1)
                  return (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={() => column.toggleVisibility(!visible)}
                    >
                      {visible && (
                        <Check className="mr-1 h-4 w-4 text-primary" />
                      )}
                      {!visible && <span className="mr-6" />}
                      <span className="text-sm mr-8">
                        {headerLabel}
                      </span>
                    </DropdownMenuItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Employee button */}
          <EmployeesCreateDialog />
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-md border">
        <Table className="w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {cell.column.id === "actions" ? (
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-8 hover:bg-muted"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">
                                  Open row actions
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel className="text-sm tracking-wide">
                                Actions
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      row.original.id
                                    )
                                    showInfoToast({
                                      title: "ID Copied",
                                      description:
                                        "Employee ID was copied to the clipboard.",
                                    })
                                  } catch (error) {
                                    console.error("Error copying ID:", error)
                                    showErrorToast({
                                      title: "Copy Failed",
                                      description:
                                        "Could not copy the employee ID to the clipboard.",
                                    })
                                  }
                                }}
                              >
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  const rfid = row.original.rfidTag
                                  if (!rfid) {
                                    showErrorToast({
                                      title: "Copy Failed",
                                      description:
                                        "This employee does not have an RFID tag.",
                                    })
                                    return
                                  }
                                  try {
                                    await navigator.clipboard.writeText(rfid)
                                    showInfoToast({
                                      title: "RFID Copied",
                                      description:
                                        "Employee RFID tag was copied to the clipboard.",
                                    })
                                  } catch (error) {
                                    console.error("Error copying RFID:", error)
                                    showErrorToast({
                                      title: "Copy Failed",
                                      description:
                                        "Could not copy the employee RFID tag to the clipboard.",
                                    })
                                  }
                                }}
                              >
                                Copy RFID
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/employees/${row.original.id}`)
                                }
                              >
                                View Employee
                              </DropdownMenuItem>
                              <EmployeesEditDialog employee={row.original} />
                              <DropdownMenuSeparator />
                              <EmployeesDeleteDialog
                                id={row.original.id}
                                name={row.original.name}
                              />
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ) : (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-1 -mb-1 flex items-center justify-between text-sm text-muted-foreground">
        <div className="ml-1">
          {selectedCount} of {totalCount} row(s) selected
        </div>
        <div className="flex items-center gap-3">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


