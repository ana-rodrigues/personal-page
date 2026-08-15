# Implementation Guide: Noise-Driven Pixel Grid (dottxt.ai-style)

A dense flat grid of colored square points that never move but flicker between
palette colors as a drifting 3D simplex-noise field passes through them —
giving a Game-of-Life / cellular-automaton feel rather than physics. This is
the actual technique used for the animated footer at https://dottxt.ai/,
confirmed by pulling their production JS bundles.

**Core idea:** it is not a physics engine. A single `THREE.Points` cloud
(one point per "pixel") is laid out once in a fixed lattice. Every frame, a
rotating subset of those points gets recolored based on `simplexNoise(x, y,
time)` thresholded into a handful of palette bands. Nothing collides, nothing
falls — cells just change color as the noise field evolves underneath them.

> Superseded approach: an earlier version of this guide assumed a Matter.js
> physics simulation (falling/piling squares). That was wrong — reverse
> engineering dottxt.ai's actual bundle showed no physics engine in the
> footer at all. This guide replaces that one.

---

## 1. Dependencies

```bash
npm install three @react-three/fiber simplex-noise
npm install -D @types/three
```

- `three` — the renderer/scene graph.
- `@react-three/fiber` — React reconciler for three.js (matches dottxt.ai's
  actual stack; also the natural fit for a React/Next.js codebase — declare
  the scene as JSX instead of hand-rolling a render loop).
- `simplex-noise` — small, fast 2D/3D simplex noise implementation. dottxt.ai
  uses an internal noise class with the same `.noise(x, y, z)` signature;
  `simplex-noise`'s `createNoise3D()` is a drop-in equivalent.

No Matter.js, no canvas 2D renderer, no cannon/rapier — this is pure WebGL
via three.js.

---

## 2. Concepts you need before writing code

| Piece | Role |
|---|---|
| `THREE.Points` + `THREE.BufferGeometry` | One draw call renders the entire grid — thousands of "pixels" for the cost of one mesh |
| `position` buffer attribute | Set once at grid-build time; **never mutated** — the grid does not move |
| `color` buffer attribute (`vertexColors: true`) | Mutated every frame for a subset of points — this *is* the animation |
| `PointsMaterial` | `size` sets each point's on-screen size in world units; with no `map` texture, each point renders as a plain square — that's the "pixel" look, free |
| `createNoise3D()` from `simplex-noise` | Samples a smooth 3D noise field at `(x, y, time)` — the "brain" driving which cells light up |
| `useFrame` (from `@react-three/fiber`) | Runs the per-frame recolor pass |
| `frameloop="demand"` + `invalidate()` | Renders only when told to, instead of every browser frame — the throttling mechanism that keeps this cheap |

The look reads as "Game of Life" because noise value bands are mapped to
discrete palette colors with hard thresholds (`smoothstep`/`round`-style cutoffs),
so cells appear to snap between states rather than smoothly crossfade.

---

## 3. Grid layout (build once)

Lay out points on a flat lattice sized to the container's aspect ratio, at a
fixed spacing. dottxt.ai uses spacing `0.16` world units and caps at 100,000
points; scale spacing to taste — smaller spacing = denser "pixels" = more
points = more cost.

```ts
function buildGrid(aspect: number, spacing = 0.16, maxPoints = 100_000) {
  const positions: number[] = [];
  const colors: number[] = [];
  const gridX: number[] = [];
  const gridY: number[] = [];

  const halfWidth = 16 * aspect; // tune to your camera/viewport mapping
  let count = 0;

  for (let x = -halfWidth; x < halfWidth && count < maxPoints; x += 1) {
    for (let y = -16; y < 16 && count < maxPoints; y += 1) {
      const px = spacing * x;
      const py = spacing * y;
      positions.push(px, py, 0);
      colors.push(Math.random(), Math.random(), Math.random()); // placeholder, overwritten frame 1
      gridX.push(px);
      gridY.push(py);
      count++;
    }
  }

  return { positions: new Float32Array(positions), colors: new Float32Array(colors), gridX, gridY, count };
}
```

`gridX`/`gridY` are kept as separate plain arrays (not reread from the
position buffer) so the per-frame noise sampling doesn't have to stride
through interleaved xyz data.

---

