"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted } from "@/lib/sfx";

/** Toggles the global sfx mute flag (persisted in localStorage). */
export function MuteButton() {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setM(next);
  };
  return (
    <button
      onClick={toggle}
      aria-label={muted ? "Unmute" : "Mute"}
      title={muted ? "Unmute" : "Mute"}
      className="display rounded-lg border border-white/15 px-2.5 py-1 text-sm text-white/70 hover:border-white/40"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
