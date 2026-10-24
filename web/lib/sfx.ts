"use client";
// Sound: play /tega-asset/sfx/<name>.mp3 if present, else generated WebAudio
// tones (zero-asset). Same function names either way. Honors a mute flag.

import { assets } from "./assets";

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("tega:muted") === "1";
}
export function setMuted(m: boolean) {
  if (typeof window !== "undefined") localStorage.setItem("tega:muted", m ? "1" : "0");
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, delay = 0) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(a.destination);
  const t = a.currentTime + delay;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur);
}

const tones: Record<string, () => void> = {
  tick: () => tone(880, 0.05, "square", 0.05),
  lock: () => tone(520, 0.08, "square", 0.08),
  reveal: () => {
    tone(400, 0.12, "sawtooth", 0.12);
    tone(620, 0.18, "sawtooth", 0.1, 0.06);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.16, i * 0.09)),
  lose: () => [330, 247, 165].forEach((f, i) => tone(f, 0.3, "sine", 0.16, i * 0.12)),
};

const files: Record<string, string> = {
  tick: assets.sfx.tick,
  lock: assets.sfx.lock,
  reveal: assets.sfx.reveal,
  win: assets.sfx.win,
  lose: assets.sfx.lose,
};

const failed = new Set<string>();

function play(name: keyof typeof tones) {
  if (isMuted()) return;
  if (failed.has(name)) return tones[name]();
  try {
    const a = new Audio(files[name]);
    a.volume = 0.5;
    a.play().catch(() => {
      failed.add(name);
      tones[name]();
    });
  } catch {
    failed.add(name);
    tones[name]();
  }
}

export const sfx = {
  tick: () => play("tick"),
  lock: () => play("lock"),
  reveal: () => play("reveal"),
  win: () => play("win"),
  lose: () => play("lose"),
};