## 4. Per-frame recolor pass — the actual animation

Only touch a fraction of the points each frame (round-robin over an index
cursor) rather than all of them — this is dottxt.ai's key perf trick and lets
a 100k-point grid stay cheap.

```ts
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

const PALETTE = [
  { r: 0.95, g: 0.93, b: 0.86 }, // cream
  { r: 0.89, g: 0.35, b: 0.15 }, // orange
  { r: 0.65, g: 0.71, b: 0.64 }, // sage
  { r: 0.09, g: 0.09, b: 0.09 }, // near-black
];

function pickColor(nx: number, ny: number, t: number) {
  const n = noise3D(nx * 0.1, ny * 0.1, t);
  if (n > 0.25 && n < 0.3) return PALETTE[1];
  if (n > 0.15 && n < 0.2) return PALETTE[2];
  if (n > -0.3 && n < -0.25) return PALETTE[0];
  if (n > -0.2 && n < -0.15) return PALETTE[1];
  return PALETTE[3];
}

// inside useFrame(({ clock }) => { ... }):
const t = clock.elapsedTime * 0.1;
const stride = 3; // recolor every 3rd point this frame — tune for perf
for (let i = cursorRef.current; i < count; i += stride) {
  const c = pickColor(gridX[i], gridY[i], t);
  colorAttr.array[i * 3] = c.r;
  colorAttr.array[i * 3 + 1] = c.g;
  colorAttr.array[i * 3 + 2] = c.b;
}
cursorRef.current = (cursorRef.current + 1) % stride;
colorAttr.needsUpdate = true;
```

The exact threshold bands above are reconstructed from dottxt.ai's shader —
treat them as a starting point, not gospel; tune band widths/palette to your
own site's colors.

---

## 5. React version (`@react-three/fiber`), matching this repo's conventions

Adapted to this repo's client-component pattern (see
`app/components/Typewriter/Typewriter.tsx` for the existing
`usePrefersReducedMotion` hook to reuse) and CSS-token palette:

```tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { BufferAttribute } from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

function PixelGrid({ palette }: { palette: { r: number; g: number; b: number }[] }) {
  const { viewport, invalidate } = useThree();
  const positionRef = useRef<BufferAttribute>(null);
  const colorRef = useRef<BufferAttribute>(null);
  const cursor = useRef(0);

  const { positions, colors, gridX, gridY, count } = useMemo(
    () => buildGrid(viewport.width / viewport.height),
    [viewport.width, viewport.height],
  );

  // force a render every 50ms since frameloop="demand" doesn't tick on its own
  useEffect(() => {
    const id = window.setInterval(invalidate, 50);
    return () => window.clearInterval(id);
  }, [invalidate]);

  const stride = 3;
  useFrame(({ clock }) => {
    const colorAttr = colorRef.current;
    if (!colorAttr) return;
    const t = clock.elapsedTime * 0.1;
    for (let i = cursor.current; i < count; i += stride) {
      const n = noise3D(gridX[i] * 0.1, gridY[i] * 0.1, t);
      const band = Math.min(palette.length - 1, Math.floor(((n + 1) / 2) * palette.length));
      const c = palette[band];
      colorAttr.array[i * 3] = c.r;
      colorAttr.array[i * 3 + 1] = c.g;
      colorAttr.array[i * 3 + 2] = c.b;
    }
    cursor.current = (cursor.current + 1) % stride;
    colorAttr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute ref={positionRef} attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute ref={colorRef} attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.32} vertexColors />
    </points>
  );
}

function usePrefersReducedMotion() {
  // identical pattern to app/components/Typewriter/Typewriter.tsx
  const ref = useRef(false);
  // ...see Typewriter.tsx for the full matchMedia + listener implementation
  return ref.current;
}

export default function Footer() {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return <div style={{ width: '100%', height: 220 }} />;

  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 6.45] }}
      dpr={[0.75, 1]}
      frameloop="demand"
      flat
      style={{ width: '100%', height: 220 }}
    >
      <PixelGrid palette={PALETTE} />
    </Canvas>
  );
}
```

Palette should be read from the site's actual CSS custom properties
(`--gray-*`, `--accent-*`) at mount time, converted to `{r,g,b}` 0–1 floats —
same approach as before, just feeding `PALETTE` instead of Matter.js
`fillStyle` strings.

