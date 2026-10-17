import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** The dialog's heading — also its accessible name. */
  title: string;
  /** One or two sentences under the heading. */
  description?: ReactNode;
  /** The action row, right-aligned at the bottom. */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * The app's one dialog — the back office's, in this app's colours. The
 * Business screens draw no dialog, so it is the screens' own frame (warm
 * paper, hairline border, 20px radius) lifted over a dimmed page.
 *
 * Rendered through a portal straight to document.body so "fixed
 * inset-0" centres on the viewport, not on whichever scrolling container
 * it was declared inside.
 */
export function Modal({ open, onClose, title, description, footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-tn-backdrop p-5 backdrop-blur-[3px]"
      // Closes only on a click that landed on the backdrop itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      {/* Not a <dialog>: its UA styles fight the flex centring above, and
          showModal() would duplicate the backdrop drawn here. Escape is
          handled in the effect above. */}
      <div
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="box-border flex max-h-full w-[480px] max-w-full flex-col gap-5 overflow-y-auto rounded-[20px] border border-tn-border bg-tn-page p-7 shadow-dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="m-0 font-sans text-[21px] leading-[1.15] font-bold tracking-[-0.02em] text-tn-ink">
              {title}
            </h2>
            {description && (
              <p className="m-0 font-sans text-sm leading-normal text-tn-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent font-sans text-xl leading-none text-tn-muted hover:bg-tn-hover hover:text-tn-ink"
          >
            ×
          </button>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2.5 pt-1">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
