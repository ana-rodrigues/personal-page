'use client';

import { useEffect, useState } from 'react';
import styles from './CoordinatesDock.module.css';

function useCursorPosition() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return position;
}

function useClickCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handleClick = () => {
      setCount((current) => current + 1);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return count;
}

function useLastKeyPressed() {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKey(event.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return key;
}

export default function CoordinatesDock() {
  const position = useCursorPosition();
  const count = useClickCount();
  const keyPressed = useLastKeyPressed();

  if (!position) return null;

  return (
    <div className={styles.dock}>
      <pre className={styles.panel}>
        {'{\n'}
        {'  count: '}{count}{';\n'}
        {'  mouseX: '}{position.x}{';\n'}
        {'  mouseY: '}{position.y}{';\n'}
        {'  keyPressed: '}{keyPressed ?? 'null'}{';\n'}
        {'}'}
      </pre>
    </div>
  );
}
