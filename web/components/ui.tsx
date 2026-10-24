import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "bagi" | "embat" | "ghost" | "gold";

const VARIANTS: Record<Variant, string> = {
  primary: "border-mon/50 text-mon hover:shadow-neon-mon hover:border-mon",
  bagi: "border-bagi/50 text-bagi hover:shadow-neon-bagi hover:border-bagi",
  embat: "border-embat/50 text-embat hover:shadow-neon-embat hover:border-embat",
  gold: "border-gold/50 text-gold hover:shadow-neon-gold hover:border-gold",
  ghost: "border-white/15 text-white/80 hover:border-white/40",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: { variant?: Variant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "display inline-flex items-center justify-center gap-2 rounded-xl border bg-panel/60 px-4 py-2 text-sm",
        "transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:border-current",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("chip display", className)}>{children}</span>;
}
