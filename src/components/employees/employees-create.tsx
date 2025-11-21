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
import { showErrorToast, showSuccessToast } from "~/components/app-toast"

type RoleOption = "ADMIN" | "WORKER"

type FormState = {
  name: string
  email: string
  password: string
  rfidTag: string
  role: RoleOption
}

function createInitialFormState(): FormState {
  return {
    name: "",
    email: "",
    password: "",
    rfidTag: "",
    role: "WORKER",
  }
}

export function EmployeesCreateDialog() {
  const router = useRouter()

  const [isOpen, setIsOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<FormState>(
    createInitialFormState()
  )

  const resetForm = () => {
    setFormData(createInitialFormState())
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        name: formData.name.trim(),
        password: formData.password,
        email: formData.email.trim() || undefined,
        rfidTag: formData.rfidTag.trim() || undefined,
        role: formData.role,
      }

      const response = await fetch("/api/users", {
        method: "POST",
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
        const message = data?.error ?? "Failed to create employee."
        setError(message)
        showErrorToast({
          title: "Create Failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Employee Created",
        description: `Employee "${formData.name.trim()}" was created successfully.`,
      })
      setIsOpen(false)
      resetForm()
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error creating employee:", err)
      const message = "Unexpected error creating employee."
      setError(message)
      showErrorToast({
        title: "Create Failed",
        description: message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Create Employee</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Employee</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new employee.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="employee-name">Name</Label>
            <Input
              id="employee-name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employee-email">Email</Label>
            <Input
              id="employee-email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="name@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employee-password">Password</Label>
            <Input
              id="employee-password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employee-rfid">RFID Tag</Label>
            <Input
              id="employee-rfid"
              value={formData.rfidTag}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, rfidTag: e.target.value }))
              }
              placeholder="Optional RFID tag"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employee-role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value: RoleOption) =>
                setFormData((prev) => ({
                  ...prev,
                  role: value,
                }))
              }
            >
              <SelectTrigger id="employee-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORKER">WORKER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


