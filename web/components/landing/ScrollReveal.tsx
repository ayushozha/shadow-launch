"use client";

import { useEffect } from "react";

/**
 * Mounts a single IntersectionObserver and upgrades every `.reveal` element
 * to `.reveal.in` once it crosses into the viewport. Matches the behaviour
 * of the inline script in shadow-launch.html so the existing CSS transitions
 * in globals.css fire at the same visual moment.
 */
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const targets = document.querySelectorAll<HTMLElement>(".reveal");
    if (targets.length === 0) return;

    // Reduced motion: skip the animation, just show the content.
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );

    targets.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return null;
}
