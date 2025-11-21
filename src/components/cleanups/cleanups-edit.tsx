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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Label } from "~/components/ui/label"
import { showErrorToast, showSuccessToast } from "~/components/app-toast"
import type { CleanupRow } from "./cleanups-columns"

interface CleanupsEditDialogProps {
  cleanup: CleanupRow
}

type FormState = {
  trashcanId: string
  userId: string
}

type TrashcanOption = {
  id: string
  name: string
  location: string | null
}

type UserOption = {
  id: string
  name: string
}

export function CleanupsEditDialog({ cleanup }: CleanupsEditDialogProps) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<FormState>({
    trashcanId: cleanup.trashcanId,
    userId: cleanup.workerId,
  })
  const [trashcans, setTrashcans] = React.useState<TrashcanOption[]>([])
  const [users, setUsers] = React.useState<UserOption[]>([])

  React.useEffect(() => {
    if (!open) return

    async function loadOptions() {
      try {
        setIsLoadingOptions(true)

        const [trashcansRes, usersRes] = await Promise.all([
          fetch("/api/trashcans"),
          fetch("/api/users"),
        ])

        if (!trashcansRes.ok || !usersRes.ok) {
          throw new Error("Failed to load options")
        }

        type TrashcanApi = {
          id: string
          name: string
          location: string | null
        }

        type UserApi = {
          id: string
          name: string
        }

        const trashcansData = (await trashcansRes.json()) as TrashcanApi[]
        const usersData = (await usersRes.json()) as UserApi[]

        const sortedTrashcans = [...trashcansData].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
        const sortedUsers = [...usersData].sort((a, b) =>
          a.name.localeCompare(b.name)
        )

        setTrashcans(sortedTrashcans)
        setUsers(sortedUsers)
      } catch (err) {
        console.error("Error loading options for cleanup edit:", err)
        showErrorToast({
          title: "Load failed",
          description:
            "Could not load trashcans and employees. Please try again.",
        })
      } finally {
        setIsLoadingOptions(false)
      }
    }

    // Load options only once per mount
    if (!trashcans.length || !users.length) {
      void loadOptions()
    }
  }, [open, trashcans.length, users.length])

  React.useEffect(() => {
    if (open) {
      setFormData({
        trashcanId: cleanup.trashcanId,
        userId: cleanup.workerId,
      })
      setError(null)
    }
  }, [open, cleanup.trashcanId, cleanup.workerId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.trashcanId || !formData.userId) {
        const message = "Please select both a trashcan and a worker."
        setError(message)
        showErrorToast({
          title: "Invalid data",
          description: message,
        })
        return
      }

      const payload = {
        trashcanId: formData.trashcanId,
        userId: formData.userId,
      }

      const response = await fetch(`/api/cleanups/${cleanup.id}`, {
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
        const message = data?.error ?? "Failed to update cleanup."
        setError(message)
        showErrorToast({
          title: "Update failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Cleanup updated",
        description: "Cleanup was updated successfully.",
      })
      setOpen(false)
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error updating cleanup:", err)
      const message = "Unexpected error updating cleanup."
      setError(message)
      showErrorToast({
        title: "Update failed",
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
          Edit Cleanup
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cleanup</DialogTitle>
          <DialogDescription>
            Update the trashcan and worker assigned to this cleanup.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`cleanup-trashcan-${cleanup.id}`}>Trashcan</Label>
            <Select
              value={formData.trashcanId}
              onValueChange={(value: string) =>
                setFormData((prev) => ({
                  ...prev,
                  trashcanId: value,
                }))
              }
              disabled={isLoadingOptions || isSubmitting}
            >
              <SelectTrigger
                id={`cleanup-trashcan-${cleanup.id}`}
                className="w-full"
              >
                <SelectValue placeholder="Select a trashcan" />
              </SelectTrigger>
              <SelectContent>
                {trashcans.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.location ? ` — ${t.location}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`cleanup-worker-${cleanup.id}`}>Worker</Label>
            <Select
              value={formData.userId}
              onValueChange={(value: string) =>
                setFormData((prev) => ({
                  ...prev,
                  userId: value,
                }))
              }
              disabled={isLoadingOptions || isSubmitting}
            >
              <SelectTrigger
                id={`cleanup-worker-${cleanup.id}`}
                className="w-full"
              >
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



