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
import { Input } from "~/components/ui/input"
import { showErrorToast, showSuccessToast } from "~/components/app-toast"

type FormState = {
  trashcanId: string
  capacityPct: string
  useCount: string
  hour: string
}

type TrashcanOption = {
  id: string
  name: string
  location: string | null
}

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function createInitialFormState(): FormState {
  const now = new Date()
  return {
    trashcanId: "",
    capacityPct: "",
    useCount: "",
    hour: formatDateTimeLocal(now),
  }
}

export function StatusesCreateDialog() {
  const router = useRouter()

  const [isOpen, setIsOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<FormState>(
    createInitialFormState()
  )
  const [trashcans, setTrashcans] = React.useState<TrashcanOption[]>([])

  const resetForm = () => {
    setFormData(createInitialFormState())
    setError(null)
  }

  React.useEffect(() => {
    if (!isOpen) return

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
        console.error("Error loading trashcans for status create:", err)
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
  }, [isOpen, trashcans.length])

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

      const hourDate = new Date(formData.hour)
      if (Number.isNaN(hourDate.getTime())) {
        const message = "Hour must be a valid date and time."
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
        hour: hourDate.toISOString(),
      }

      const response = await fetch("/api/statuses", {
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
        const message =
          data?.error ?? "Failed to create status. Please try again."
        setError(message)
        showErrorToast({
          title: "Create failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Status Created",
        description: "Status was created successfully.",
      })
      setIsOpen(false)
      resetForm()
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error creating status:", err)
      const message = "Unexpected error creating status."
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
        <Button size="sm">Create Status</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Status</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new status entry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="status-trashcan">Trashcan</Label>
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
              <SelectTrigger id="status-trashcan" className="w-full">
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
              <Label htmlFor="status-capacity">Capacity (%)</Label>
              <Input
                id="status-capacity"
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
                placeholder="e.g. 45.5"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-usecount">Use Count</Label>
              <Input
                id="status-usecount"
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
                placeholder="e.g. 10"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status-hour">Hour</Label>
            <Input
              id="status-hour"
              type="datetime-local"
              value={formData.hour}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  hour: e.target.value,
                }))
              }
            />
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



