'use client';

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react';
import { motion, useReducedMotion, useSpring } from 'motion/react';
import styles from './MagicCursor.module.css';

type TargetRect = { x: number; y: number; width: number; height: number };

type MagicCursorContextValue = {
  setTarget: (rect: TargetRect | null) => void;
  reset: () => void;
};

const MagicCursorContext = createContext<MagicCursorContextValue | null>(null);

const DOT_SIZE = 10;
const SIZE_SPRING = { stiffness: 400, damping: 22, mass: 0.6 };
const OPACITY_SPRING = { stiffness: 500, damping: 40, mass: 0.5 };
const POSITION_SPRING = { stiffness: 1200, damping: 38, mass: 0.4 };
const TARGET_ATTR = 'data-magic-cursor-target';

export default function MagicCursor({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [isTarget, setIsTarget] = useState(false);
  const targetRef = useRef<TargetRect | null>(null);
  const pointRef = useRef({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const x = useSpring(0, POSITION_SPRING);
  const y = useSpring(0, POSITION_SPRING);
  const width = useSpring(DOT_SIZE, SIZE_SPRING);
  const height = useSpring(DOT_SIZE, SIZE_SPRING);
  const fillOpacity = useSpring(0, OPACITY_SPRING);

  function collapseTo(clientX: number, clientY: number, opacity: number) {
    targetRef.current = null;
    setIsTarget(false);
    x.set(clientX - DOT_SIZE / 2);
    y.set(clientY - DOT_SIZE / 2);
    width.set(DOT_SIZE);
    height.set(DOT_SIZE);
    fillOpacity.set(opacity);
  }

  useEffect(() => {
    if (shouldReduceMotion) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    setEnabled(true);
    document.documentElement.classList.add(styles.cursorHidden);

    function expandTo(rect: TargetRect) {
      targetRef.current = rect;
      setIsTarget(true);
      x.set(rect.x);
      y.set(rect.y);
      width.set(rect.width);
      height.set(rect.height);
      fillOpacity.set(0.4);
    }

    function handleMouseMove(event: MouseEvent) {
      pointRef.current = { x: event.clientX, y: event.clientY };
      if (targetRef.current) return;
      x.set(event.clientX - DOT_SIZE / 2);
      y.set(event.clientY - DOT_SIZE / 2);
      width.set(DOT_SIZE);
      height.set(DOT_SIZE);
      fillOpacity.set(0.85);
    }

    let scrollScheduled = false;
    function handleScroll() {
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        scrollScheduled = false;
        const { x: clientX, y: clientY } = pointRef.current;
        const elAtPoint = document.elementFromPoint(clientX, clientY);
        const targetEl = elAtPoint instanceof Element ? elAtPoint.closest(`[${TARGET_ATTR}]`) : null;

        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          expandTo({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
        } else if (targetRef.current) {
          collapseTo(clientX, clientY, 0);
        }
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.documentElement.classList.remove(styles.cursorHidden);
    };
  }, [shouldReduceMotion]);

  const contextValue = useMemo<MagicCursorContextValue>(() => ({
    setTarget: (rect) => {
      targetRef.current = rect;
      setIsTarget(!!rect);
      if (rect) {
        x.set(rect.x);
        y.set(rect.y);
        width.set(rect.width);
        height.set(rect.height);
        fillOpacity.set(0.4);
      }
    },
    reset: () => {
      const { x: clientX, y: clientY } = pointRef.current;
      collapseTo(clientX, clientY, 0.85);
    },
  }), []);

  return (
    <MagicCursorContext.Provider value={contextValue}>
      {children}
      {enabled && (
        <motion.div
          aria-hidden
          className={styles.cursor}
          style={{
            left: x,
            top: y,
            width,
            height,
            opacity: fillOpacity,
            backgroundColor: isTarget ? 'var(--gray-300)' : 'var(--gray-800)',
          }}
        />
      )}
    </MagicCursorContext.Provider>
  );
}

export function useMagicCursor() {
  return useContext(MagicCursorContext);
}

type PointerTargetProps = {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  /** When true, this target no longer snaps/morphs the MagicCursor (e.g. it already shows its own active state). */
  disabled?: boolean;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseLeave?: (event: React.MouseEvent) => void;
  [key: string]: unknown;
};

/** Wraps an <a>/<button> so the MagicCursor snaps to and morphs over it on hover. */
export function PointerTarget({
  as: Component = 'a',
  children,
  className,
  disabled = false,
  onMouseEnter,
  onMouseLeave,
  ...props
}: PointerTargetProps) {
  const ref = useRef<HTMLElement | null>(null);
  const context = useContext(MagicCursorContext);

  function handleMouseEnter(event: React.MouseEvent) {
    const el = ref.current;
    if (!disabled && el) {
      const rect = el.getBoundingClientRect();
      context?.setTarget({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    }
    onMouseEnter?.(event);
  }

  function handleMouseLeave(event: React.MouseEvent) {
    if (!disabled) {
      context?.setTarget(null);
    }
    onMouseLeave?.(event);
  }

  return createElement(
    Component,
    {
      ref,
      className,
      ...(disabled ? {} : { [TARGET_ATTR]: '' }),
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ...props,
    },
    children,
  );
}
