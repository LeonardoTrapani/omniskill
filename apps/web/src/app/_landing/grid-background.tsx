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

/** Accent node — larger amber square used as focus marker */
function AccentMark({ className }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute z-100 block size-3 bg-amber-400/90 ${className ?? ""}`}
      aria-hidden="true"
    />
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

/**
 * Place a graph-like node at an absolute intersection point.
 * `which` is kept only for call-site compatibility in the hero map.
 */
function Intersection({
  x,
  y,
  which,
}: {
  x: string;
  y: string;
  which: ("tl" | "tr" | "bl" | "br")[];
}) {
  const size = 6;
  const _shape = which;
  return (
    <span
      className="pointer-events-none absolute block bg-border/55"
      style={{
        width: size,
        height: size,
        left: `calc(${x} - ${size / 2}px)`,
        top: `calc(${y} - ${size / 2}px)`,
      }}
      data-shape={_shape.length}
      aria-hidden="true"
    />
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
        <div className="absolute top-0 bottom-0 left-4 w-px bg-border/40" />
        <div className="absolute top-0 bottom-0 right-4 w-px bg-border/40" />
        <div className="absolute top-[96px] left-4 right-4 h-px bg-border/40" />
        <div className="absolute top-[196px] left-4 right-4 h-px bg-border/40" />
        <AccentMark className="absolute left-4 top-[196px] -translate-x-1/2 -translate-y-1/2" />
        <AccentMark className="absolute right-4 top-[196px] translate-x-1/2 -translate-y-1/2" />
        <Intersection x="1rem" y="96px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="calc(100% - 1rem)" y="96px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="1rem" y="196px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="calc(100% - 1rem)" y="196px" which={["tl", "tr", "bl", "br"]} />
        <div className="absolute left-4 top-8 opacity-75">
          <DotBlock rows={4} cols={5} seed={2201} cellSize={4} gap={2} />
        </div>
        <div className="absolute right-4 top-8 opacity-75">
          <DotBlock rows={4} cols={5} seed={2202} cellSize={4} gap={2} />
        </div>
        {/* Small graph accents on mobile */}
        <div className="absolute left-5 bottom-[120px] opacity-65">
          <SkillGraph variant="b" />
        </div>
        <div className="absolute right-5 bottom-[120px] opacity-65">
          <SkillGraph variant="b" mirror />
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

        {/* Horizontal rules — left side */}
        <div className="absolute top-[100px] left-0 h-px w-[303px] bg-border/40" />
        <div className="absolute top-[200px] left-0 h-px w-[303px] bg-border/40" />
        <div className="absolute top-[300px] left-0 h-px w-[303px] bg-border/40" />
        <div className="absolute top-[400px] left-0 h-px w-[303px] bg-border/40" />
        {/* Horizontal rules — right side */}
        <div className="absolute top-[100px] right-0 h-px w-[303px] bg-border/40" />
        <div className="absolute top-[200px] right-0 h-px w-[303px] bg-border/40" />
        <div className="absolute top-[300px] right-0 h-px w-[303px] bg-border/40" />
        <div className="absolute top-[400px] right-0 h-px w-[303px] bg-border/40" />

        {/*
         * Intersections along 1314px edges (left=0, right=100%).
         * The 1314px vertical lines meet h-lines at y=100,200,300,400.
         * These are T-intersections (line ends at edge), so 2 corners each.
         */}
        {/* Left edge × h-lines: tr + br (line comes from the right) */}
        <Intersection x="0px" y="100px" which={["tr", "br"]} />
        <Intersection x="0px" y="200px" which={["tr", "br"]} />
        <Intersection x="0px" y="300px" which={["tr", "br"]} />
        <Intersection x="0px" y="400px" which={["tr", "br"]} />
        {/* Right edge × h-lines: tl + bl */}
        <Intersection x="100%" y="100px" which={["tl", "bl"]} />
        <Intersection x="100%" y="200px" which={["tl", "bl"]} />
        <Intersection x="100%" y="300px" which={["tl", "bl"]} />
        <Intersection x="100%" y="400px" which={["tl", "bl"]} />
      </div>

      {/* ── 1112px column ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[1112px] -translate-x-1/2">
        {/* Horizontal rules — left side (reaching inward 202px) */}
        <div className="absolute top-[200px] left-0 h-px w-[202px] bg-border/40" />
        <div className="absolute top-[300px] left-0 h-px w-[202px] bg-border/40" />
        <div className="absolute top-[400px] left-0 h-px w-[202px] bg-border/40" />
        {/* Horizontal rules — right side */}
        <div className="absolute top-[200px] right-0 h-px w-[202px] bg-border/40" />
        <div className="absolute top-[300px] right-0 h-px w-[202px] bg-border/40" />
        <div className="absolute top-[400px] right-0 h-px w-[202px] bg-border/40" />

        {/*
         * 1112px vertical edges cross the 1314px h-lines at y=100,200,300,400
         * and also the 1112px h-lines at y=200,300,400.
         *
         * y=100: only 1314px h-line crosses → 4-way
         * y=200,300,400: both 1314px + 1112px h-lines → 4-way
         */}
        {/* Left edge (0px in 1112 container) */}
        <Intersection x="0px" y="100px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="0px" y="200px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="0px" y="300px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="0px" y="400px" which={["tl", "tr", "bl", "br"]} />
        {/* Right edge */}
        <Intersection x="100%" y="100px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="100%" y="200px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="100%" y="300px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="100%" y="400px" which={["tl", "tr", "bl", "br"]} />

        {/*
         * Inner vertical at 101px from each edge of 1112px
         * (= 910px column edges). These cross h-lines at y=100..400 (1314px)
         * and y=200..400 (1112px h-lines reach 202px inward, so they reach 101px).
         *
         * y=100: 1314px h-line reaches 303px into 1314px = 202px into 1112px — crosses 101px ✓
         * y=200,300,400: both 1314px (303px) and 1112px (202px) reach past 101px ✓
         */}
        <Intersection x="101px" y="100px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="101px" y="200px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="101px" y="300px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="101px" y="400px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="calc(100% - 101px)" y="100px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="calc(100% - 101px)" y="200px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="calc(100% - 101px)" y="300px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="calc(100% - 101px)" y="400px" which={["tl", "tr", "bl", "br"]} />

        {/*
         * Inner vertical at 202px from each edge of 1112px
         * (end of 1112px h-lines). The 1314px h-lines extend 303px into 1314px = 202px into 1112px,
         * so they also reach this point.
         * y=100: 1314px h-line reaches 202px ✓ → T-intersection (h-line ends)
         * y=200,300,400: 1112px h-line ends here + 1314px h-line passes → T-intersection
         */}
        <Intersection x="202px" y="100px" which={["tl", "bl"]} />
        <Intersection x="202px" y="200px" which={["tl", "bl"]} />
        <Intersection x="202px" y="300px" which={["tl", "bl"]} />
        <Intersection x="202px" y="400px" which={["tl", "bl"]} />
        <Intersection x="calc(100% - 202px)" y="100px" which={["tr", "br"]} />
        <Intersection x="calc(100% - 202px)" y="200px" which={["tr", "br"]} />
        <Intersection x="calc(100% - 202px)" y="300px" which={["tr", "br"]} />
        <Intersection x="calc(100% - 202px)" y="400px" which={["tr", "br"]} />
      </div>

      {/* ── 910px column ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[910px] -translate-x-1/2 border-x border-border/40" />

      {/* ── 708px column ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[708px] -translate-x-1/2 border-x border-border/40">
        {/* Accent marks aligned to hero frame edge */}
        <AccentMark className="absolute top-[200px] -left-[6px] -translate-y-1/2 z-[2]" />
        <AccentMark className="absolute top-[200px] -right-[6px] -translate-y-1/2 z-[2]" />
        {/* Full-width h-lines at y=100 and y=200 */}
        <div className="absolute top-[100px] left-0 h-px w-full bg-border/40" />
        <div className="absolute top-[200px] left-0 h-px w-full bg-border/40" />
        {/* 708px edges × y=100: 4-way crossing (h-line spans full width) */}
        <Intersection x="0px" y="100px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="100%" y="100px" which={["tl", "tr", "bl", "br"]} />
        {/* 708px edges × y=200: 4-way crossing */}
        <Intersection x="0px" y="200px" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="100%" y="200px" which={["tl", "tr", "bl", "br"]} />
        {/* Bottom column endpoints as graph nodes */}
        <Intersection x="0px" y="100%" which={["tl", "tr", "bl", "br"]} />
        <Intersection x="100%" y="100%" which={["tl", "tr", "bl", "br"]} />
      </div>

      {/* ── Narrower inner columns (visible y=100–201) ── */}
      <div className="absolute top-[100px] left-1/2 h-[101px] w-full max-w-[506px] -translate-x-1/2 border-x border-border/40">
        {/* 506px edges × y=100: T-intersection (column starts) → bl + br */}
        <Intersection x="0px" y="0px" which={["bl", "br"]} />
        <Intersection x="100%" y="0px" which={["bl", "br"]} />
        {/* 506px edges × y=201: T-intersection (column ends) → tl + tr */}
        <Intersection x="0px" y="100%" which={["tl", "tr"]} />
        <Intersection x="100%" y="100%" which={["tl", "tr"]} />
      </div>
      <div className="absolute top-[100px] left-1/2 h-[101px] w-full max-w-[304px] -translate-x-1/2 border-x border-border/40">
        <Intersection x="0px" y="0px" which={["bl", "br"]} />
        <Intersection x="100%" y="0px" which={["bl", "br"]} />
        <Intersection x="0px" y="100%" which={["tl", "tr"]} />
        <Intersection x="100%" y="100%" which={["tl", "tr"]} />
      </div>

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

      {/* ── Graph patterns — placed inside the grid cells, between rows ── */}
      <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[1112px] -translate-x-1/2">
        {/* Left gutter: centered within the 101px cells */}
        <div className="absolute left-[30px] top-[120px] opacity-70">
          <SkillGraph variant="a" />
        </div>
        <div className="absolute left-[115px] top-[225px] opacity-60">
          <SkillGraph variant="c" />
        </div>
        <div className="absolute left-[30px] top-[330px] opacity-55">
          <SkillGraph variant="b" />
        </div>

        {/* Right gutter: mirrored */}
        <div className="absolute right-[30px] top-[120px] opacity-70">
          <SkillGraph variant="a" mirror />
        </div>
        <div className="absolute right-[115px] top-[225px] opacity-60">
          <SkillGraph variant="c" mirror />
        </div>
        <div className="absolute right-[30px] top-[330px] opacity-55">
          <SkillGraph variant="b" mirror />
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * SkillGraph — a compact graph diagram with square nodes + orthogonal edges.
 * Sized to fit cleanly inside the grid gutters without overlapping rules.
 */
function SkillGraph({
  className,
  mirror = false,
  variant = "a",
  size = "sm",
}: {
  className?: string;
  mirror?: boolean;
  variant?: "a" | "b" | "c";
  size?: "sm" | "md";
}) {
  const s = size === "md" ? 1.25 : 1;
  const nodeSize = 6 * s;

  const graphs = {
    /* L-shape: 3 nodes */
    a: {
      w: 36 * s,
      h: 30 * s,
      content: (
        <>
          <line x1={4 * s} y1={4 * s} x2={4 * s} y2={26 * s} stroke="var(--border)" strokeOpacity="0.52" />
          <line x1={4 * s} y1={26 * s} x2={32 * s} y2={26 * s} stroke="var(--border)" strokeOpacity="0.45" />
          <rect x={1 * s} y={1 * s} width={nodeSize} height={nodeSize} fill="var(--primary)" fillOpacity="0.65" />
          <rect x={1 * s} y={23 * s} width={nodeSize} height={nodeSize} fill="var(--border)" fillOpacity="0.55" />
          <rect x={29 * s} y={23 * s} width={nodeSize} height={nodeSize} fill="var(--primary)" fillOpacity="0.55" />
        </>
      ),
    },
    /* Staircase: 3 nodes */
    b: {
      w: 32 * s,
      h: 32 * s,
      content: (
        <>
          <line x1={4 * s} y1={4 * s} x2={4 * s} y2={17 * s} stroke="var(--border)" strokeOpacity="0.5" />
          <line x1={4 * s} y1={17 * s} x2={28 * s} y2={17 * s} stroke="var(--border)" strokeOpacity="0.45" />
          <line x1={28 * s} y1={17 * s} x2={28 * s} y2={28 * s} stroke="var(--border)" strokeOpacity="0.4" />
          <rect x={1 * s} y={1 * s} width={nodeSize} height={nodeSize} fill="var(--primary)" fillOpacity="0.6" />
          <rect x={1 * s} y={14 * s} width={nodeSize} height={nodeSize} fill="var(--border)" fillOpacity="0.48" />
          <rect x={25 * s} y={25 * s} width={nodeSize} height={nodeSize} fill="var(--primary)" fillOpacity="0.5" />
        </>
      ),
    },
    /* T-shape: 3 nodes */
    c: {
      w: 36 * s,
      h: 28 * s,
      content: (
        <>
          <line x1={4 * s} y1={4 * s} x2={32 * s} y2={4 * s} stroke="var(--border)" strokeOpacity="0.5" />
          <line x1={18 * s} y1={4 * s} x2={18 * s} y2={24 * s} stroke="var(--border)" strokeOpacity="0.42" />
          <rect x={1 * s} y={1 * s} width={nodeSize} height={nodeSize} fill="var(--primary)" fillOpacity="0.6" />
          <rect x={29 * s} y={1 * s} width={nodeSize} height={nodeSize} fill="var(--border)" fillOpacity="0.5" />
          <rect x={15 * s} y={21 * s} width={nodeSize} height={nodeSize} fill="var(--primary)" fillOpacity="0.48" />
        </>
      ),
    },
  };

  const g = graphs[variant];

  return (
    <svg
      width={g.w}
      height={g.h}
      viewBox={`0 0 ${g.w} ${g.h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    >
      {g.content}
    </svg>
  );
}

