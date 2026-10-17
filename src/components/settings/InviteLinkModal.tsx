import { Button } from "@/components/ui/Button";
import { formInputClass } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { copyText } from "@/lib/clipboard";
import { formatDate } from "@/lib/format";
import type { InviteLink } from "@/lib/staff-api";
import { useFlash } from "@/lib/use-flash";

/**
 * A setup link to pass on by hand — shown rather than silently copied,
 * because a copy that happens after a network call isn't a user gesture
 * any more and Safari refuses it. The Copy button here is a fresh click.
 */
export function InviteLinkModal({
  link,
  name,
  onClose,
}: {
  link: InviteLink | null;
  name: string;
  onClose: () => void;
}) {
  const copied = useFlash();
  return (
    <Modal
      open={link !== null}
      onClose={onClose}
      title={`Setup link for ${name}`}
      description="Send this to them however suits — a message, a chat. It works once and replaces any link we emailed before, so the older one stops working."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
          <Button
            onClick={() => {
              if (link) void copyText(link.url).then((ok) => ok && copied.flash("link"));
            }}
          >
            {copied.is("link") ? "Copied" : "Copy link"}
          </Button>
        </>
      }
    >
      {link && (
        <div className="flex flex-col gap-2">
          <input
            readOnly
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
            className={`${formInputClass} font-mono text-xs`}
            aria-label="Setup link"
          />
          <span className="font-sans text-xs text-tn-muted">
            Expires {formatDate(link.expiresAt)}.
          </span>
        </div>
      )}
    </Modal>
  );
}

export default InviteLinkModal;
