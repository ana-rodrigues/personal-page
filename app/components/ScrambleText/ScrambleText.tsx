'use client';

import { createElement, useEffect, useRef, useState, type ElementType } from 'react';
import { useReducedMotion } from 'motion/react';
import styles from './ScrambleText.module.css';

const CYCLES_PER_UNIT = 2;
const SHUFFLE_INTERVAL = 50;
const SCRAMBLE_CHARS = '!@#$%^&*():{};|,.<>/?';

function buildUnitMap(text: string, revealBy: 'letter' | 'word'): (number | null)[] {
  if (revealBy === 'letter') {
    return text.split('').map((char, index) => (char === ' ' ? null : index));
  }

  let wordIndex = -1;
  let inWord = false;
  return text.split('').map((char) => {
    if (char === ' ') {
      inWord = false;
      return null;
    }
    if (!inWord) {
      wordIndex++;
      inWord = true;
    }
    return wordIndex;
  });
}

type ScrambleTextProps = {
  children: string;
  as?: ElementType;
  className?: string;
  trigger?: 'hover' | 'mount';
  delay?: number;
  revealBy?: 'letter' | 'word';
  active?: boolean;
};

export default function ScrambleText({
  children,
  as: Component = 'span',
  className = '',
  trigger = 'hover',
  delay = 0,
  revealBy = 'letter',
  active,
}: ScrambleTextProps) {
  const targetText = children;
  const [text, setText] = useState(targetText);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const stopScramble = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setText(targetText);
  };

  const startScramble = () => {
    if (shouldReduceMotion) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const unitMap = buildUnitMap(targetText, revealBy);
    const unitCount = 1 + Math.max(-1, ...unitMap.filter((unit): unit is number => unit !== null));

    let pos = 0;
    intervalRef.current = setInterval(() => {
      setText(
        targetText
          .split('')
          .map((char, index) => {
            const unit = unitMap[index];
            if (unit === null || pos / CYCLES_PER_UNIT > unit) return char;
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join(''),
      );

      pos++;
      if (pos >= unitCount * CYCLES_PER_UNIT) stopScramble();
    }, SHUFFLE_INTERVAL);
  };

  useEffect(() => {
    setText(targetText);
    if (trigger !== 'mount') return;

    timeoutRef.current = setTimeout(startScramble, delay);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetText]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (active === undefined) return;
    if (active) startScramble(); else stopScramble();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const isSelfHover = trigger === 'hover' && active === undefined;
  const hoverHandlers = isSelfHover
    ? { onMouseEnter: startScramble, onMouseLeave: stopScramble }
    : {};

  return createElement(
    Component,
    {
      className: [styles.root, isSelfHover && styles.interactive, className]
        .filter(Boolean)
        .join(' '),
      ...hoverHandlers,
    },
    <span aria-hidden="true" key="visible">{text}</span>,
    <span className="assistive" key="assistive">{targetText}</span>,
  );
}