/**
 * SectionBackdrop — decorative background for landing sections.
 * `variant` gives each section a distinct but cohesive look.
 */
export function SectionBackdrop({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "how-it-works" | "features" | "pricing" | "cli-demo";
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
      aria-hidden="true"
    >
      {/* ── Mobile decorations ── */}
      <div className="lg:hidden">
        {/* Structural lines */}
        <div className="absolute top-0 bottom-0 left-4 w-px bg-border/45" />
        <div className="absolute top-0 bottom-0 right-4 w-px bg-border/45" />
        <div className="absolute top-1/2 left-4 right-4 h-px bg-border/45" />

        {/* Graph accents — mobile */}
        <div className="absolute left-6 top-20 opacity-70">
          <SkillGraph variant="a" />
        </div>
        <div className="absolute right-6 top-20 opacity-70">
          <SkillGraph variant="a" mirror />
        </div>

        {/* Corner brackets — mobile */}
        <CurvyRect className="left-0 top-14 size-[48px]" corners={["tl", "bl"]} />
        <CurvyRect className="right-0 top-14 size-[48px]" corners={["tr", "br"]} />

        {/* Extra mobile-only elements per variant */}
        {variant === "features" && (
          <>
            <div className="absolute left-6 bottom-16 opacity-55">
              <SkillGraph variant="b" />
            </div>
            <div className="absolute right-6 bottom-16 opacity-55">
              <SkillGraph variant="c" mirror />
            </div>
          </>
        )}
        {variant === "how-it-works" && (
          <>
            <div className="absolute right-7 bottom-20 opacity-60">
              <SkillGraph variant="b" mirror />
            </div>
            <DotBlock rows={3} cols={4} seed={7701} cellSize={3} gap={2} className="absolute left-6 bottom-24 opacity-50" />
          </>
        )}
        {variant === "pricing" && (
          <>
            <div className="absolute left-6 bottom-20 opacity-55">
              <SkillGraph variant="c" />
            </div>
            <DotBlock rows={2} cols={5} seed={7702} cellSize={3} gap={2} className="absolute right-7 bottom-28 opacity-45" />
          </>
        )}
        {variant === "cli-demo" && (
          <div className="absolute right-6 bottom-16 opacity-55">
            <SkillGraph variant="b" mirror />
          </div>
        )}
      </div>

      {/* ── Desktop decorations ── */}
      <div className="absolute top-0 bottom-0 left-1/2 hidden w-full max-w-[1112px] -translate-x-1/2 lg:block">
        {/* Horizontal rules — structural rhythm */}
        <div className="absolute top-20 left-0 h-px w-[140px] bg-border/45" />
        <div className="absolute top-20 right-0 h-px w-[140px] bg-border/45" />
        <div className="absolute bottom-20 left-0 h-px w-[140px] bg-border/45" />
        <div className="absolute bottom-20 right-0 h-px w-[140px] bg-border/45" />

        {/* Per-variant graph decorations — positioned cleanly below/above rules */}
        {variant === "default" && (
          <>
            <div className="absolute left-4 top-28 opacity-75">
              <SkillGraph variant="a" size="md" />
            </div>
            <div className="absolute right-4 top-28 opacity-75">
              <SkillGraph variant="a" size="md" mirror />
            </div>
            <div className="absolute left-6 bottom-28 opacity-65">
              <SkillGraph variant="b" />
            </div>
            <div className="absolute right-6 bottom-28 opacity-65">
              <SkillGraph variant="b" mirror />
            </div>
          </>
        )}
        {variant === "features" && (
          <>
            <div className="absolute left-4 top-28 opacity-70">
              <SkillGraph variant="a" size="md" />
            </div>
            <div className="absolute right-4 top-28 opacity-70">
              <SkillGraph variant="c" size="md" mirror />
            </div>
            <div className="absolute left-8 bottom-28 opacity-60">
              <SkillGraph variant="c" />
            </div>
            <div className="absolute right-8 bottom-28 opacity-60">
              <SkillGraph variant="b" mirror />
            </div>
            <DotBlock rows={3} cols={5} seed={5501} cellSize={4} gap={2} className="absolute left-[60px] top-24 opacity-40" />
            <DotBlock rows={3} cols={5} seed={5502} cellSize={4} gap={2} className="absolute right-[60px] top-24 opacity-40" />
          </>
        )}
        {variant === "how-it-works" && (
          <>
            <div className="absolute left-4 top-28 opacity-75">
              <SkillGraph variant="b" size="md" />
            </div>
            <div className="absolute right-4 top-28 opacity-75">
              <SkillGraph variant="b" size="md" mirror />
            </div>
            <div className="absolute left-6 bottom-28 opacity-60">
              <SkillGraph variant="a" />
            </div>
            <div className="absolute right-6 bottom-28 opacity-60">
              <SkillGraph variant="c" mirror />
            </div>
            <DotBlock rows={3} cols={6} seed={5503} cellSize={4} gap={2} className="absolute left-[50px] bottom-24 opacity-40" />
            <DotBlock rows={3} cols={6} seed={5504} cellSize={4} gap={2} className="absolute right-[50px] bottom-24 opacity-40" />
          </>
        )}
        {variant === "pricing" && (
          <>
            <div className="absolute left-4 top-28 opacity-70">
              <SkillGraph variant="c" size="md" />
            </div>
            <div className="absolute right-4 top-28 opacity-70">
              <SkillGraph variant="a" size="md" mirror />
            </div>
            <div className="absolute left-6 bottom-28 opacity-60">
              <SkillGraph variant="b" />
            </div>
            <div className="absolute right-6 bottom-28 opacity-60">
              <SkillGraph variant="a" mirror />
            </div>
          </>
        )}
        {variant === "cli-demo" && (
          <>
            <div className="absolute left-4 top-28 opacity-70">
              <SkillGraph variant="a" size="md" />
            </div>
            <div className="absolute right-4 top-28 opacity-70">
              <SkillGraph variant="b" size="md" mirror />
            </div>
            <div className="absolute left-8 bottom-28 opacity-55">
              <SkillGraph variant="c" />
            </div>
            <div className="absolute right-8 bottom-28 opacity-55">
              <SkillGraph variant="c" mirror />
            </div>
          </>
        )}
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
      <div className="flex w-full justify-center py-6">
        <div className="relative w-full max-w-[1112px] px-4 sm:px-6 lg:px-0">
          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-primary" />
          <div className="flex items-center gap-3 lg:px-16">
          <span className="font-mono text-xs tracking-wider text-muted-foreground">
            [ <span className="text-primary">{idx}</span> / {tot} ] &middot;{" "}
            <span className="uppercase">{label}</span>
          </span>
          </div>
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
      {/* Desktop: horizontal rails — extend from heading to page edges */}
      <div className="absolute left-0 top-1/2 hidden h-px w-[80px] bg-border/40 lg:block" />
      <div className="absolute left-[80px] top-1/2 hidden size-1.5 -translate-y-1/2 bg-primary/40 lg:block" />
      <div className="absolute right-0 top-1/2 hidden h-px w-[80px] bg-border/40 lg:block" />
      <div className="absolute right-[80px] top-1/2 hidden size-1.5 -translate-y-1/2 bg-primary/40 lg:block" />

      {/* Mobile: shorter rails */}
      <div className="absolute left-0 top-1/2 h-px w-[40px] bg-border/35 lg:hidden" />
      <div className="absolute left-[40px] top-1/2 size-1 -translate-y-1/2 bg-primary/35 lg:hidden" />
      <div className="absolute right-0 top-1/2 h-px w-[40px] bg-border/35 lg:hidden" />
      <div className="absolute right-[40px] top-1/2 size-1 -translate-y-1/2 bg-primary/35 lg:hidden" />

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
