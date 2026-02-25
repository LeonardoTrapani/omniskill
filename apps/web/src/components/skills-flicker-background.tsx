"use client";

import { useEffect, useRef } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-<>?@";
const MAX_FPS = 24;

type Cell = {
  char: string;
  isAccent: boolean;
  duration: number;
  phaseOffset: number;
  opacities: number[];
};

function hash(value: number) {
  let x = value | 0;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return Math.abs(x);
}

export default function SkillsFlickerBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const normalColorRef = useRef<HTMLSpanElement>(null);
  const accentColorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const normalColorEl = normalColorRef.current;
    const accentColorEl = accentColorRef.current;
    if (!container || !canvas || !normalColorEl || !accentColorEl) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let lastFrameTime = 0;
    let width = 0;
    let height = 0;
    let fontSize = 9;
    let cellWidth = 14;
    let cellHeight = 14;
    let cols = 0;
    let rows = 0;
    let paddingX = 32;
    let paddingY = 40;
    let normalColor = "rgba(240, 240, 240, 0.8)";
    let accentColor = "rgba(112, 122, 255, 0.9)";
    let cells: Cell[] = [];

    const readPalette = () => {
      normalColor = getComputedStyle(normalColorEl).color;
      accentColor = getComputedStyle(accentColorEl).color;
    };

    const buildCells = () => {
      const total = cols * rows;
      cells = Array.from({ length: total }, (_, index) => {
        const charSeed = hash(index * 31 + 17);
        const toneSeed = hash(index * 53 + 29);
        const timingSeed = hash(index * 79 + 11);

        const char = CHARSET[charSeed % CHARSET.length] ?? "#";
        const isAccent = toneSeed % 7 === 0;
        const lowOpacity = 0.07 + (toneSeed % 5) * 0.007;
        const highOpacity = lowOpacity + (isAccent ? 0.1 : 0.007);
        const duration = 1.1 + (timingSeed % 14) * 0.08;
        const phaseOffset = ((timingSeed % 36) * 0.11) / duration;

        return {
          char,
          isAccent,
          duration,
          phaseOffset,
          opacities: [
            lowOpacity,
            highOpacity * 0.82,
            lowOpacity,
            highOpacity,
            highOpacity * 0.68,
            lowOpacity,
            highOpacity,
            lowOpacity * 0.95,
          ],
        };
      });
    };

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(Math.floor(rect.width), 1);
      height = Math.max(Math.floor(rect.height), 1);

      const isMobile = width < 768;
      fontSize = isMobile ? 8 : 9;
      paddingX = isMobile ? 16 : 32;
      paddingY = isMobile ? 32 : 40;

      const contentWidth = Math.max(width - paddingX * 2, 1);
      const contentHeight = Math.max(height - paddingY * 2, 1);
      cols = Math.max(Math.round(contentWidth / 16), 24);
      rows = Math.max(Math.round(contentHeight / 16), 18);
      cellWidth = contentWidth / cols;
      cellHeight = contentHeight / rows;

      const dpr = Math.max(Math.min(window.devicePixelRatio || 1, 2), 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace`;

      buildCells();
      readPalette();
    };

    const drawFrame = (time: number) => {
      if (!reducedMotionQuery.matches && time - lastFrameTime < 1000 / MAX_FPS) {
        raf = window.requestAnimationFrame(drawFrame);
        return;
      }

      lastFrameTime = time;
      context.clearRect(0, 0, width, height);

      for (let index = 0; index < cells.length; index += 1) {
        const cell = cells[index];
        const xIndex = index % cols;
        const yIndex = (index / cols) | 0;
        const x = paddingX + (xIndex + 0.5) * cellWidth;
        const y = paddingY + (yIndex + 0.5) * cellHeight;

        let opacity = cell.opacities[0] ?? 0.05;
        if (reducedMotionQuery.matches) {
          opacity = 0.04;
        } else {
          const cycle = (time / 1000 / cell.duration + cell.phaseOffset) % 1;
          const normalized = cycle < 0 ? cycle + 1 : cycle;
          const frameIndex = Math.min(
            (normalized * cell.opacities.length) | 0,
            cell.opacities.length - 1,
          );
          opacity = cell.opacities[frameIndex] ?? opacity;
        }

        context.globalAlpha = opacity;
        context.fillStyle = cell.isAccent ? accentColor : normalColor;
        context.fillText(cell.char, x, y);
      }

      context.globalAlpha = 1;
      raf = window.requestAnimationFrame(drawFrame);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    const onVisibilityChange = () => {
      if (document.hidden) return;
      lastFrameTime = 0;
      readPalette();
    };

    const onColorSchemeChange = () => {
      readPalette();
    };

    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    document.addEventListener("visibilitychange", onVisibilityChange);
    colorScheme.addEventListener("change", onColorSchemeChange);
    reducedMotionQuery.addEventListener("change", onColorSchemeChange);

    updateSize();
    raf = window.requestAnimationFrame(drawFrame);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      colorScheme.removeEventListener("change", onColorSchemeChange);
      reducedMotionQuery.removeEventListener("change", onColorSchemeChange);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <span ref={normalColorRef} className="sr-only text-foreground/80" aria-hidden="true" />
      <span ref={accentColorRef} className="sr-only text-primary/90" aria-hidden="true" />
      <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_58%,var(--background)_98%)]" />
    </div>
  );
}
