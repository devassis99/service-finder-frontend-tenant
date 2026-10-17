import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineError } from "@/components/ui/Card";
import { Field, formInputClass } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { confirmPasswordChange, requestPasswordCode } from "@/lib/accounts-api";
import { errorMessage } from "@/lib/errors";

interface PasswordModalProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  email: string;
  hasPassword: boolean;
  mfaEnabled: boolean;
}

/**
 * Set or change the caller's password. Either way it's a change to how
 * they sign in, so it needs proof it's them: a code from their
 * authenticator if two-factor is on, otherwise a 6-digit code emailed to
 * them (POST /accounts/security/password/request-code). Every other
 * session of theirs is signed out when it succeeds.
 */
export function PasswordModal({
  open,
  onClose,
  onDone,
  email,
  hasPassword,
  mfaEnabled,
}: PasswordModalProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCodeSent(false);
    setCode("");
    setPassword("");
    setConfirm("");
    setError(null);
  }, [open]);

  async function sendCode() {
    setError(null);
    setBusy(true);
    try {
      await requestPasswordCode();
      setCodeSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Choose a password of at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    if (code.length !== 6) return setError("Enter the 6-digit code.");
    setError(null);
    setBusy(true);
    try {
      await confirmPasswordChange(
        mfaEnabled ? { newPassword: password, totpCode: code } : { newPassword: password, code },
      );
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  const title = hasPassword ? "Change password" : "Set a password";
  const needsEmailStep = !mfaEnabled && !codeSent;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={
        mfaEnabled
          ? "Two-factor is on, so confirm with a code from your authenticator app."
          : needsEmailStep
            ? `First, we'll email a 6-digit code to ${email} to make sure it's you.`
            : `We sent a code to ${email}. It expires in 10 minutes.`
      }
    >
      {needsEmailStep ? (
        <>
          {error && <InlineError>{error}</InlineError>}
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void sendCode()} disabled={busy}>
              {busy ? "Sending…" : "Email me a code"}
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label={mfaEnabled ? "Authenticator code" : "Code from the email"}>
            <OtpInput value={code} onChange={setCode} disabled={busy} />
          </Field>
          <Field
            label="New password"
            hint="At least 8 characters. Your other devices will be signed out."
          >
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={formInputClass}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={formInputClass}
            />
          </Field>
          {error && <InlineError>{error}</InlineError>}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {!mfaEnabled ? (
              <Button variant="link" onClick={() => void sendCode()} disabled={busy}>
                Send a new code
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2.5">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : title}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default PasswordModal;
