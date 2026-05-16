"use client";

import { useEffect, useRef } from "react";

/**
 * "Karanlıktan aydınlığa" atmosfer katmanı (hero arka planı).
 * Animasyonlar saf CSS (GPU). Fare paralaksı React render'ı tetiklemeden,
 * rAF içinde CSS değişkeni (--ls-mx/--ls-my) yazılarak yapılır.
 */
export function LightAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduce || !fine) return; // dokunmatik / hareket azaltma: paralaks yok

    let raf = 0;
    let tx = 0;
    let ty = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--ls-mx", tx.toFixed(3));
        el.style.setProperty("--ls-my", ty.toFixed(3));
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="ls-atmo-root pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="ls-base" />
      <div className="ls-sky" />
      <div className="ls-sun" />
      <div className="ls-parallax">
        <span className="ls-beam ls-beam-1" />
        <span className="ls-beam ls-beam-2" />
        <span className="ls-beam ls-beam-3" />
      </div>
      <div className="ls-vignette" />
    </div>
  );
}
