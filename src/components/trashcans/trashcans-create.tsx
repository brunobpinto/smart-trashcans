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
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { showSuccessToast } from "~/components/app-toast"

type BinTypeOption = "COMMON" | "RECYCLE"

type FormState = {
  name: string
  description: string
  location: string
  latitude: string
  longitude: string
  height: string
  binType: BinTypeOption
}

function createInitialFormState(): FormState {
  return {
    name: "",
    description: "",
    location: "",
    latitude: "",
    longitude: "",
    height: "100",
    binType: "COMMON",
  }
}

export function TrashcansCreateDialog() {
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
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        height: formData.height ? Number(formData.height) : 100,
        binType: formData.binType,
      }

      const response = await fetch("/api/trashcans", {
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
        const message = data?.error
        setError(message ?? "Failed to create trashcan. Please try again.")
        return
      }

      showSuccessToast({
        title: "Trashcan Created",
        description: `Trashcan was created successfully.`,
      })
      setIsOpen(false)
      resetForm()
      // Delay refresh slightly so the toast can render before React revalidates the page
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error creating trashcan:", err)
      setError("Unexpected error creating trashcan.")
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
        <Button size="sm">Create Trashcan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Trashcan</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new trashcan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="trashcan-name">Name</Label>
            <Input
              id="trashcan-name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trashcan-location">Location</Label>
            <Input
              id="trashcan-location"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              placeholder="e.g. Prédio Leme, Anfiteatro, Edifício Kennedy ..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="trashcan-description">Description</Label>
            <Input
              id="trashcan-description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Observations about this trashcan"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="trashcan-latitude">Latitude</Label>
              <Input
                id="trashcan-latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    latitude: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trashcan-longitude">Longitude</Label>
              <Input
                id="trashcan-longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    longitude: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="trashcan-height">Height (cm)</Label>
              <Input
                id="trashcan-height"
                type="number"
                min={1}
                step={1}
                value={formData.height}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    height: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trashcan-bintype">Bin type</Label>
              <Select
                value={formData.binType}
                onValueChange={(value: BinTypeOption) =>
                  setFormData((prev) => ({
                    ...prev,
                    binType: value,
                  }))
                }
              >
                <SelectTrigger
                  id="trashcan-bintype"
                  size="default"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMON">COMMON</SelectItem>
                  <SelectItem value="RECYCLE">RECYCLE</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


