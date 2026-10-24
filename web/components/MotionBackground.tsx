"use client";

import { useEffect, useRef } from "react";

// Subtle "arena atmosphere": sparse embers drifting upward in the brand colors.
// Deliberately NOT a mesh/aurora gradient (that reads as AI slop on a dark brand).
// Honors prefers-reduced-motion (one static frame), pauses when hidden/offscreen,
// and caps devicePixelRatio for perf.
export function MotionBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;
    const canvas: HTMLCanvasElement = el;
    const ctx: CanvasRenderingContext2D = context;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    // mon (purple), gold, bagi (teal) — sparse, low alpha so text always wins.
    const COLORS = ["131,110,249", "255,210,63", "46,230,214"];

    let W = 0;
    let H = 0;
    let pts: Array<{ x: number; y: number; r: number; vx: number; vy: number; a: number; c: string }> = [];
    let raf = 0;
    let running = !reduce;

    function seed() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.round(Math.min(74, Math.max(28, W / 23)));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.9 + 0.5,
        vx: (Math.random() - 0.5) * 0.07,
        vy: -(Math.random() * 0.2 + 0.05),
        a: Math.random() * 0.45 + 0.14,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -6) {
          p.y = H + 6;
          p.x = Math.random() * W;
        }
        if (p.x < -6) p.x = W + 6;
        else if (p.x > W + 6) p.x = -6;
        ctx.shadowBlur = p.r * 4;
        ctx.shadowColor = `rgba(${p.c},${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${Math.min(1, p.a + 0.15)})`;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (running) raf = requestAnimationFrame(draw);
    }

    function start() {
      if (!running) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    }

    seed();
    draw(); // one frame regardless; reschedules only while running

    const onResize = () => {
      seed();
      if (!running) draw();
    };
    const onVis = () => {
      running = !document.hidden && !reduce;
      start();
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);

    const io = new IntersectionObserver(
      ([e]) => {
        running = e.isIntersecting && !document.hidden && !reduce;
        start();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-90" />;
}
