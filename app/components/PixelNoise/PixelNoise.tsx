'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { BufferAttribute as BufferAttributeType } from 'three';
import { createNoise3D } from 'simplex-noise';
import styles from './PixelNoise.module.css';

const SPACING = 0.6;
const POINT_SIZE = 0.8;
const MAX_POINTS = 60_000;
const NOISE_TIME_SPEED = 0.1;
const RECOLOR_STRIDE = 1;
const INVALIDATE_INTERVAL_MS = 30;

type RGB = { r: number; g: number; b: number };

const FALLBACK_PALETTE: RGB[] = [
  { r: 0.95, g: 0.93, b: 0.86 }, // cream
  { r: 0.89, g: 0.35, b: 0.15 }, // orange
  { r: 0.65, g: 0.71, b: 0.64 }, // sage
  { r: 0.5647, g: 0.5647, b: 0.5647 }, // near-black
];

// in the same order as the palette (cream, accent, gray, dark) — must sum to 1.
// cream (--gray-100) is the same token as .root's background, so its weight
// directly controls how many pixels visually merge with the page; dark (near-
// black) outweighs accent so it reads more often than the orange/purple highlight
const PALETTE_WEIGHTS = [0.36, 0.08, 0.26, 0.30];

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reducedMotion;
}

function hexToRgb(hex: string): RGB | null {
  const match = hex.trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function readPaletteFromCSS(): RGB[] {
  const styleMap = getComputedStyle(document.documentElement);
  const read = (name: string) => hexToRgb(styleMap.getPropertyValue(name));
  return [
    read('--gray-300'),
    read('--accent'),
    read('--gray-100'),
    read('--gray-900'),
  ].filter((color): color is RGB => color !== null);
}

function usePalette(): RGB[] {
  const [palette, setPalette] = useState<RGB[]>(FALLBACK_PALETTE);

  useEffect(() => {
    const sync = () => {
      const resolved = readPaletteFromCSS();
      if (resolved.length > 0) setPalette(resolved);
    };

    sync();

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributeFilter: ['data-theme'] });

    return () => {
      query.removeEventListener('change', sync);
      observer.disconnect();
    };
  }, []);

  return palette;
}

function buildGrid(viewportWidth: number, viewportHeight: number) {
  const cols = Math.max(1, Math.floor(viewportWidth / SPACING) + 2);
  const rows = Math.max(1, Math.floor(viewportHeight / SPACING) + 2);
  const total = Math.min(cols * rows, MAX_POINTS);
  const stride = Math.max(1, Math.ceil((cols * rows) / total));

  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const gridX = new Float32Array(total);
  const gridY = new Float32Array(total);

  let count = 0;
  for (let i = 0; i < cols * rows && count < total; i += stride) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - cols / 2) * SPACING;
    const y = (row - rows / 2) * SPACING;

    positions[count * 3] = x;
    positions[count * 3 + 1] = y;
    positions[count * 3 + 2] = 0;
    gridX[count] = x;
    gridY[count] = y;
    count++;
  }

  return { positions, colors, gridX, gridY, count };
}

const noise3D = createNoise3D();

function hash(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function bandFor(noiseValue: number, palette: RGB[]) {
  const normalized = (noiseValue + 1) / 2;
  const weights = PALETTE_WEIGHTS.length === palette.length
    ? PALETTE_WEIGHTS
    : palette.map(() => 1 / palette.length);

  let cumulative = 0;
  for (let i = 0; i < palette.length; i++) {
    cumulative += weights[i];
    if (normalized <= cumulative) return palette[i];
  }
  return palette[palette.length - 1];
}

function PixelGrid({ palette }: { palette: RGB[] }) {
  const { viewport, invalidate } = useThree();
  const colorAttrRef = useRef<BufferAttributeType>(null);
  const cursor = useRef(0);

  const { positions, colors, gridX, gridY, count } = useMemo(
    () => buildGrid(viewport.width, viewport.height),
    [viewport.width, viewport.height],
  );

  useEffect(() => {
    const id = window.setInterval(invalidate, INVALIDATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [invalidate]);

  useFrame(({ clock }) => {
    const colorAttr = colorAttrRef.current;
    if (!colorAttr) return;

    const t = clock.elapsedTime * NOISE_TIME_SPEED;
    for (let i = cursor.current; i < count; i += RECOLOR_STRIDE) {
      const x = gridX[i];
      const y = gridY[i];
      const tp = t + hash(x, y) * 5;
      // low-frequency, slow-moving layer — defines broad cluster regions
      const nCluster = noise3D(x * 0.022, y * 0.022, tp * 0.5);
      const n1 = noise3D(x * 0.15, y * 0.15, tp);
      const n2 = noise3D(x * 0.35 + 50, y * 0.35 + 50, tp * 1.6);
      const n = nCluster * 0.62 + n1 * 0.26 + n2 * 0.12;
      const c = bandFor(n, palette);
      colorAttr.array[i * 3] = c.r;
      colorAttr.array[i * 3 + 1] = c.g;
      colorAttr.array[i * 3 + 2] = c.b;
    }
    cursor.current = (cursor.current + 1) % RECOLOR_STRIDE;
    colorAttr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute ref={colorAttrRef} attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={POINT_SIZE} vertexColors />
    </points>
  );
}

export default function PixelNoise() {
  const reducedMotion = usePrefersReducedMotion();
  const palette = usePalette();

  return (
    <>
      <div className={styles.root}>
        {!reducedMotion && (
          <Canvas
            className={styles.canvas}
            camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 6.45] }}
            dpr={[1, 2]}
            gl={{ antialias: false }}
            frameloop="demand"
            flat
          >
            <PixelGrid palette={palette} />
          </Canvas>
        )}
      </div>
    </>
  );
}
