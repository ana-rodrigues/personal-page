'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionTemplate, useScroll, useTransform } from 'motion/react';
import styles from './Footer.module.css';
import Text from '../Text/Text';

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reducedMotion;
}

function useLisbonClock() {
  const [clock, setClock] = useState<{ time: string; isDay: boolean } | null>(null);

  useEffect(() => {
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Lisbon',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Lisbon',
      timeZoneName: 'shortOffset',
    });
    const hourFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Lisbon',
      hour: 'numeric',
      hour12: false,
    });

    const update = () => {
      const now = new Date();
      const offset = offsetFormatter.formatToParts(now).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
      const hour = Number(hourFormatter.format(now));
      setClock({
        time: `${timeFormatter.format(now)} ${offset}`,
        isDay: hour >= 7 && hour < 20,
      });
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return clock;
}

const LINKS = [
  { label: 'Linkedin', href: '#' },
  { label: 'Github', href: '#' },
  { label: 'Substack', href: '#' },
  { label: 'Email', href: '#' },
];

export default function Footer({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [revealAt, setRevealAt] = useState(0.35);
  const reducedMotion = usePrefersReducedMotion();
  const clock = useLisbonClock();

  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const update = () => {
      const footerHeight = footer.offsetHeight;
      const viewportHeight = window.innerHeight || 1;
      setRevealAt(Math.min(0.95, Math.max(0.05, footerHeight / viewportHeight)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(footer);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: contentRef,
    offset: ['end end', 'end start'],
  });
  const opacity = useTransform(scrollYProgress, [0, revealAt], [0, 1]);
  const scale = useTransform(scrollYProgress, [0, revealAt], [0.9, 1]);
  const blur = useTransform(scrollYProgress, [0, revealAt], [4, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <div className={styles.root}>
      <main id="main-content" ref={contentRef} className="content">
        <div className="container">{children}</div>
      </main>

      <footer ref={footerRef} className={styles.revealFooter}>
        <motion.div
          className={styles.footerFade}
          style={reducedMotion ? undefined : { opacity }}
        >
          <motion.div
            className={styles.footerScale}
            style={reducedMotion ? undefined : { scale, filter, transformOrigin: '60% 100%' }}
          >
            <div className={styles.footerInner}>

              <div className={styles.timeRow}>
                {clock && (
                  <>
                    <Text typography="label" color="primary">{clock.time}</Text>
                    <img
                      className={styles.timeIcon}
                      src={clock.isDay ? '/icons/sun.svg' : '/icons/moon.svg'}
                      alt=""
                      width={16}
                      height={16}
                    />
                    <Text typography="label" color="primary">Lisbon/Europe</Text>
                  </>
                )}
              </div>

              <Text typography="body" color="primary" className={styles.credits}>
                All pixels carefully crafted using{' '}
                <a className="body-regular text-highlight" href="https://nextjs.org/" target="_blank" rel="noreferrer">
                  Next.js
                </a>
                . Fonts are <Text as="span" color="highlight">Inter</Text> by Rasmus Andersson and{' '}
                <Text as="span" color="highlight">Departure Mono</Text> by Helena Zhang. Icons from the{' '}
                <Text as="span" color="highlight">Hackernoon Pixel Icon Library</Text>.
              </Text>

              <ul className={styles.links}>
                {LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className={styles.linkRow}>
                      <Text as="span" typography="label" color="primary" className={styles.bracket}>[]</Text>
                      <Text as="span" typography="body" color="primary">{label}</Text>
                    </a>
                  </li>
                ))}
              </ul>

              <Text typography="caption" color="secondary">©{new Date().getFullYear()} Ana Fernandes Rodrigues</Text>
            </div>
          </motion.div>
        </motion.div>
      </footer>
    </div>
  );
}
