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
import type { TrashcanRow } from "./trashcans-columns"
import { DropdownMenuItem } from "~/components/ui/dropdown-menu"

type BinTypeOption = "COMMON" | "RECYCLE"

interface TrashcansEditDialogProps {
  trashcan: TrashcanRow
}

type FormState = {
  name: string
  description: string
  location: string
  latitude: string
  longitude: string
  height: string
  binType: BinTypeOption
}

function createInitialFormState(trashcan: TrashcanRow): FormState {
  return {
    name: trashcan.name,
    description: trashcan.description ?? "",
    location: trashcan.location ?? "",
    latitude: trashcan.latitude != null ? String(trashcan.latitude) : "",
    longitude: trashcan.longitude != null ? String(trashcan.longitude) : "",
    height: String(trashcan.height),
    binType: (trashcan.binType as BinTypeOption) ?? "COMMON",
  }
}

export function TrashcansEditDialog({ trashcan }: TrashcansEditDialogProps) {
  const router = useRouter()

  const [open, setOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<FormState>(
    createInitialFormState(trashcan)
  )

  React.useEffect(() => {
    if (open) {
      setFormData(createInitialFormState(trashcan))
      setError(null)
    }
  }, [open, trashcan])

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
        height: formData.height ? Number(formData.height) : undefined,
        binType: formData.binType,
      }

      const response = await fetch(`/api/trashcans/${trashcan.id}`, {
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
        const message = data?.error ?? "Failed to update trashcan."
        setError(message)
        showErrorToast({
          title: "Update failed",
          description: message,
        })
        return
      }

      showSuccessToast({
        title: "Trashcan updated",
        description: `Trashcan "${formData.name.trim()}" was updated successfully.`,
      })
      setOpen(false)
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (err) {
      console.error("Error updating trashcan:", err)
      const message = "Unexpected error updating trashcan."
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
          Edit Trashcan
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Trashcan</DialogTitle>
          <DialogDescription>
            Update the details of this trashcan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`trashcan-name-${trashcan.id}`}>Name</Label>
            <Input
              id={`trashcan-name-${trashcan.id}`}
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`trashcan-location-${trashcan.id}`}>
              Location
            </Label>
            <Input
              id={`trashcan-location-${trashcan.id}`}
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
            <Label htmlFor={`trashcan-description-${trashcan.id}`}>
              Description
            </Label>
            <Input
              id={`trashcan-description-${trashcan.id}`}
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
              <Label htmlFor={`trashcan-latitude-${trashcan.id}`}>
                Latitude
              </Label>
              <Input
                id={`trashcan-latitude-${trashcan.id}`}
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
              <Label htmlFor={`trashcan-longitude-${trashcan.id}`}>
                Longitude
              </Label>
              <Input
                id={`trashcan-longitude-${trashcan.id}`}
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
              <Label htmlFor={`trashcan-height-${trashcan.id}`}>
                Height (cm)
              </Label>
              <Input
                id={`trashcan-height-${trashcan.id}`}
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
              <Label htmlFor={`trashcan-bintype-${trashcan.id}`}>
                Bin type
              </Label>
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
                  id={`trashcan-bintype-${trashcan.id}`}
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


