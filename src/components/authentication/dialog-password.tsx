"use client"

import type { ReactNode } from "react"
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
import { showSuccessToast } from "~/components/app-toast"

type ResetPasswordDialogProps = {
  children: ReactNode
}

export function ResetPasswordDialog({ children }: ResetPasswordDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Enter your email address and we&apos;ll send you instructions to
            reset your password.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4">
          <div className="grid gap-3">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              name="email"
              type="email"
              placeholder="name@example.com"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                type="button"
                onClick={() =>
                  showSuccessToast({
                    title: "Recovery Requested",
                    description:
                      "Check your email for instructions.",
                  })
                }
              >
                Send reset link
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}