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
import {
  DropdownMenuItem,
} from "~/components/ui/dropdown-menu"
import { showErrorToast, showSuccessToast } from "~/components/app-toast"

interface CleanupsDeleteDialogProps {
  id: string
  trashcanName?: string | null
  workerName?: string | null
}

export function CleanupsDeleteDialog({
  id,
  trashcanName,
  workerName,
}: CleanupsDeleteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/cleanups/${id}`, {
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
        const message = data?.error ?? "Failed to delete cleanup."
        setError(message)
        showErrorToast({
          title: "Delete failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Cleanup Deleted",
        description: "Cleanup was deleted successfully.",
      })
      setOpen(false)
      // Delay refresh slightly so the toast can render before React revalidates the page
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error deleting cleanup:", err)
      const message = "Unexpected error deleting cleanup."
      setError(message)
      showErrorToast({
        title: "Delete failed",
        description: message,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const descriptionText = (() => {
    if (trashcanName && workerName) {
      return `Are you sure you want to delete this cleanup for trashcan "${trashcanName}" assigned to "${workerName}"? This action cannot be undone.`
    }

    if (trashcanName) {
      return `Are you sure you want to delete this cleanup for trashcan "${trashcanName}"? This action cannot be undone.`
    }

    if (workerName) {
      return `Are you sure you want to delete this cleanup for "${workerName}"? This action cannot be undone.`
    }

    return "Are you sure you want to delete this cleanup? This action cannot be undone."
  })()

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
          <DialogTitle>Delete cleanup</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
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



