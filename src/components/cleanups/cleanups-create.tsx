"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Label } from "~/components/ui/label"
import { showErrorToast, showSuccessToast } from "~/components/app-toast"

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

function createInitialFormState(): FormState {
  return {
    trashcanId: "",
    userId: "",
  }
}

export function CleanupsCreateDialog() {
  const router = useRouter()

  const [isOpen, setIsOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<FormState>(
    createInitialFormState()
  )
  const [trashcans, setTrashcans] = React.useState<TrashcanOption[]>([])
  const [users, setUsers] = React.useState<UserOption[]>([])

  const resetForm = () => {
    setFormData(createInitialFormState())
    setError(null)
  }

  React.useEffect(() => {
    if (!isOpen) return

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
        console.error("Error loading options for cleanup create:", err)
        showErrorToast({
          title: "Load failed",
          description:
            "Could not load trashcans and employees. Please try again.",
        })
      } finally {
        setIsLoadingOptions(false)
      }
    }

    if (!trashcans.length || !users.length) {
      void loadOptions()
    }
  }, [isOpen, trashcans.length, users.length])

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

      const response = await fetch("/api/cleanups", {
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
        const message = data?.error ?? "Failed to create cleanup. Please try again."
        setError(message)
        showErrorToast({
          title: "Create failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Cleanup Created",
        description: "Cleanup was created successfully.",
      })
      setIsOpen(false)
      resetForm()
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error creating cleanup:", err)
      const message = "Unexpected error creating cleanup."
      setError(message)
      showErrorToast({
        title: "Create failed",
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
        <Button size="sm">Create Cleanup</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Cleanup</DialogTitle>
          <DialogDescription>
            Select a trashcan and worker to register a new cleanup event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="cleanup-trashcan">Trashcan</Label>
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
              <SelectTrigger id="cleanup-trashcan" className="w-full">
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
            <Label htmlFor="cleanup-worker">Worker</Label>
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
              <SelectTrigger id="cleanup-worker" className="w-full">
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
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



