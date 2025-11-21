import { Users } from "lucide-react"
import { db } from "~/server/db"
import { EmployeesTable } from "~/components/employees/employees-table"
import {
  columns,
  type EmployeeRow,
} from "~/components/employees/employees-columns"

export default async function EmployeesPage() {
  const users = await db.user.findMany({
    orderBy: { name: "asc" },
  })

  const data: EmployeeRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email ?? null,
    rfidTag: u.rfidTag ?? null,
    role: u.role,
    active: u.active,
  }))

  return (
    <main className="flex w-full flex-col gap-6 p-6">
      <div className="flex w-full items-center justify-between px-5 mt-4">
        <div className="flex flex-col gap-1">
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-0">
            Employees
          </h3>
          <p className="text-muted-foreground text-md">
            Here&apos;s a list of the employees registered in the platform.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f2f2f2] border border-[#eeeeee]">
          <span className="text-xl" aria-hidden="true">
            <Users />
          </span>
          <span className="sr-only">Employees</span>
        </div>
      </div>
      <div className="px-5">
        <EmployeesTable columns={columns} data={data} />
      </div>
    </main>
  )
}

