"use client";

import { useState } from "react";

// Renders an image from /tega-asset; if the file is missing (404) or fails to
// load, renders `fallback` instead. Lets the app look right before assets exist.
export function AssetImg({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}) {
  const [err, setErr] = useState(false);
  if (err) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setErr(true)} />;
}
