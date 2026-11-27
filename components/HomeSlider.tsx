"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PHOTOS = [
  { src: "/home/studio-4.jpg", alt: "Two students reaching up in a side stretch by the window", pos: "50% 40%" },
  { src: "/home/studio-1.jpg", alt: "A class in side angle in front of the Plot Twist mirror", pos: "50% 55%" },
  { src: "/home/studio-3.jpg", alt: "Hands pressing into Plot Twist mats", pos: "50% 60%" },
  { src: "/home/studio-2.jpg", alt: "Students sitting in meditation", pos: "50% 50%" },
  { src: "/home/studio-5.jpg", alt: "A class resting in savasana", pos: "50% 55%" },
];

// Photo slideshow behind the homepage headline. Swipe, arrows or auto-advance.
export default function HomeSlider() {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const paused = useRef(false);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = (i + PHOTOS.length) % PHOTOS.length;
    idxRef.current = n;
    setIdx(n);
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (!paused.current) go(idxRef.current + 1); }, 5000);
    return () => clearInterval(t);
  }, [go]);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const n = Math.round(el.scrollLeft / el.clientWidth);
    if (n !== idxRef.current && n >= 0 && n < PHOTOS.length) { idxRef.current = n; setIdx(n); }
  }

  return (
    <div
      className="hs"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
      onTouchEnd={() => (paused.current = false)}
    >
      <div className="hs-track" ref={track} onScroll={onScroll}>
        {PHOTOS.map((p, i) => (
          <div className="hs-slide" key={p.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.alt} style={{ objectPosition: p.pos }} loading={i === 0 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>
      <div className="hs-shade" aria-hidden="true" />
      <div className="hs-ui">
        <div className="hs-count">0{idx + 1} <span>/ 0{PHOTOS.length}</span></div>
        <button type="button" onClick={() => go(idx - 1)} aria-label="Previous photo">‹</button>
        <button type="button" onClick={() => go(idx + 1)} aria-label="Next photo">›</button>
      </div>
      <div className="hs-bar" aria-hidden="true">
        {PHOTOS.map((p, i) => <i key={p.src} className={i === idx ? "on" : ""} />)}
      </div>
    </div>
  );
}
