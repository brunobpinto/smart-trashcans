"use client"

import { CircleX, CircleCheck , Info, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

const TOAST_DURATION = 4000

type ToastOptions = {
  title: string
  description?: string
}

export function showErrorToast({ title, description }: ToastOptions) {
  toast.custom((t) => (
    <div
      className="relative w-88 max-w-sm rounded-xl bg-white p-4 shadow-md border border-gray-200 overflow-hidden"
      style={{ ["--toast-duration" as string]: `${TOAST_DURATION}ms` }}
    >
      <div className="flex items-start gap-3 pb-3">
        <div className="flex mt-1 h-10 w-10 flex-none items-center justify-center rounded-md bg-[#fee2e2]">
          <CircleX className="size-6 text-[#E04257]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-gray-900">{title}</span>
            <button
              onClick={() => toast.dismiss(t)}
              className="ml-auto text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          {description && (
            <span className="mt-1 pr-8 text-sm text-gray-600 wrap-break-word">
              {description}
            </span>
          )}
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-gray-100">
        <div className="h-full w-full bg-[#E04257] toast-progress-bar" />
      </div>
    </div>
  ), { duration: TOAST_DURATION })
}

export function showSuccessToast({ title, description }: ToastOptions) {
  toast.custom((t) => (
    <div
      className="relative w-88 max-w-sm rounded-xl bg-white p-4 shadow-md border border-gray-200 overflow-hidden"
      style={{ ["--toast-duration" as string]: `${TOAST_DURATION}ms` }}
    >
      <div className="flex items-start gap-3 pb-3">
        <div className="flex mt-1 h-10 w-10 flex-none items-center justify-center rounded-md bg-[#dcfce7]">
          <CircleCheck className="size-6 text-[#37b874]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-gray-900">{title}</span>
            <button
              onClick={() => toast.dismiss(t)}
              className="ml-auto text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          {description && (
            <span className="mt-1 pr-8 text-sm text-gray-600 wrap-break-word">
              {description}
            </span>
          )}
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-gray-100">
        <div className="h-full w-full bg-[#37b874] toast-progress-bar" />
      </div>
    </div>
  ), { duration: TOAST_DURATION })
}

export function showInfoToast({ title, description }: ToastOptions) {
  toast.custom((t) => (
    <div
      className="relative w-88 max-w-sm rounded-xl bg-white p-4 shadow-md border border-gray-200 overflow-hidden"
      style={{ ["--toast-duration" as string]: `${TOAST_DURATION}ms` }}
    >
      <div className="flex items-start gap-3 pb-3">
        <div className="flex mt-1 h-10 w-10 flex-none items-center justify-center rounded-md bg-[#dbeafe]">
          <Info className="size-6 text-[#44b5c3]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-gray-900">{title}</span>
            <button
              onClick={() => toast.dismiss(t)}
              className="ml-auto text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          {description && (
            <span className="mt-1 pr-8 text-sm text-gray-600 wrap-break-word">
              {description}
            </span>
          )}
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-gray-100">
        <div className="h-full w-full bg-[#44b5c3] toast-progress-bar" />
      </div>
    </div>
  ), { duration: TOAST_DURATION })
}

export function showWarningToast({ title, description }: ToastOptions) {
  toast.custom((t) => (
    <div
      className="relative w-88 max-w-sm rounded-xl bg-white p-4 shadow-md border border-gray-200 overflow-hidden"
      style={{ ["--toast-duration" as string]: `${TOAST_DURATION}ms` }}
    >
      <div className="flex items-start gap-3 pb-3">
        <div className="flex mt-1 h-10 w-10 flex-none items-center justify-center rounded-md bg-[#fef3c7]">
          <TriangleAlert className="size-6 text-[#e5bc45]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-gray-900">{title}</span>
            <button
              onClick={() => toast.dismiss(t)}
              className="ml-auto text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
          {description && (
            <span className="mt-1 pr-8 text-sm text-gray-600 wrap-break-word">
              {description}
            </span>
          )}
        </div>
      </div>
      <div className="absolute left-0 right-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-gray-100">
        <div className="h-full w-full bg-[#e5bc45] toast-progress-bar" />
      </div>
    </div>
  ), { duration: TOAST_DURATION })
}
