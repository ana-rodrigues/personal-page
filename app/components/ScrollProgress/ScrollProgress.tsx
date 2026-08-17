'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import styles from './ScrollProgress.module.css';
import Text from '../Text/Text';

type ScrollProgressProps = {
  targetRef: RefObject<HTMLElement | null>;
  active: boolean;
};

type Section = { label: string };

const SECTION_REACHED_OFFSET = 96;

export default function ScrollProgress({ targetRef, active }: ScrollProgressProps) {
  const headingElsRef = useRef<HTMLElement[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const target = targetRef.current;
    if (!active || !target) return;

    const measure = () => {
      const headings = Array.from(target.querySelectorAll<HTMLElement>('h2'));
      headingElsRef.current = headings;
      setSections(headings.map((heading) => ({ label: heading.textContent ?? '' })));
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(target);
    if (target.firstElementChild) resizeObserver.observe(target.firstElementChild);

    return () => resizeObserver.disconnect();
  }, [active, targetRef]);

  useEffect(() => {
    const target = targetRef.current;
    if (!active || !target || sections.length === 0) return;

    const onScroll = () => {
      let next = 0;
      headingElsRef.current.forEach((heading, index) => {
        if (heading.offsetTop - SECTION_REACHED_OFFSET <= target.scrollTop) {
          next = index;
        }
      });
      setActiveIndex(next);
    };

    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [active, targetRef, sections]);

  const handleSelect = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
    event.stopPropagation();
    const target = targetRef.current;
    const heading = headingElsRef.current[index];
    if (!target || !heading) return;

    target.scrollTop = heading.offsetTop - SECTION_REACHED_OFFSET;
  };

  if (!active || sections.length < 2) return null;

  return (
    <nav className={styles.dock} onClick={(event) => event.stopPropagation()}>
      <ul className={styles.list}>
        {sections.map((section, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={(event) => handleSelect(event, index)}
              className={`${styles.item}${index === activeIndex ? ` ${styles.isActive}` : ''}`}
            >
              <Text
                as="span"
                typography="body"
                color={index === activeIndex ? 'highlight' : 'secondary'}
                className={styles.itemLabel}
              >
                {section.label}
              </Text>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
