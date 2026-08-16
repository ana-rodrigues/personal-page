# Implementation Guide: Drag/Lerp Infinite Carousel (malikkotb.com-style, `smooothy`)

A horizontally-dragged, infinitely-looping carousel that eases toward a target
position every frame instead of snapping via CSS transitions or
`scroll-snap`. This is the actual technique used for the hero carousel at
https://www.malikkotb.com/, confirmed by pulling their production `_next/static`
bundles: the DOM ships literal `smooothy-carousel` / `smooothy-slider` /
`smooothy-slide` classes, which trace to the open-source npm package
[`smooothy`](https://www.npmjs.com/package/smooothy) (by `vallafederico`,
MIT). This guide is reconstructed from that package's actual TypeScript
source (recovered via its published source maps), not just its README.

**Core idea:** there is no physics engine and no CSS transition. A single
`Core` class tracks two numbers — `current` and `target` — in "slide index"
units (not pixels). Every frame, `current` is exponentially damped toward
`target` (`current = damp(current, target, 1/lerpFactor, deltaTime)`), and
the result is written to each slide as `transform: translateX(px)`. Drag,
wheel, and snap logic all do exactly one thing: nudge `target`. The illusion
of "infinite" comes from wrapping each slide's rendered position with a
symmetric modulo, not from cloning DOM nodes.

---

## 1. Dependencies

```bash
npm install smooothy
```

- `smooothy` — the headless slider engine (`Core` class + `damp`/`lerp`/
  `symmetricMod` utils). ~18KB minified, zero React/Vue/etc. dependency.
- Pulls in `virtual-scroll` internally (its own dependency) to normalize
  wheel/trackpad delta across browsers — you don't install this yourself.

No Swiper, no Embla, no Splide. malikkotb.com pairs it with GSAP
(`ScrollTrigger`/`Observer`/`Flip`) and Lenis for the rest of the page's
motion, but the carousel itself owes nothing to either — `smooothy` is
framework- and animation-library-agnostic by design ("bring your own
tooling" is literally the README's tagline).

---

## 2. Concepts you need before writing code

| Piece | Role |
|---|---|
| `Core` | The engine. Constructed with a wrapper element; treats **every direct child as a slide** — nothing else may live inside the wrapper. |
| `current` / `target` (slide-index units, not px) | `target` is where input (drag/wheel/snap) wants the slider to be; `current` is where it visually is. They're decoupled on purpose. |
| `damp(a, b, lambda, deltaTime)` | Framerate-independent exponential smoothing: `a + (b-a) * (1 - exp(-lambda*deltaTime))`. This is what makes the motion "smooth" regardless of frame rate — swap in for naive `lerp(a,b,t)` any time you see jank on variable refresh-rate displays. |
| `symmetricMod(value, base)` | Wraps `value` into `(-base/2, base/2]` instead of `[0, base)` — the trick that makes infinite mode wrap slides to whichever side is visually shorter, rather than always jumping forward. |
| `update()` | Must be called every frame from your own `requestAnimationFrame` loop — `Core` does **not** run its own rAF loop. This is deliberate: it lets you drive it from GSAP's ticker, react-three-fiber's `useFrame`, or plain rAF. |
| `IntersectionObserver` (internal) | `update()` is a no-op while the wrapper isn't in the viewport (`isVisible` flag) — free perf, no config needed. |
| `ResizeObserver` (internal) | Automatically re-measures slide widths on resize (debounced 10ms) — you don't need to wire this yourself. |
| CSS `transform: translateX/Y` | The only thing `Core` ever writes to the DOM. No React re-renders, no CSS variables — direct `item.style.transform` writes on the raw elements each frame. |

---

## 3. HTML/CSS structure

`smooothy` expects a flat wrapper → slides structure and does the rest from
CSS — it deliberately does not fight your layout system:

```html
<div data-slider class="slider-wrapper">
  <div class="slide">Slide 1</div>
  <div class="slide">Slide 2</div>
  <div class="slide">Slide 3</div>
</div>
```

```css
[data-slider] {
  display: flex;
  overflow-x: hidden; /* overflow-y: hidden + flex-direction: column for vertical */
}

[data-slider] > * {
  flex-shrink: 0;
  width: 28vw; /* whatever unit — Core measures this via getBoundingClientRect() */
}
```

malikkotb.com's actual CSS (recovered from their shipped stylesheet) follows
this exactly, using `min()` for responsive slide sizing and CSS custom
properties for spacing:

```css
.smooothy-carousel {
  display: flex;
  flex-direction: column;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: hidden;
  padding-bottom: max(var(--hero-carousel-gutter), env(safe-area-inset-bottom));
}

.smooothy-slider {
  display: flex;
  align-items: flex-end;
  user-select: none;
  touch-action: pan-y; /* let vertical page scroll pass through; slider owns horizontal */
}

.smooothy-slide {
  box-sizing: content-box;
  flex-shrink: 0;
  width: min(28vw, 44vh - 2rem); /* desktop */
  padding-right: var(--hero-carousel-slide-gap);
}

@media (max-width: <breakpoint>) {
  .smooothy-slide {
    width: min(75vw, 40vh - 2rem); /* mobile: near-fullwidth slides */
  }
}
```

Two things worth calling out because they're easy to get wrong:

- **`touch-action: pan-y` on the slider, not `none`.** `Core` calls
  `e.preventDefault()` itself once it detects horizontal touch intent (see
  §5), so you still need `pan-y` to let the *page* scroll vertically before
  that kicks in — setting `touch-action: none` would fight the browser's own
  scroll gesture instead of cooperating with `Core`'s direction detection.
- **No gap support.** Per the README, `smooothy` intentionally doesn't
  support CSS `gap` "to keep it as lightweight as possible." If you want
  gaps, use `padding` on each slide (half the gap on each side) instead —
  which is exactly what `--hero-carousel-slide-gap` above is doing via
  `padding-right`.

---

## 4. Wiring it up (vanilla)

```javascript
import Core from "smooothy"

const wrapper = document.querySelector("[data-slider]")

const slider = new Core(wrapper, {
  infinite: true,
  snap: true,
})

function animate() {
  slider.update()
  requestAnimationFrame(animate)
}
animate()

// on unmount:
slider.destroy()
```

That's the entire required surface area. Everything else (drag, touch,
wheel, resize, visibility gating) self-wires in the constructor.

