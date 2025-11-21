"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { DropdownMenuItem } from "~/components/ui/dropdown-menu"
import { showErrorToast, showSuccessToast } from "~/components/app-toast"
import type { EmployeeRow } from "./employees-columns"

type RoleOption = "ADMIN" | "WORKER"

interface EmployeesEditDialogProps {
  employee: EmployeeRow
}

type FormState = {
  name: string
  email: string
  password: string
  rfidTag: string
  role: RoleOption
  active: boolean
}

function createInitialFormState(employee: EmployeeRow): FormState {
  return {
    name: employee.name,
    email: employee.email ?? "",
    password: "",
    rfidTag: employee.rfidTag ?? "",
    role: (employee.role as RoleOption) ?? "WORKER",
    active: employee.active,
  }
}

export function EmployeesEditDialog({ employee }: EmployeesEditDialogProps) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<FormState>(
    createInitialFormState(employee)
  )

  React.useEffect(() => {
    if (open) {
      setFormData(createInitialFormState(employee))
      setError(null)
    }
  }, [open, employee])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const trimmedName = formData.name.trim()
      const trimmedEmail = formData.email.trim()
      const trimmedPassword = formData.password.trim()
      const trimmedRfid = formData.rfidTag.trim()

      const payload: Record<string, unknown> = {
        name: trimmedName,
        email: trimmedEmail || undefined,
        rfidTag: trimmedRfid || undefined,
        role: formData.role,
        active: formData.active,
      }

      if (trimmedPassword) {
        payload.password = trimmedPassword
      }

      const response = await fetch(`/api/users/${employee.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        type ErrorResponse = { error?: string }
        let data: ErrorResponse | null = null
        try {
          data = (await response.json()) as ErrorResponse
        } catch {
          data = null
        }
        const message = data?.error ?? "Failed to update employee."
        setError(message)
        showErrorToast({
          title: "Update Failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Employee Updated",
        description: `Employee "${trimmedName}" was updated successfully.`,
      })
      setOpen(false)
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error updating employee:", err)
      const message = "Unexpected error updating employee."
      setError(message)
      showErrorToast({
        title: "Update Failed",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => event.preventDefault()}
        >
          Edit Employee
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update the details of this employee.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`employee-name-${employee.id}`}>Name</Label>
            <Input
              id={`employee-name-${employee.id}`}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`employee-email-${employee.id}`}>Email</Label>
            <Input
              id={`employee-email-${employee.id}`}
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="name@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`employee-password-${employee.id}`}>
              Password (leave blank to keep current)
            </Label>
            <Input
              id={`employee-password-${employee.id}`}
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`employee-rfid-${employee.id}`}>RFID Tag</Label>
            <Input
              id={`employee-rfid-${employee.id}`}
              value={formData.rfidTag}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  rfidTag: e.target.value,
                }))
              }
              placeholder="Optional RFID tag"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`employee-role-${employee.id}`}>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: RoleOption) =>
                  setFormData((prev) => ({
                    ...prev,
                    role: value,
                  }))
                }
              >
                <SelectTrigger
                  id={`employee-role-${employee.id}`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WORKER">WORKER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`employee-active-${employee.id}`}>Active</Label>
              <Select
                value={formData.active ? "true" : "false"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    active: value === "true",
                  }))
                }
              >
                <SelectTrigger
                  id={`employee-active-${employee.id}`}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">ACTIVE</SelectItem>
                  <SelectItem value="false">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


