import { cn } from "./ui";

/**
 * Countdown progress bar. Turns embat-red and pulses when <= 5s remain.
 * `seconds` / `total` are whole seconds; render-only (parent owns the ticking).
 */
export function Timer({ seconds, total, label }: { seconds: number; total: number; label?: string }) {
  const clamped = Math.max(0, Math.min(seconds, total));
  const pct = total > 0 ? (clamped / total) * 100 : 0;
  const urgent = clamped <= 5;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs text-white/70">
        <span className="display">{label ?? "Time"}</span>
        <span className={cn("display", urgent && "neon-embat animate-pulseGlow")}>{clamped}s</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", urgent ? "bg-embat" : "bg-bagi")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