---

## 5. What actually happens inside `update()` — the real algorithm

This is the part worth understanding deeply, since it's what separates this
from a scroll-snap carousel. Reconstructed directly from `Core`'s source
(`src/core.ts`):

```javascript
update() {
  if (!this.isVisible || !this.#isActive) return; // IntersectionObserver gate

  this.deltaTime = (performance.now() - this.#previousTime) / 1000;
  this.#previousTime = performance.now();

  // 1. Snap pull: while not dragging, nudge `target` toward the nearest
  //    integer slide index, proportionally to `snapStrength` (default 0.1
  //    — i.e. target creeps 10% of the remaining distance per frame, not
  //    an instant snap)
  if (this.config.snap && !this.isDragging) {
    const currentSnap = Math.round(this.target);
    this.target += (currentSnap - this.target) * this.config.snapStrength;
  }

  // 2. The actual smoothing: current eases toward target every frame,
  //    independent of frame rate
  this.current = damp(this.current, this.target, 1 / this.config.lerpFactor, this.deltaTime);

  // 3. Infinite wrap + write transforms
  if (this.config.infinite) {
    this.items.forEach((item, i) => {
      const unitPos = this.current + i;
      const x = symmetricMod(unitPos, this.items.length) - i; // wraps to shortest side
      item.style.transform = `translateX(${x * itemWidth}px)`;
    });
  }

  // 4. currentSlide bookkeeping + onSlideChange callback
  const rawIndex = Math.round(-this.current);
  const normalizedIndex = ((rawIndex % length) + length) % length;
  if (normalizedIndex !== this.#currentSlide) {
    this.onSlideChange?.(normalizedIndex, this.#currentSlide);
  }

  this.onUpdate?.(this); // your hook for syncing external UI
}
```

Key design decisions worth internalizing:

- **`target` moves in whole "slide index" units**, not pixels. Dragging 1
  full slide-width moves `target` by `1.0`. This is why `goToNext()` is
  just `target = Math.round(target - 1)` — no pixel math needed anywhere in
  the public API.
- **Snapping is not instant.** Even with `snap: true`, `target` creeps
  toward the nearest integer at `snapStrength` per frame (default `0.1`),
  and *then* `current` separately dampens toward `target` at `lerpFactor`.
  Two independent easing passes stacked — this is what gives the
  "elastic settle" feel rather than a hard CSS `scroll-snap` stop.
