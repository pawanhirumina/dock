import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}) {
  const handleOpenChange = (isOpen) => {
    // instant close
    if (!isOpen) {
      if (onCancel) onCancel()
      if (onOpenChange) onOpenChange(false)
    } else {
      if (onOpenChange) onOpenChange(true)
    }
  }

  const handleCancel = () => {
    if (onCancel) onCancel()
    if (onOpenChange) onOpenChange(false)
  }

  const handleConfirm = async () => {
    if (onConfirm) await onConfirm()
    // close after confirm too
    if (onOpenChange) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline"  onClick={handleCancel} type="button">
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm} type="button">
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}