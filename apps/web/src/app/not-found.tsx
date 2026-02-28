"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Terminal } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (same as grid-background)                              */
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
/*  Dot block decoration                                               */
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
/*  Broken graph — disconnected skill nodes                            */
/* ------------------------------------------------------------------ */
function BrokenGraph({ className, mirror }: { className?: string; mirror?: boolean }) {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={mirror ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* connected edge */}
      <line x1="12" y1="12" x2="12" y2="40" stroke="var(--border)" strokeOpacity="0.5" />
      <line x1="12" y1="40" x2="40" y2="40" stroke="var(--border)" strokeOpacity="0.4" />
      {/* broken edge — dashed */}
      <line
        x1="40"
        y1="40"
        x2="68"
        y2="68"
        stroke="var(--primary)"
        strokeOpacity="0.25"
        strokeDasharray="3 4"
      />
      {/* nodes */}
      <rect x="8" y="8" width="8" height="8" fill="var(--primary)" fillOpacity="0.6" />
      <rect x="8" y="36" width="8" height="8" fill="var(--border)" fillOpacity="0.5" />
      <rect x="36" y="36" width="8" height="8" fill="var(--primary)" fillOpacity="0.5" />
      {/* disconnected node — pulsing in CSS */}
      <rect
        x="64"
        y="64"
        width="8"
        height="8"
        fill="var(--primary)"
        fillOpacity="0.3"
        className="animate-pulse"
      />
      {/* small orphan */}
      <rect x="56" y="12" width="6" height="6" fill="var(--border)" fillOpacity="0.25" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Glitch text — scrambles between random chars and target             */
/* ------------------------------------------------------------------ */
function GlitchText({ text, className }: { text: string; className?: string }) {
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEF";
  const [display, setDisplay] = useState(text);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const maxFrames = 18;
    const interval = setInterval(() => {
      frame++;
      if (frame >= maxFrames) {
        setDisplay(text);
        setSettled(true);
        clearInterval(interval);
        return;
      }
      setDisplay(
        text
          .split("")
          .map((ch, i) => {
            if (frame > maxFrames - 6 + i * 2) return ch;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join(""),
      );
    }, 60);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span className={className} data-settled={settled}>
      {display}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Terminal log lines                                                  */
/* ------------------------------------------------------------------ */
function TerminalLines() {
  const lines = useMemo(
    () => [
      { prefix: "$", text: "bs vibes --check", delay: 0.3 },
      { prefix: "ERR", text: "panic: page went mass extinct", delay: 0.55 },
      { prefix: "ERR", text: "have you tried turning the internet off and on", delay: 0.75 },
      { prefix: "~", text: "hint: skill issue (literally)", delay: 0.95 },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-1.5 font-mono text-[11px] leading-relaxed sm:text-xs">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: line.delay }}
          className="flex gap-2"
        >
          <span
            className={
              line.prefix === "ERR"
                ? "text-destructive/80"
                : line.prefix === "$"
                  ? "text-primary/60"
                  : "text-muted-foreground/50"
            }
          >
            {line.prefix}
          </span>
          <span className="text-muted-foreground">{line.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  404 page                                                           */
/* ------------------------------------------------------------------ */
export default function NotFound() {
  return (
    <main className="relative flex min-h-[calc(100vh-52px)] flex-col items-center justify-center overflow-hidden">
      {/* ── Structural background ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Mobile frame */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-0 bottom-0 left-4 w-px bg-border/40" />
          <div className="absolute top-0 bottom-0 right-4 w-px bg-border/40" />
          <div className="absolute top-[120px] left-4 right-4 h-px bg-border/40" />
          <div className="absolute bottom-[120px] left-4 right-4 h-px bg-border/40" />
          <div className="absolute left-5 top-8 opacity-65">
            <DotBlock rows={3} cols={4} seed={404} cellSize={4} gap={2} />
          </div>
          <div className="absolute right-5 top-8 opacity-65">
            <DotBlock rows={3} cols={4} seed={405} cellSize={4} gap={2} />
          </div>
          <div className="absolute left-5 bottom-[140px] opacity-60">
            <BrokenGraph />
          </div>
          <div className="absolute right-5 bottom-[140px] opacity-60">
            <BrokenGraph mirror />
          </div>
        </div>

        {/* Desktop frame */}
        <div className="absolute inset-0 hidden lg:block">
          {/* Outer 1314px columns */}
          <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[1314px] -translate-x-1/2">
            <span className="absolute top-6 -left-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
              [ NULL ]
            </span>
            <span className="absolute top-6 -right-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
              [ VOID ]
            </span>
            <span className="absolute bottom-6 -left-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
              [ 0x00 ]
            </span>
            <span className="absolute bottom-6 -right-1 w-[102px] select-none text-center font-mono text-[10px] tracking-widest text-muted-foreground/45">
              [ LOST ]
            </span>

            {/* Horizontal rules */}
            <div className="absolute top-[100px] left-0 h-px w-[303px] bg-border/40" />
            <div className="absolute top-[100px] right-0 h-px w-[303px] bg-border/40" />
            <div className="absolute top-[200px] left-0 h-px w-[200px] bg-border/30" />
            <div className="absolute top-[200px] right-0 h-px w-[200px] bg-border/30" />
            <div className="absolute bottom-[100px] left-0 h-px w-[303px] bg-border/40" />
            <div className="absolute bottom-[100px] right-0 h-px w-[303px] bg-border/40" />
            <div className="absolute bottom-[200px] left-0 h-px w-[200px] bg-border/30" />
            <div className="absolute bottom-[200px] right-0 h-px w-[200px] bg-border/30" />

            {/* Intersection nodes */}
            {[100, 200].map((y) => (
              <span
                key={`l-${y}`}
                className="pointer-events-none absolute block bg-border/55"
                style={{ width: 6, height: 6, left: -3, top: y - 3 }}
              />
            ))}
            {[100, 200].map((y) => (
              <span
                key={`r-${y}`}
                className="pointer-events-none absolute block bg-border/55"
                style={{ width: 6, height: 6, right: -3, top: y - 3 }}
              />
            ))}
          </div>

          {/* Inner 1112px columns */}
          <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[1112px] -translate-x-1/2">
            {/* Dot block decorations */}
            <div className="absolute left-[10px] top-[30px]">
              <DotBlock rows={8} cols={8} seed={4041} />
            </div>
            <div className="absolute right-[10px] top-[30px]">
              <DotBlock rows={6} cols={6} seed={4042} />
            </div>
            <div className="absolute left-[10px] bottom-[30px]">
              <DotBlock rows={4} cols={10} seed={4043} cellSize={6} gap={2} />
            </div>
            <div className="absolute right-[10px] bottom-[30px]">
              <DotBlock rows={4} cols={10} seed={4044} cellSize={6} gap={2} />
            </div>

            {/* Broken graph decorations */}
            <div className="absolute left-[20px] top-[130px] opacity-70">
              <BrokenGraph />
            </div>
            <div className="absolute right-[20px] top-[130px] opacity-70">
              <BrokenGraph mirror />
            </div>
            <div className="absolute left-[80px] bottom-[130px] opacity-55">
              <BrokenGraph />
            </div>
            <div className="absolute right-[80px] bottom-[130px] opacity-55">
              <BrokenGraph mirror />
            </div>
          </div>

          {/* 910px + 708px column borders */}
          <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[910px] -translate-x-1/2 border-x border-border/40" />
          <div className="absolute top-0 bottom-0 left-1/2 w-full max-w-[708px] -translate-x-1/2 border-x border-border/40">
            {/* Accent marks */}
            <span className="pointer-events-none absolute top-[100px] -left-[6px] z-[2] block size-3 -translate-y-1/2 bg-amber-400/90" />
            <span className="pointer-events-none absolute top-[100px] -right-[6px] z-[2] block size-3 -translate-y-1/2 bg-amber-400/90" />
            <div className="absolute top-[100px] left-0 h-px w-full bg-border/40" />
            <div className="absolute bottom-[100px] left-0 h-px w-full bg-border/40" />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex w-full justify-center px-4 sm:px-6 lg:px-0">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-[11px] font-mono uppercase tracking-[0.08em] text-primary"
          >
            // Node Not Found \\
          </motion.p>

          {/* Big 404 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <h1 className="font-mono text-[120px] font-bold leading-none tracking-tighter text-foreground sm:text-[160px] md:text-[200px]">
              <GlitchText text="404" />
            </h1>

            {/* Structural overlay on the number */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {/* Scan line */}
              <div className="absolute top-1/2 left-0 h-px w-full bg-primary/20" />
              {/* Corner brackets */}
              <div className="absolute top-2 left-2 h-4 w-px bg-border/60" />
              <div className="absolute top-2 left-2 h-px w-4 bg-border/60" />
              <div className="absolute top-2 right-2 h-4 w-px bg-border/60" />
              <div className="absolute top-2 right-2 h-px w-4 bg-border/60" />
              <div className="absolute bottom-2 left-2 h-4 w-px bg-border/60" />
              <div className="absolute bottom-2 left-2 h-px w-4 bg-border/60" />
              <div className="absolute bottom-2 right-2 h-4 w-px bg-border/60" />
              <div className="absolute bottom-2 right-2 h-px w-4 bg-border/60" />
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Skill graph interrupted
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Whatever was here, it&rsquo;s gone now. Probably vibing somewhere we can&rsquo;t
              reach.
            </p>
          </motion.div>

          {/* Terminal block */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.35 }}
            className="relative w-full max-w-md border border-border/70 bg-background/85 px-5 py-4 text-left backdrop-blur-sm"
          >
            {/* Terminal header */}
            <div className="mb-3 flex items-center gap-2 border-b border-border/50 pb-2.5">
              <Terminal className="size-3 text-muted-foreground/60" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
                diagnostic
              </span>
            </div>

            <TerminalLines />

            {/* Inner corner accents */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute top-2 left-2 h-px w-3 bg-border/40" />
              <div className="absolute top-2 left-2 h-3 w-px bg-border/40" />
              <div className="absolute top-2 right-2 h-px w-3 bg-border/40" />
              <div className="absolute top-2 right-2 h-3 w-px bg-border/40" />
              <div className="absolute bottom-2 left-2 h-px w-3 bg-border/40" />
              <div className="absolute bottom-2 left-2 h-3 w-px bg-border/40" />
              <div className="absolute bottom-2 right-2 h-px w-3 bg-border/40" />
              <div className="absolute bottom-2 right-2 h-3 w-px bg-border/40" />
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex flex-col items-center gap-3 sm:flex-row"
          >
            <Button size="lg" className="h-11 gap-2 px-7 text-sm" render={<Link href="/" />}>
              <ArrowLeft className="size-3.5" data-icon="inline-start" />
              Back to home
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 px-7 text-sm"
              render={<Link href="/skills" />}
            >
              Browse skills
            </Button>
          </motion.div>

          {/* Bottom decorative label */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="font-mono text-[10px] tracking-widest text-muted-foreground/35"
          >
            [ <span className="text-primary/40">00</span> / 00 ] &middot; UNREACHABLE
          </motion.span>
        </div>
      </div>
    </main>
  );
}
