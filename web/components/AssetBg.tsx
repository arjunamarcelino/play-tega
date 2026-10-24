"use client";

import { useEffect, useState } from "react";

// A background-image layer that only renders if the file actually loads.
// Place inside a `relative` parent; it sits behind content. No file → nothing
// (the flat ink base + scanlines show through).
export function AssetBg({
  src,
  className = "",
  opacity = 0.35,
}: {
  src: string;
  className?: string;
  opacity?: number;
}) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = src;
  }, [src]);
  if (!ok) return null;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center", opacity }}
    />
  );
}
