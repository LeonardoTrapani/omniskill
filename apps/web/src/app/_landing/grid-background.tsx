"use client";

import { useEffect, useRef, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Seeded PRNG                                                       */
/* ------------------------------------------------------------------ */
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Dot-matrix canvas                                                 */
/* ------------------------------------------------------------------ */
interface DotMatrixProps {
  seed?: number;
  density?: number;
  accentRatio?: number;
  className?: string;
}

export function DotMatrix({
  seed = 42,
  density = 60,
  accentRatio = 0.12,
  className,
}: DotMatrixProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const dots = useMemo(() => {
    if (dims.w === 0 || dims.h === 0) return [];
    const rng = mulberry32(seed);
    const area = dims.w * dims.h;
    const count = Math.round((area / 1_000_000) * density);
    return Array.from({ length: count }, () => ({
      x: rng() * dims.w,
      y: rng() * dims.h,
      r: 1 + rng() * 1.5,
      accent: rng() < accentRatio,
      phase: rng() * Math.PI * 2,
      speed: 0.3 + rng() * 0.7,
    }));
  }, [seed, density, accentRatio, dims]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      setDims({ w: width, h: height });
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dots.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue("--primary").trim();
    const muted = style.getPropertyValue("--muted-foreground").trim();
    const dpr = window.devicePixelRatio || 1;

    let running = true;
    const draw = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const dot of dots) {
        const alpha = 0.25 + 0.18 * Math.sin(t * 0.001 * dot.speed + dot.phase);
        ctx.beginPath();
        ctx.arc(dot.x * dpr, dot.y * dpr, dot.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = dot.accent
          ? `oklch(from ${primary} l c h / ${alpha})`
          : `oklch(from ${muted} l c h / ${alpha * 0.6})`;
        ctx.fill();
      }
      frameRef.current = requestAnimationFrame(draw);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      draw(0);
    } else {
      frameRef.current = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [dots]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Shared SVG primitives                                             */
/* ------------------------------------------------------------------ */

/** 4-point star inside a circle — used at column intersections */
function StarMark({ className }: { className?: string }) {
  return (
    <svg
      width="47"
      height="47"
      viewBox="0 0 47 47"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 18C24 21.3137 26.6863 24 30 24H34V25H30C26.6863 25 24 27.6863 24 31V35H23V31C23 27.6863 20.3137 25 17 25H13V24H17C20.3137 24 23 21.3137 23 18V14H24V18Z"
        fill="var(--primary)"
        fillOpacity="0.8"
      />
      <circle cx="23.5" cy="23.5" r="23" stroke="var(--border)" strokeOpacity="0.72" />
    </svg>
  );
}

/** Rounded-corner cut SVG (11x11) — placed at box intersections */
function CurvyCorner({
  rotate,
  className,
}: {
  rotate: "tl" | "tr" | "bl" | "br";
  className?: string;
}) {
  const rotateClass =
    rotate === "tl"
      ? "-rotate-90"
      : rotate === "tr"
        ? ""
        : rotate === "bl"
          ? "rotate-180"
          : "rotate-90";
  const posClass =
    rotate === "tl"
      ? "top-0 left-0"
      : rotate === "tr"
        ? "top-0 right-0"
        : rotate === "bl"
          ? "bottom-0 left-0"
          : "bottom-0 right-0";
  return (
    <svg
      fill="none"
      height="11"
      viewBox="0 0 11 11"
      width="11"
      xmlns="http://www.w3.org/2000/svg"
      className={`absolute ${posClass} ${rotateClass} ${className ?? ""}`}
      aria-hidden="true"
    >
      <path
        d="M11 1L11 11L10 11L10 7C10 3.68629 7.31371 1 4 1L-4.37114e-08 1L0 -4.80825e-07L11 4.37114e-07L11 1Z"
        fill="var(--border)"
        fillOpacity="0.45"
      />
    </svg>
  );
}

/** A bordered rectangle with optional curvy corners at each corner */
function CurvyRect({
  className,
  corners = "all",
}: {
  className?: string;
  corners?: "all" | "tl" | "tr" | "bl" | "br" | ("tl" | "tr" | "bl" | "br")[];
}) {
  const all = corners === "all";
  const arr = Array.isArray(corners) ? corners : all ? ["tl", "tr", "bl", "br"] : [corners];
  return (
    <div className={`pointer-events-none absolute ${className ?? ""}`} aria-hidden="true">
      {(arr as ("tl" | "tr" | "bl" | "br")[]).map((c) => (
        <CurvyCorner key={c} rotate={c} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block-pattern decorations (dot-matrix squares)                    */
/*  Generates grid of small squares like Firecrawl's ASCII blocks     */
/* ------------------------------------------------------------------ */

function DotBlock({
  rows,
  cols,
  cellSize = 8,
  gap = 3,
  seed = 1,
  className,
}: {
  rows: number;
  cols: number;
  cellSize?: number;
  gap?: number;
  seed?: number;
  className?: string;
}) {
  const rng = mulberry32(seed);
  const totalW = cols * (cellSize + gap) - gap;
  const totalH = rows * (cellSize + gap) - gap;

  const cells: { x: number; y: number; opacity: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rng();
      if (v > 0.35) {
        cells.push({
          x: c * (cellSize + gap),
          y: r * (cellSize + gap),
          opacity: 0.1 + v * 0.18,
        });
      }
    }
  }

  return (
    <svg
      width={totalW}
      height={totalH}
      viewBox={`0 0 ${totalW} ${totalH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.x}
          y={cell.y}
          width={cellSize}
          height={cellSize}
          fill="var(--border)"
          fillOpacity={cell.opacity}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero grid overlay                                                 */
/*  Dense structural grid visible only within the hero section        */
/*  Multiple nested columns + horizontal rules + curvy-rect corners   */
/* ------------------------------------------------------------------ */

export function HeroGridOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 lg:hidden">
        <div className="absolute top-0 bottom-0 left-4 w-px bg-border/45" />
        <div className="absolute top-0 bottom-0 right-4 w-px bg-border/45" />
        <div className="absolute top-[96px] left-4 right-4 h-px bg-border/45" />
        <div className="absolute top-[196px] left-4 right-4 h-px bg-border/45" />
        <StarMark className="absolute left-4 top-[172px] -translate-x-1/2" />
        <StarMark className="absolute right-4 top-[172px] translate-x-1/2" />
        <CurvyRect className="left-0 top-24 size-[72px]" corners="all" />
        <CurvyRect className="right-0 top-24 size-[72px]" corners="all" />
        <div className="absolute left-4 top-8 opacity-75">
          <DotBlock rows={4} cols={5} seed={2201} cellSize={4} gap={2} />
        </div>
        <div className="absolute right-4 top-8 opacity-75">
          <DotBlock rows={4} cols={5} seed={2202} cellSize={4} gap={2} />
        </div>
      </div>

      <div className="absolute inset-0 hidden lg:block">
      {/* ── Outer frame: 1314px ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[1314px] -translate-x-1/2">
        {/* Bracket labels */}
        <span className="absolute top-6 -left-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
          [ SKILL ]
        </span>
        <span className="absolute top-6 -right-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
          [ SYNC ]
        </span>
        <span className="absolute bottom-6 -left-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
          [ .MD ]
        </span>
        <span className="absolute bottom-6 -right-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
          [ GRAPH ]
        </span>

        {/* Horizontal rules only on side background */}
        <div className="absolute top-[100px] left-0 h-px w-[303px] bg-border/45" />
        <div className="absolute top-[100px] right-0 h-px w-[303px] bg-border/45" />
        <div className="absolute top-[200px] left-0 h-px w-[303px] bg-border/45" />
        <div className="absolute top-[200px] right-0 h-px w-[303px] bg-border/45" />
        <div className="absolute top-[300px] left-0 h-px w-[303px] bg-border/45" />
        <div className="absolute top-[300px] right-0 h-px w-[303px] bg-border/45" />
        <div className="absolute top-[400px] left-0 h-px w-[303px] bg-border/45" />
        <div className="absolute top-[400px] right-0 h-px w-[303px] bg-border/45" />

        {/* Left-side curvy-rect boxes along outer column */}
        <CurvyRect
          className="left-0 top-[100px] h-[101px] w-[101px]"
          corners={["tl", "tr", "bl", "br"]}
        />
        <CurvyRect className="left-0 top-[200px] h-[101px] w-[101px]" corners={["tl", "bl"]} />
        <CurvyRect
          className="left-0 top-[300px] h-[101px] w-[101px]"
          corners={["tl", "bl", "br"]}
        />

        {/* Right-side curvy-rect boxes along outer column */}
        <CurvyRect
          className="right-0 top-[100px] h-[101px] w-[101px]"
          corners={["tl", "tr", "bl", "br"]}
        />
        <CurvyRect className="right-0 top-[200px] h-[101px] w-[101px]" corners={["tr", "br"]} />
        <CurvyRect
          className="right-0 top-[300px] h-[101px] w-[101px]"
          corners={["tl", "tr", "br"]}
        />
      </div>

      {/* ── 1112px column ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[1112px] -translate-x-1/2">
        {/* Horizontal rules stay on the side lanes */}
        <div className="absolute top-[200px] left-0 h-px w-[202px] bg-border/45" />
        <div className="absolute top-[200px] right-0 h-px w-[202px] bg-border/45" />
        <div className="absolute top-[300px] left-0 h-px w-[202px] bg-border/45" />
        <div className="absolute top-[300px] right-0 h-px w-[202px] bg-border/45" />
        <div className="absolute top-[400px] left-0 h-px w-[202px] bg-border/45" />
        <div className="absolute top-[400px] right-0 h-px w-[202px] bg-border/45" />

        {/* Curvy-rect boxes at the 1112px column edges */}
        <CurvyRect className="left-0 top-[100px] size-[101px]" corners="all" />
        <CurvyRect className="right-0 top-[100px] size-[101px]" corners="all" />
        <CurvyRect className="left-0 top-[200px] size-[101px]" corners={["tl", "bl", "br"]} />
        <CurvyRect className="right-0 top-[200px] size-[101px]" corners={["tr", "bl", "br"]} />
        <CurvyRect className="left-0 top-[300px] size-[101px]" corners="all" />
        <CurvyRect className="right-0 top-[300px] size-[101px]" corners="all" />
        <CurvyRect className="left-0 top-[400px] size-[101px]" corners="all" />
        <CurvyRect className="right-0 top-[400px] size-[101px]" corners="all" />

        {/* Second-ring inner boxes (101px inset from 1112px edge) */}
        <CurvyRect className="left-[101px] top-[100px] size-[101px]" corners={["tl", "tr", "bl"]} />
        <CurvyRect className="left-[101px] top-[200px] size-[101px]" corners={["tl", "bl", "br"]} />
        <CurvyRect
          className="right-[101px] top-[100px] size-[101px]"
          corners={["tl", "tr", "br"]}
        />
        <CurvyRect
          className="right-[101px] top-[200px] size-[101px]"
          corners={["tr", "bl", "br"]}
        />
        <CurvyRect className="left-[101px] top-[300px] size-[101px]" corners="all" />
        <CurvyRect className="right-[101px] top-[300px] size-[101px]" corners="all" />
        <CurvyRect className="left-[101px] top-[400px] size-[101px]" corners="all" />
        <CurvyRect className="right-[101px] top-[400px] size-[101px]" corners="all" />
      </div>

      {/* ── 910px column ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[910px] -translate-x-1/2 border-x border-border/45" />

      {/* ── 708px column ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[708px] -translate-x-1/2 border-x border-border/45">
        {/* Star marks aligned to hero frame edge */}
        <StarMark className="absolute top-[176px] -left-[24px] z-[2]" />
        <StarMark className="absolute top-[176px] -right-[24px] z-[2]" />
        <div className="absolute top-[100px] left-0 h-px w-full bg-border/45" />
        <div className="absolute top-[200px] left-0 h-px w-full bg-border/45" />
        {/* Bottom curvy corners */}
        <CurvyCorner rotate="bl" className="!bottom-0 !left-0" />
        <CurvyCorner rotate="br" className="!bottom-0 !right-0" />
      </div>

      {/* ── Narrower inner columns (visible in upper area) ── */}
      <div className="absolute top-[100px] left-1/2 h-[101px] w-full max-w-[506px] -translate-x-1/2 border-x border-border/45" />
      <div className="absolute top-[100px] left-1/2 h-[101px] w-full max-w-[304px] -translate-x-1/2 border-x border-border/45" />

      {/* ── Dot-block decorations ── */}
      {/* Top-left cluster */}
      <div className="absolute top-[30px] left-1/2 w-full max-w-[1112px] -translate-x-1/2">
        <div className="absolute left-[10px] top-0">
          <DotBlock rows={10} cols={10} seed={101} />
        </div>
        <div className="absolute left-[120px] top-[5px]">
          <DotBlock rows={6} cols={6} seed={102} />
        </div>
        <div className="absolute left-[120px] top-[80px]">
          <DotBlock rows={4} cols={4} seed={103} cellSize={6} gap={2} />
        </div>
      </div>

      {/* Top-right cluster */}
      <div className="absolute top-[30px] left-1/2 w-full max-w-[1112px] -translate-x-1/2">
        <div className="absolute right-[10px] top-0">
          <DotBlock rows={3} cols={8} seed={201} cellSize={6} gap={2} />
        </div>
        <div className="absolute right-[10px] top-[35px]">
          <DotBlock rows={2} cols={12} seed={202} cellSize={4} gap={2} />
        </div>
        <div className="absolute right-[100px] top-[10px]">
          <DotBlock rows={4} cols={4} seed={203} />
        </div>
      </div>

      {/* Mid-left decorations */}
      <div className="absolute top-[250px] left-1/2 w-full max-w-[1314px] -translate-x-1/2">
        <div className="absolute left-[10px] top-0">
          <DotBlock rows={6} cols={6} seed={301} cellSize={6} gap={3} />
        </div>
        <div className="absolute left-[86px] top-[90px] opacity-80">
          <DotBlock rows={2} cols={10} seed={302} cellSize={4} gap={2} />
        </div>
      </div>

      {/* Mid-right decorations */}
      <div className="absolute top-[250px] left-1/2 w-full max-w-[1314px] -translate-x-1/2">
        <div className="absolute right-[10px] top-0">
          <DotBlock rows={5} cols={5} seed={401} cellSize={7} gap={3} />
        </div>
        <div className="absolute right-[86px] top-[90px] opacity-80">
          <DotBlock rows={2} cols={10} seed={402} cellSize={4} gap={2} />
        </div>
      </div>
      </div>
    </div>
  );
}

export function SectionBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
    >
      <div className="absolute top-0 bottom-0 left-4 w-px bg-border/45 lg:hidden" />
      <div className="absolute top-0 bottom-0 right-4 w-px bg-border/45 lg:hidden" />
      <div className="absolute top-1/2 left-4 right-4 h-px bg-border/45 lg:hidden" />
      <CurvyRect className="left-0 top-16 size-[64px] lg:hidden" corners="all" />
      <CurvyRect className="right-0 top-16 size-[64px] lg:hidden" corners="all" />

      <div className="absolute top-1/2 left-1/2 h-px w-[303px] -translate-x-[657px] bg-border/45" />
      <div className="absolute top-1/2 left-1/2 h-px w-[303px] translate-x-[354px] bg-border/45" />

      <div className="absolute top-0 bottom-0 left-1/2 hidden w-full max-w-[1112px] -translate-x-1/2 lg:block">
        <div className="absolute top-24 left-0 h-px w-[202px] bg-border/45" />
        <div className="absolute top-24 right-0 h-px w-[202px] bg-border/45" />
        <div className="absolute bottom-24 left-0 h-px w-[202px] bg-border/45" />
        <div className="absolute bottom-24 right-0 h-px w-[202px] bg-border/45" />

        <CurvyRect className="left-0 top-10 size-[96px]" corners="all" />
        <CurvyRect className="right-0 top-16 size-[96px]" corners="all" />
        <CurvyRect className="left-0 bottom-16 size-[96px]" corners="all" />
        <CurvyRect className="right-0 bottom-10 size-[96px]" corners="all" />
        <CurvyRect className="left-[96px] top-1/2 size-[72px] -translate-y-1/2" corners="all" />
        <CurvyRect className="right-[96px] top-1/2 size-[72px] -translate-y-1/2" corners="all" />

        <StarMark className="absolute left-[96px] top-24 opacity-85" />
        <StarMark className="absolute right-[96px] top-24 opacity-85" />
        <StarMark className="absolute left-[150px] bottom-20 scale-[0.72] opacity-80" />
        <StarMark className="absolute right-[150px] bottom-20 scale-[0.72] opacity-80" />

        <div className="absolute left-8 top-8 opacity-75">
          <DotBlock rows={5} cols={8} seed={904} cellSize={6} gap={2} />
        </div>
        <div className="absolute right-12 top-20 opacity-70">
          <DotBlock rows={4} cols={6} seed={905} cellSize={7} gap={3} />
        </div>
        <div className="absolute left-20 bottom-12 opacity-70">
          <DotBlock rows={3} cols={9} seed={906} cellSize={5} gap={2} />
        </div>
        <div className="absolute left-[180px] top-1/2 -translate-y-1/2 opacity-80">
          <DotBlock rows={3} cols={12} seed={907} cellSize={4} gap={2} />
        </div>
        <div className="absolute right-[180px] top-1/2 -translate-y-1/2 opacity-80">
          <DotBlock rows={3} cols={12} seed={908} cellSize={4} gap={2} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page-level structural overlay (Firecrawl-style)                   */
/*  Persistent vertical column borders visible across all sections    */
/* ------------------------------------------------------------------ */

export function PageOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden="true">
      <div className="absolute top-[52px] bottom-0 left-4 w-px bg-border/45 lg:hidden" />
      <div className="absolute top-[52px] bottom-0 right-4 w-px bg-border/45 lg:hidden" />

      {/* Outer columns - max content width */}
      <div className="absolute top-[52px] bottom-0 left-1/2 hidden w-full max-w-[1314px] -translate-x-1/2 border-x border-border/45 lg:block" />

      {/* Inner columns - content width */}
      <div className="absolute top-[52px] bottom-0 left-1/2 hidden w-full max-w-[1112px] -translate-x-1/2 border-x border-border/45 lg:block" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section divider with index number                                 */
/* ------------------------------------------------------------------ */
interface SectionDividerProps {
  index: number;
  total: number;
  label: string;
}

export function SectionDivider({ index, total, label }: SectionDividerProps) {
  const idx = String(index).padStart(2, "0");
  const tot = String(total).padStart(2, "0");
  return (
    <div className="border-y border-border/45">
      <div className="flex w-full justify-center px-4 py-6 sm:px-6 lg:px-0">
        <div className="relative flex w-full max-w-[1112px] items-center gap-3 lg:px-16">
          <span className="inline-block h-5 w-0.5 bg-primary" />
          <span className="font-mono text-xs tracking-wider text-muted-foreground">
            [ <span className="text-primary">{idx}</span> / {tot} ] &middot;{" "}
            <span className="uppercase">{label}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header (centered label + headline + subtitle)             */
/* ------------------------------------------------------------------ */
interface SectionHeaderProps {
  decorator: string;
  headline: React.ReactNode;
  subtitle?: string;
}

export function SectionHeader({ decorator, headline, subtitle }: SectionHeaderProps) {
  return (
    <div className="relative flex flex-col items-center gap-4 py-20 text-center lg:py-24">
      <div className="absolute left-2 top-1/2 hidden -translate-y-1/2 lg:block">
        <DotBlock rows={4} cols={6} seed={1401} cellSize={4} gap={2} />
      </div>
      <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 lg:block">
        <DotBlock rows={4} cols={6} seed={1402} cellSize={4} gap={2} />
      </div>
      <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
        // {decorator} \\
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {headline}
      </h2>
      {subtitle && (
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
