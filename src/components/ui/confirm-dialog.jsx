import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loadingText = "Working...",
  variant = "default",
}) {
  const [pending, setPending] = useState(false)

  const handleOpenChange = (isOpen) => {
    if (isOpen) {
      onOpenChange?.(true)
      return
    }

    // Prevent dismissing the dialog while the action is in flight.
    if (pending) return

    onCancel?.()
    onOpenChange?.(false)
  }

  const handleCancel = () => {
    if (pending) return
    onCancel?.()
    onOpenChange?.(false)
  }

  const handleConfirm = async () => {
    if (pending) return

    setPending(true)
    try {
      await onConfirm?.()
      onOpenChange?.(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            type="button"
            disabled={pending}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            type="button"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <Spinner data-icon="inline-start" />
                {loadingText}
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
