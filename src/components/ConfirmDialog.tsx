import { useEffect, useRef } from 'react';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * A small confirmation modal built on the native <dialog> element.
 *
 * showModal() gives us:
 *   - a proper top-layer stacking context (always on top)
 *   - a built-in ::backdrop for the overlay
 *   - native Escape-key handling (fires the 'close' event)
 *   - browser focus-trap inside the dialog
 *
 * The Cancel button receives focus when the dialog opens, so accidental
 * keyboard confirmation requires an explicit Tab + Enter.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete show',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      // Explicitly focus Cancel so keyboard users can't accidentally confirm.
      cancelRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby="confirm-dialog-title"
      // Handles Escape key (native) and programmatic close.
      // Calling onCancel() here is safe because the parent setConfirmDelete(null)
      // is idempotent — a second call after Cancel-button click is a no-op.
      onClose={onCancel}
      // Clicking the ::backdrop area (the <dialog> element itself, outside the
      // inner box) dismisses the modal.
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel();
      }}
    >
      <div
        className="confirm-dialog__body"
        // Stop clicks inside the box from bubbling to the backdrop handler.
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title display">
          {title}
        </h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button ref={cancelRef} type="button" className="btn btn--ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
