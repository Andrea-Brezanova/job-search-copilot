export type ButtonVariant = "primary" | "secondary" | "ochre" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  fullWidth = false,
}: ButtonStyleOptions = {}) {
  const base =
    "inline-flex items-center justify-center rounded-md border font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy-soft)] disabled:cursor-not-allowed disabled:opacity-60";
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "border-[var(--color-navy)] bg-[var(--color-navy)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[#18314f]",
    secondary:
      "border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-ink)] shadow-[0_1px_0_var(--color-hair)] hover:border-[var(--color-navy)]/35 hover:text-[var(--color-navy)]",
    ochre:
      "border-[var(--color-ochre)] bg-[var(--color-ochre)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[#8f5e28]",
    ghost:
      "border-transparent bg-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]",
  };
  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-sm",
  };

  return [
    base,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
