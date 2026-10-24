"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Entrance motion for the landing: reveal-on-scroll + a hero load timeline.
// Everything fires ONCE — no endless loops. Content is pre-hidden only under
// html.motion-ready (set by a guarded inline script), with a failsafe that
// un-hides if this never runs, so no-JS / reduced-motion users keep full content.
export function LandingMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const heroEls = gsap.utils.toArray<HTMLElement>("[data-hero-group] > *");
      if (heroEls.length) {
        gsap.set(heroEls, { autoAlpha: 0, y: 36, scale: 0.97 });
        gsap.to(heroEls, { autoAlpha: 1, y: 0, scale: 1, duration: 0.85, ease: "power3.out", stagger: 0.12, delay: 0.1 });
      }

      const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      reveals.forEach((el) => {
        const kids = gsap.utils.toArray<HTMLElement>(el.children);
        const targets = kids.length ? kids : [el];
        gsap.set(targets, { autoAlpha: 0, y: 48 });
        ScrollTrigger.create({
          trigger: el,
          start: "top 82%",
          once: true,
          onEnter: () => gsap.to(targets, { autoAlpha: 1, y: 0, duration: 0.75, ease: "power3.out", stagger: 0.14 }),
        });
      });

      ScrollTrigger.refresh();
    });

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("load", onLoad);
      ctx.revert(); // kills tweens + triggers, restores inline styles
    };
  }, []);

  return null;
}
