"use client";

import { useEffect, useState } from "react";

// A background-image layer that only renders if the file actually loads.
// Place inside a `relative` parent; it sits behind content. No file → nothing
// (the flat ink base + scanlines show through).
//
// `fullBleed` makes it span the full viewport width (breaking out of any
// max-width parent) as a centered band of `height` — used for the arena art so
// it reads as a wide, short stage backdrop rather than a tall full-cover.
export function AssetBg({
  src,
  className = "",
  opacity = 0.35,
  fullBleed = false,
  height,
}: {
  src: string;
  className?: string;
  opacity?: number;
  fullBleed?: boolean;
  height?: string;
}) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  if (!ok) return null;

  const pos = fullBleed
    ? "pointer-events-none absolute left-1/2 top-1/2 w-screen -translate-x-1/2 -translate-y-1/2"
    : "pointer-events-none absolute inset-0";

  return (
    <div
      aria-hidden
      className={`${pos} ${className}`}
      style={{
        backgroundImage: `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity,
        ...(height ? { height } : null),
      }}
    />
  );
}
