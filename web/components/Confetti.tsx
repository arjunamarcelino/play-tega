"use client";

// Pure-CSS confetti burst (no library). Deterministic positions (SSR-safe).
const COLORS = ["#2ee6d6", "#ff2e63", "#ffd23f", "#836ef9", "#ffffff"];

export function Confetti({ count = 44 }: { count?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 97) % 100;
        const delay = ((i * 37) % 100) / 100;
        const dur = 2 + ((i * 13) % 100) / 50;
        const size = 6 + (i % 4) * 2;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: "-5vh",
              width: size,
              height: size * 0.4,
              background: COLORS[i % COLORS.length],
              borderRadius: 1,
              animation: `confetti-fall ${dur}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
