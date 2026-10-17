import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { Spinner } from "@/components/ui/Spinner";
import { beginMfaSetup, confirmMfaSetup, disableMfa, type MfaSetup } from "@/lib/accounts-api";
import { copyText } from "@/lib/clipboard";
import { errorMessage } from "@/lib/errors";
import { useFlash } from "@/lib/use-flash";

interface TwoFactorModalProps {
  open: boolean;
  /** "enable" walks through setup; "disable" asks for one live code. */
  mode: "enable" | "disable";
  onClose: () => void;
  onDone: () => void;
}

/**
 * Turns two-factor on or off. On: a new secret and QR code to scan
 * (POST /accounts/security/mfa/setup), then the first code the app shows
 * to prove it worked — two-factor stays off until that code checks out.
 * Off: a live code, proving the device rather than just the open session.
 */
export function TwoFactorModal({ open, mode, onClose, onDone }: TwoFactorModalProps) {
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copied = useFlash();

  useEffect(() => {
    if (!open) return;
    setCode("");
    setInvalid(false);
    setError(null);
    setSetup(null);
    if (mode !== "enable") return;
    let cancelled = false;
    beginMfaSetup()
      .then((result) => {
        if (!cancelled) setSetup(result);
        return result;
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  async function submit(value: string) {
    if (value.length !== 6 || busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === "enable") await confirmMfaSetup(value);
      else await disableMfa(value);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setInvalid(true);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  const waitingForSetup = mode === "enable" && !setup;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "enable" ? "Turn on two-factor" : "Turn off two-factor"}
      description={
        mode === "enable"
          ? "Scan the code with an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code it shows."
          : "Enter a code from your authenticator app. Signing in will then only need your password or Google."
      }
    >
      {mode === "enable" && (
        <div className="flex flex-col items-center gap-3 rounded-[14px] border border-tn-card-border bg-tn-paper p-4">
          {setup ? (
            <>
              <img
                src={setup.qrCodeDataUrl}
                alt="QR code for your authenticator app"
                width={176}
                height={176}
                className="rounded-lg"
              />
              <div className="flex w-full flex-col items-center gap-1.5">
                <span className="font-mono text-[10px] leading-none text-tn-faint uppercase">
                  Or enter this key
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void copyText(setup.secret).then((ok) => ok && copied.flash("secret"));
                  }}
                  className="cursor-pointer rounded-lg border border-tn-card-border bg-tn-subtle px-3 py-2 font-mono text-xs break-all text-tn-ink hover:border-tn-input-border"
                  title="Copy"
                >
                  {setup.secret}
                </button>
                <span className="h-3 font-sans text-[11px] leading-none text-tn-accent">
                  {copied.is("secret") ? "Copied" : ""}
                </span>
              </div>
            </>
          ) : error ? null : (
            <div className="flex h-[176px] items-center">
              <Spinner size={24} />
            </div>
          )}
        </div>
      )}

      <OtpInput
        value={code}
        onChange={(value) => {
          setCode(value);
          setInvalid(false);
        }}
        onComplete={(value) => void submit(value)}
        disabled={busy || waitingForSetup}
        invalid={invalid}
      />
      {error && <InlineError>{error}</InlineError>}
      <div className="flex justify-end gap-2.5">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={mode === "disable" ? "danger" : "primary"}
          onClick={() => void submit(code)}
          disabled={busy || code.length !== 6 || waitingForSetup}
        >
          {busy ? "Checking…" : mode === "enable" ? "Turn on" : "Turn off"}
        </Button>
      </div>
    </Modal>
  );
}

export default TwoFactorModal;