---

## 6. Performance tuning

- **Point count is nearly free; recolor rate is the real cost.** A draw call
  for 100k points is cheap on modern GPUs — the expensive part is the JS loop
  writing into the color buffer every frame. The `stride` round-robin
  (recolor 1/N points per frame) is what keeps that loop cheap; raise
  `stride` on lower-end devices.
- **`frameloop="demand"` + manual `invalidate()` ticking.** react-three-fiber
  by default only renders when something changes; dottxt.ai forces a render
  every 50ms via `setInterval(invalidate, 50)` — an intentional 20fps cap,
  not 60fps, since the noise field doesn't need to update faster than that to
  read as smooth.
- **`dpr` capped low** (`[0.75, 1]`, i.e. *below* 1x on high-DPI screens) —
  unusual but deliberate: a point-grid animation doesn't need per-pixel
  sharpness the way text does, so it's fine to undersample.
- **Safari gets a larger stride** (dottxt.ai triples it) — Safari's WebGL
  buffer-upload path is measurably slower for large `needsUpdate` writes;
  detect via UA sniff or feature-test and back off proportionally.
- **Pause when off-screen** with `IntersectionObserver`, same as any canvas
  animation — stop the `setInterval` invalidate loop when the footer scrolls
  out of view.

---

## 7. Responsiveness

The grid is rebuilt (not resized in place) when viewport dimensions change —
`useMemo` keyed on `viewport.width`/`viewport.height` in the React version
above handles this automatically via react-three-fiber's reactive viewport.
For a vanilla three.js version, listen for `resize`, recompute `buildGrid()`,
and replace the `BufferGeometry`'s attributes.

---

## 8. Accessibility: `prefers-reduced-motion`

Same principle as any continuous animation — gate the whole `<Canvas>`, don't
just freeze it with CSS (the render loop and `setInterval` would keep running
in the background otherwise):

```tsx
if (reducedMotion) {
  return <div style={{ width: '100%', height: 220 }} />; // static fallback band
}
return <Canvas>...</Canvas>;
```

---

## 9. Customization knobs (quick reference)

| Effect you want | Change |
|---|---|
| Denser-looking grid | decrease spacing in `buildGrid` (more points, more cost) |
| Faster color drift | increase the noise time multiplier (`clock.elapsedTime * 0.1` → higher) |
| Smoother color transitions, less "flicker" | widen the threshold bands / interpolate between palette colors instead of hard cutoffs |
| Cheaper on low-end devices | raise `stride` (recolor fewer points per frame) |
| Bigger/smaller pixels | change `pointsMaterial size` |
| Different palette per section | swap the `PALETTE` array and re-derive thresholds |
| No animation at all | render the static fallback branch unconditionally |

---

## 10. Common pitfalls

- **Mutating the position buffer per frame** — don't; positions are set once.
  Only the color buffer changes, which is why this is so much cheaper than a
  physics sim with thousands of moving bodies.
- **Forgetting `colorAttr.needsUpdate = true`** — three.js won't re-upload the
  buffer to the GPU without it; symptoms are "the loop runs but nothing visibly
  changes."
- **Using `frameloop="always"`** — defeats the whole perf strategy here;
  stick with `"demand"` + throttled `invalidate()`.
- **Applying `map` to `PointsMaterial`** — introduces a texture sample and
  usually rounds the points into circles/sprites; leave it unset for the flat
  "pixel" square look.
- **Rebuilding the entire grid every frame instead of once per resize** — grid
  construction is the one part of this that *is* comparatively expensive;
  gate it behind a `useMemo`/resize listener, never call it from `useFrame`.
- **Leaking the `setInterval` invalidate timer** — clear it on unmount, same
  discipline as any `setInterval`/`requestAnimationFrame` cleanup.

---

## References

- three.js docs: https://threejs.org/docs/
- `@react-three/fiber` docs: https://r3f.docs.pmnd.rs/
- `simplex-noise` (npm): https://www.npmjs.com/package/simplex-noise
- Technique reconstructed by inspecting dottxt.ai's production `_next/static/chunks/*.js` bundles (webpack chunk `5170`, component `BackgroundSquares`/footer animation `points` mesh) — not from public documentation.
