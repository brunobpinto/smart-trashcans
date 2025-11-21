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
import { DropdownMenuItem } from "~/components/ui/dropdown-menu"
import { showErrorToast, showSuccessToast } from "~/components/app-toast"

interface EmployeesDeleteDialogProps {
  id: string
  name?: string | null
}

export function EmployeesDeleteDialog({
  id,
  name,
}: EmployeesDeleteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        type ErrorResponse = { error?: string }
        let data: ErrorResponse | null = null
        try {
          data = (await response.json()) as ErrorResponse
        } catch {
          data = null
        }
        const message = data?.error ?? "Failed to delete employee."
        setError(message)
        showErrorToast({
          title: "Delete Failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Employee Deleted",
        description: name
          ? `Employee "${name}" was deleted successfully.`
          : "Employee was deleted successfully.",
      })
      setOpen(false)
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error deleting employee:", err)
      const message = "Unexpected error deleting employee."
      setError(message)
      showErrorToast({
        title: "Delete Failed",
        description: message,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => event.preventDefault()}
        >
          Delete
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete employee</DialogTitle>
          <DialogDescription>
            {name
              ? `Are you sure you want to delete the employee "${name}"? This action cannot be undone.`
              : "Are you sure you want to delete this employee? This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


