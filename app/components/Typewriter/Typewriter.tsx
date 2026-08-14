'use client';

import type { ElementType, ReactElement, ReactNode } from 'react';
import { cloneElement, isValidElement, useEffect, useState } from 'react';
import { Cursor, useTypewriter } from 'react-simple-typewriter';
import styles from './Typewriter.module.css';

type WrapperProps = {
  className?: string;
  children?: ReactNode;
};

type TypewriterProps = {
  words: string[];
  as?: ElementType;
  className?: string;
  loop?: boolean | number;
  typeSpeed?: number;
  deleteSpeed?: number;
  delaySpeed?: number;
  cursor?: boolean;
  cursorStyle?: string;
  /**
   * Optional wrapper element (e.g. `<Text size="xl" />`) that receives the
   * animated output as its children. When provided, it replaces `as` and
   * takes precedence over the default wrapper.
   */
  children?: ReactElement<WrapperProps>;
};

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reducedMotion;
}

export default function Typewriter({
  words,
  as: Component = 'span',
  className = '',
  loop = true,
  typeSpeed = 80,
  deleteSpeed = 50,
  delaySpeed = 1500,
  cursor = true,
  cursorStyle = '_',
  children,
}: TypewriterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [text] = useTypewriter({
    words,
    loop,
    typeSpeed,
    deleteSpeed,
    delaySpeed,
  });

  const content = (
    <>
      <span aria-hidden="true">
        {reducedMotion ? words[0] : text}
        {cursor && !reducedMotion && <Cursor cursorStyle={cursorStyle} />}
      </span>
      <span className="assistive">{words.join(', ')}</span>
    </>
  );

  if (isValidElement<WrapperProps>(children)) {
    return cloneElement(
      children,
      {
        className: [styles.root, children.props.className, className]
          .filter(Boolean)
          .join(' '),
      },
      content,
    );
  }

  return (
    <Component className={[styles.root, className].join(' ')}>
      {content}
    </Component>
  );
}
