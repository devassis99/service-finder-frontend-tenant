import type { ButtonHTMLAttributes } from "react";

/**
 * The business screens' buttons. Rounded rectangles rather than the back
 * office's pills — B01's header buttons, B07's "Rebalance", B20's
 * "Continue" and C25's full-width sign-in buttons.
 *
 * Variants:
 * - primary   — teal, white text: the one main action on a screen ("+ Invite person").
 * - secondary — white with a hairline border: the alternatives beside it ("Search").
 * - dark      — ink, white text: a call to action inside a tinted card ("Work through them").
 * - danger    — solid red, for a destructive action's confirming click.
 * - link, linkDanger — bare text, for row actions.
 *
 * Sizes: sm is the header bar's 34px, md a card's 38px, lg the auth
 * screens' full-height 50px.
 */
const VARIANTS = {
  primary:
    "border-0 bg-tn-accent font-semibold text-white hover:bg-tn-accent-hover disabled:cursor-not-allowed disabled:bg-tn-disabled-bg disabled:text-tn-faint",
  secondary:
    "border border-tn-input-border bg-tn-paper font-medium text-tn-ink hover:border-tn-input-border-hover hover:bg-tn-hover disabled:cursor-not-allowed disabled:opacity-50",
  dark: "border-0 bg-tn-ink font-semibold text-white hover:bg-tn-body disabled:cursor-not-allowed disabled:opacity-60",
  danger:
    "border-0 bg-tn-danger font-semibold text-white hover:bg-tn-danger-hover disabled:cursor-not-allowed disabled:opacity-60",
  link: "border-0 bg-transparent px-0 font-semibold text-tn-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50",
  linkDanger:
    "border-0 bg-transparent px-0 font-semibold text-tn-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50",
} as const;

const SIZES = {
  sm: "h-[34px] rounded-[10px] px-[14px] text-xs",
  md: "h-[38px] rounded-[10px] px-4 text-[13px]",
  lg: "h-[50px] rounded-[14px] px-[18px] text-[15px]",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  // A link button takes the size's height and type but not its padding or
  // radius — it sits in a table row's line of text.
  const sizing =
    variant === "link" || variant === "linkDanger" ? "h-auto py-1 text-[13px]" : SIZES[size];
  return `inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-sans leading-none ${sizing} ${VARIANTS[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  // oxlint-disable-next-line react/button-has-type -- `type` is a prop, defaulting to "button"
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

/**
 * A destructive row action's second click, the back office's pattern:
 * "Deactivate" turns into a small red "Confirm" for a few seconds (see
 * lib/use-two-step-confirm.ts), so a slip costs nothing and a deliberate
 * click needs no dialog.
 */
export const confirmPillClass =
  "inline-flex cursor-pointer items-center whitespace-nowrap rounded-lg border-0 bg-tn-danger px-[10px] py-[7px] font-sans text-xs font-semibold leading-none text-white hover:bg-tn-danger-hover disabled:cursor-not-allowed disabled:opacity-60";

export default Button;