- **`symmetricMod` is why "infinite" doesn't jump.** A naive `value % length`
  would always wrap forward (0 → length-1 looks like a big jump backward
  visually). `symmetricMod` centers the wrap around zero, so each slide's
  rendered position is always the *shortest* path from center — slide 0 can
  appear either just-left or just-right of center depending on which is
  nearer, which is what makes the loop feel seamless with as few as 3–5
  DOM slides (no cloning needed).
- **Drag/wheel never touch `current` directly** — they only ever write to
  `target` (see `#handleDragMove`, `#setupVirtualScroll` in source). `current`
  is *only* ever moved by `damp()` inside `update()`. This separation is why
  you can safely do `slider.target = 5` from outside and get a smooth
  animated transition for free, while `slider.current = slider.target = 5`
  jumps instantly (both are public read/write properties for exactly this
  reason — see README's "State Queries / Setters").

---

## 6. Input handling specifics

- **Drag** (`#handleDragMove`): sensitivity is `dragSensitivity` (default
  `0.005`) — `newTarget = dragStartTarget + delta * dragSensitivity`, so a
  ~200px drag moves `target` by ~1 full slide. `speed` is separately
  accumulated from `event.movementX` for use in `onUpdate` (e.g. driving a
  parallax/blur effect proportional to fling velocity — see §8).
- **Touch**: direction-locks after a 5px threshold (`SCROLL_THRESHOLD`) by
  comparing `deltaX` vs `deltaY` on the first move past the threshold, then
  calls `preventDefault()` only once it's confident the gesture is
  horizontal — this is exactly why `touch-action: pan-y` (not `none`) is
  correct in the CSS: it lets the browser own vertical scroll until `Core`
  explicitly claims horizontal.
- **Wheel/trackpad**: off by default (`scrollInput: false`) — malikkotb.com
  likely leaves this off since the carousel is drag/touch-primary in a
  `position: fixed` hero band. Turn it on for a content-area carousel users
  might reach via normal scrolling.
- **Firefox gets a 30x wheel multiplier** (`virtualScroll.firefoxMultiplier`)
  vs `0.5x` for other browsers on mouse — Firefox reports wheel deltas in an
  entirely different unit scale, so this isn't a "feel" tweak, it's a
  cross-browser normalization the library's `virtual-scroll` dependency
  handles for you.
- **Bounce** (non-infinite only): `#calculateBounds` clamps `target` to
  `[maxScroll - bounceLimit, bounceLimit]` while dragging, giving rubber-band
  overscroll at the ends — same visual language as native iOS scroll
  bounce, but implemented as a clamp, not real physics.

---

## 7. React integration (matching this repo's conventions)

`smooothy` ships no React bindings — wire the imperative `Core` instance up
in a `useEffect`, following this repo's existing pattern for imperative
libraries (see `app/components/Typewriter/Typewriter.tsx` for the
`usePrefersReducedMotion` hook to reuse):

```tsx
'use client';

import { useEffect, useRef } from 'react';
import Core from 'smooothy';

export default function HeroCarousel({ items }: { items: { id: string; src: string }[] }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const slider = new Core(wrapperRef.current, {
      infinite: true,
      snap: true,
      dragSensitivity: 0.005,
      lerpFactor: 0.3,
    });
    sliderRef.current = slider;

    let raf = 0;
    const animate = () => {
      slider.update();
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      slider.destroy();
    };
  }, []); // wrapper's children (slide count) must be stable across this effect's lifetime

  return (
    <div className="smooothy-carousel">
      <div ref={wrapperRef} className="smooothy-slider" data-slider>
        {items.map((item) => (
          <div key={item.id} className="smooothy-slide">
            <img src={item.src} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

Important React-specific gotcha: **`Core` reads `wrapper.children` once, in
its constructor** (`this.items = [...wrapper.children]`). If `items` changes
after mount (e.g. filtering/pagination), the existing instance's `items`
array goes stale — you must `destroy()` and reconstruct `Core` rather than
expecting it to pick up new children reactively. The cleanest fix is keying
the wrapper (or the whole component) on something that changes when the
slide set changes, so React remounts it:

```tsx
<div key={items.map((i) => i.id).join(',')} ref={wrapperRef} data-slider>
```

To sync external React UI (e.g. a slide counter, active dot) to slider
state, use `onSlideChange` and store into a ref + force a re-render (or
plain DOM writes, matching `Core`'s own no-React-re-render philosophy) —
don't call `setState` from inside the rAF loop's `onUpdate`, only from
`onSlideChange`, since that only fires on actual index changes rather than
every frame:

```tsx
const [activeIndex, setActiveIndex] = useState(0);
// ...
const slider = new Core(wrapperRef.current, {
  infinite: true,
  onSlideChange: (current) => setActiveIndex(current),
});
```

---

## 8. Effects: parallax / speed-reactive UI

`onUpdate` receives the live `Core` instance every frame, including
`speed` (raw per-frame velocity, decaying at `speedDecay`, default `0.85`)
and `parallaxValues` (each slide's wrapped position, one array entry per
slide) — this is the hook for anything that should react to how fast the
user is flinging the carousel, e.g. motion blur or an image scale/skew:

```javascript
import Core, { damp } from 'smooothy';

class ParallaxSlider extends Core {
  lerpedSpeed = 0;

  onUpdate({ speed, deltaTime, parallaxValues }) {
    this.lerpedSpeed = damp(this.lerpedSpeed, speed, 5, deltaTime);
    this.items.forEach((el, i) => {
      const skew = this.lerpedSpeed * 2; // deg, or whatever unit fits
      el.style.transform += ` skewX(${skew}deg)`;
    });
  }
}
```

Note `onUpdate` fires *every frame after* `Core` has already written its own
`translateX`/`translateY` to `item.style.transform` — appending further
transform functions there (rather than overwriting) is required to not blow
away the slider's own positioning.

---

## 9. Config reference (from actual `CoreConfig` type)

| Option | Type | Default | Notes |
|---|---|---|---|
| `infinite` | boolean | `true` | Loops via `symmetricMod`; `false` enables bounce/clamp behavior instead |
| `snap` | boolean | `true` | Also settable live: `slider.snap = false` for free-scroll mode |
| `variableWidth` | boolean | `false` | Slides measured individually via `getBoundingClientRect()`; snaps to each slide's own center, not a fixed grid |
| `vertical` | boolean | `false` | Mirrors every X-axis calc to Y; use `flex-direction: column` + `overflow-y: hidden` in CSS |
| `dragSensitivity` | number | `0.005` | Pixels-to-slide-units multiplier for mouse/touch drag |
| `lerpFactor` | number | `0.3` | Passed as `1/lerpFactor` into `damp()`'s lambda — **lower value = smoother/slower catch-up**, not higher |
| `scrollSensitivity` | number | `1` | Wheel/trackpad delta multiplier |
| `snapStrength` | number | `0.1` | Fraction of remaining distance to nearest slide pulled in per frame while idle |
| `speedDecay` | number | `0.85` | Per-frame multiplier applied to `speed` — controls how quickly fling "velocity" (used only for effects, not position) fades |
| `bounceLimit` | number | `1` | Max overscroll in slide-units, `infinite: false` only |
| `scrollInput` | boolean | `false` | Gate for wheel/trackpad driving the slider at all |
| `virtualScroll` | object | see README | Per-input-device wheel multipliers, incl. Firefox-specific one |
| `setOffset` | function | `(vp) => vertical ? itemHeight : itemWidth` | Governs where "end" is computed for non-infinite mode |
| `onSlideChange` | `(current, previous) => void` | `null` | Fires only on actual index change — safe to `setState` here |
| `onResize` | `(core) => void` | `null` | Fires (via `queueMicrotask`) after every viewport re-measure |
| `onUpdate` | `(core) => void` | `null` | Fires every frame `update()` runs — do not `setState` here |

---

## 10. Premade extensions

The package ships (or documents extending toward) a few subclasses beyond
bare `Core`, importable from the same entry point:

```js
import Core, { KeyboardSlider, LinkSlider, ControlSlider } from "smooothy";
```

| Name | Adds |
|---|---|
| `Core` | Base engine only |
| `KeyboardSlider` | Arrow keys / spacebar / numpad navigation |
| `LinkSlider` | Distinguishes a click-that-was-actually-a-drag from a real link click inside a slide (critical if slides are `<a>` tags — without this, dragging the carousel would also fire navigation) |
| `ControlSlider` | Full prev/next/dot UI, but requires matching HTML markup conventions — read the source before using rather than guessing the expected markup |

Given `smooothy`'s "bring your own tooling" philosophy, the more idiomatic
path in a React codebase is usually: use bare `Core`, and reimplement
`LinkSlider`'s drag-vs-click distinction (compare `dragStart` position to
pointer-up position, suppress the click if delta exceeds a few px) directly
in your React slide component's `onClick`, rather than pulling in the
subclass.

---

## 11. Common pitfalls

- **Anything except slide elements inside the wrapper.** `Core` treats
  *every* `wrapper.children` entry as a slide — a stray absolutely-positioned
  overlay div inside the slider wrapper becomes "slide N" and throws off all
  index math.
- **Forgetting the `requestAnimationFrame` loop entirely.** Unlike most
  slider libraries, `Core` is inert until you call `.update()` yourself —
  constructing it alone produces a slider that responds to drag input (target
  changes) but never visually moves (current never catches up).
- **Confusing `lerpFactor` direction.** It's inverted from intuition: it's
  fed as `1/lerpFactor` into an exponential-damp lambda, so *smaller*
  `lerpFactor` (e.g. `0.15`) is *smoother/slower*, and larger (e.g. `0.6`) is
  *snappier*. Don't reach for `lerpFactor: 1` expecting "instant" — if
  aiming for instant, use `slider.current = slider.target = n` instead.
- **`touch-action: none` instead of `pan-y`.** Blocks the browser's own
  vertical scroll gesture entirely rather than letting `Core`'s own
  direction-detection (§6) decide — makes the whole page feel broken on
  mobile when the carousel sits inline in a scrolling page (less of an issue
  for a `position: fixed` full-viewport hero like malikkotb.com's, but a real
  bug for a content-area carousel).
- **Re-rendering the slide list without reconstructing `Core`.** The
  `items` array is captured once at construction; React re-rendering new
  children into the same wrapper DOM node does not update it. Key the
  wrapper (or unmount/remount) on slide-set identity.
- **Calling `setState` from `onUpdate`.** It fires every animation frame;
  use `onSlideChange` (fires only on actual index transitions) for anything
  that should drive React state.
- **Expecting CSS `gap` to work.** It's intentionally unsupported for
  bundle-size reasons — use per-slide `padding` instead (see §3).
- **Not calling `slider.destroy()` on unmount.** Leaves `mousemove`/
  `mouseup`/`touchmove`/`touchend` listeners on `window` and an active
  `ResizeObserver`/`IntersectionObserver` — same discipline as any
  imperative library wired into a `useEffect`.

---

## 12. Customization knobs (quick reference)

| Effect you want | Change |
|---|---|
| Snappier drag response | Increase `dragSensitivity` |
| Smoother/slower easing | Decrease `lerpFactor` |
| Sharper/faster settle into place | Increase `lerpFactor` and/or `snapStrength` |
| Free-scroll, no snapping | `snap: false`, or toggle live via `slider.snap = false` |
| Mixed-size slides that center individually | `variableWidth: true` |
| Vertical carousel | `vertical: true` + matching CSS (`flex-direction: column`, `overflow-y: hidden`) |
| Enable mouse-wheel/trackpad control | `scrollInput: true`, tune `virtualScroll.mouseMultiplier` |
| Programmatic navigation (buttons/dots) | `slider.goToNext()` / `goToPrev()` / `goToIndex(n)` |
| Instant jump, no animation | `slider.current = slider.target = n` |
| Animated jump | `slider.target = n` only (leave `current` to catch up via `update()`) |
| Pause interaction (e.g. modal open) | `slider.paused = true` |
| Fully stop rendering, reset position | `slider.kill()` (then `slider.init()` to resume) |
| Speed-reactive effects (blur, skew, scale) | Read `speed`/`parallaxValues` in `onUpdate`, subclass `Core` or read `sliderRef.current` in a rAF loop |

---

## References

- npm package: https://www.npmjs.com/package/smooothy
- Source (recovered from published source maps at `unpkg.com/smooothy@<version>/dist/esm.js.map` — the package ships full inline `sourcesContent`, so the original `src/core.ts` and `src/utils.ts` are recoverable verbatim, not just the minified bundle)
- GitHub: https://github.com/vallafederico/smooothy
- Technique confirmed in production via https://www.malikkotb.com/'s shipped `_next/static/chunks/*.css` (literal `smooothy-carousel`/`smooothy-slider`/`smooothy-slide` class names) and `*.js` bundles (GSAP `ScrollTrigger`/`Observer`/`Flip` + Lenis alongside it, though neither is required by `smooothy` itself).
