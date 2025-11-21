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
import { Input } from "~/components/ui/input"
import { showErrorToast, showSuccessToast } from "~/components/app-toast"
import type { StatusRow } from "./statuses-columns"

interface StatusesEditDialogProps {
  status: StatusRow
}

type FormState = {
  trashcanId: string
  capacityPct: string
  useCount: string
}

type TrashcanOption = {
  id: string
  name: string
  location: string | null
}

function createInitialFormState(status: StatusRow): FormState {
  return {
    trashcanId: status.trashcanId,
    capacityPct: String(status.capacityPct),
    useCount: String(status.useCount),
  }
}

export function StatusesEditDialog({ status }: StatusesEditDialogProps) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<FormState>(
    createInitialFormState(status)
  )
  const [trashcans, setTrashcans] = React.useState<TrashcanOption[]>([])

  React.useEffect(() => {
    if (!open) return

    async function loadOptions() {
      try {
        setIsLoadingOptions(true)

        const response = await fetch("/api/trashcans")
        if (!response.ok) {
          throw new Error("Failed to load trashcans")
        }

        type TrashcanApi = {
          id: string
          name: string
          location: string | null
        }

        const trashcansData = (await response.json()) as TrashcanApi[]

        const sortedTrashcans = [...trashcansData].sort((a, b) =>
          a.name.localeCompare(b.name)
        )

        setTrashcans(sortedTrashcans)
      } catch (err) {
        console.error("Error loading trashcans for status edit:", err)
        showErrorToast({
          title: "Load failed",
          description:
            "Could not load trashcans. Please try again.",
        })
      } finally {
        setIsLoadingOptions(false)
      }
    }

    if (!trashcans.length) {
      void loadOptions()
    }
  }, [open, trashcans.length])

  React.useEffect(() => {
    if (open) {
      setFormData(createInitialFormState(status))
      setError(null)
    }
  }, [open, status])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.trashcanId) {
        const message = "Please select a trashcan."
        setError(message)
        showErrorToast({
          title: "Invalid data",
          description: message,
        })
        return
      }

      const capacity = formData.capacityPct ? Number(formData.capacityPct) : NaN
      const useCount = formData.useCount ? Number(formData.useCount) : 0

      if (Number.isNaN(capacity)) {
        const message = "Capacity percent must be a valid number."
        setError(message)
        showErrorToast({
          title: "Invalid data",
          description: message,
        })
        return
      }

      if (capacity < 0 || capacity > 100) {
        const message = "Capacity percent must be between 0 and 100."
        setError(message)
        showErrorToast({
          title: "Invalid data",
          description: message,
        })
        return
      }

      if (Number.isNaN(useCount) || useCount < 0) {
        const message = "Use count must be a non-negative integer."
        setError(message)
        showErrorToast({
          title: "Invalid data",
          description: message,
        })
        return
      }

      const payload = {
        trashcanId: formData.trashcanId,
        capacityPct: capacity,
        useCount,
      }

      const response = await fetch(`/api/statuses/${status.id}`, {
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
        const message = data?.error ?? "Failed to update status."
        setError(message)
        showErrorToast({
          title: "Update failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Status updated",
        description: "Status was updated successfully.",
      })
      setOpen(false)
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error updating status:", err)
      const message = "Unexpected error updating status."
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
          Edit Status
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Status</DialogTitle>
          <DialogDescription>
            Update the trashcan and metrics for this status entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`status-trashcan-${status.id}`}>Trashcan</Label>
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
                id={`status-trashcan-${status.id}`}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`status-capacity-${status.id}`}>
                Capacity (%)</Label>
              <Input
                id={`status-capacity-${status.id}`}
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={formData.capacityPct}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    capacityPct: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`status-usecount-${status.id}`}>
                Use Count</Label>
              <Input
                id={`status-usecount-${status.id}`}
                type="number"
                min={0}
                step={1}
                value={formData.useCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    useCount: e.target.value,
                  }))
                }
              />
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
            <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



