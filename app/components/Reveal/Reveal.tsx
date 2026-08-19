'use client';

import { type ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';

type RevealTag = 'div' | 'section' | 'span' | 'article' | 'header' | 'li' | 'img';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Seconds between each RevealItem child's entrance. Omit for a single, non-staggered reveal. */
  stagger?: number;
  as?: RevealTag;
};

function buildRevealVariants(delay: number, shouldReduceMotion: boolean | null): Variants {
  return {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay,
        opacity: { duration: 0.28, ease: 'easeOut' },
        y: shouldReduceMotion
          ? { duration: 0.28 }
          : { type: 'spring', duration: 0.4, bounce: 0.12 },
      },
    },
  };
}

export default function Reveal({ children, className, delay = 0, stagger, as = 'div' }: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = motion[as];

  const variants: Variants = stagger === undefined
    ? buildRevealVariants(delay, shouldReduceMotion)
    : { hidden: {}, visible: { transition: { delayChildren: delay, staggerChildren: stagger } } };

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}

type RevealItemProps = {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
};

/** Direct child of a staggered <Reveal stagger={...}>; inherits its parent's viewport trigger. */
export function RevealItem({ children, className, as = 'div' }: RevealItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionTag = motion[as];
  const variants = buildRevealVariants(0, shouldReduceMotion);

  return (
    <MotionTag className={className} variants={variants}>
      {children}
    </MotionTag>
  );
}
