'use client';

import { useEffect, useState } from 'react';
import styles from './Footer.module.css';
import Text from '../Text/Text';
import ScrambleText from '../ScrambleText/ScrambleText';

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
  { label: 'Email', href: '#' },
];

export default function Footer({ children }: { children: React.ReactNode }) {
  const clock = useLisbonClock();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className={styles.root}>
      <main id="main-content" className="content">
        <div className="container">
          {children}
        </div>
      </main>

      <footer className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.timeRow}>
            {clock && (
              <>
                <Text typography="label" color="highlight">{clock.time}</Text>
                <img
                  className={styles.timeIcon}
                  src={clock.isDay ? '/icons/sun.svg' : '/icons/moon.svg'}
                  alt=""
                  width={16}
                  height={16}
                />
                <Text typography="label" color="highlight">Lisbon/Europe</Text>
              </>
            )}
          </div>

          <ul className={styles.links}>
            {LINKS.map(({ label, href }) => (
              <li key={label}>
                <a
                  href={href}
                  onMouseEnter={() => setHovered(label)}
                  onMouseLeave={() => setHovered((current) => (current === label ? null : current))}
                >
                  <Text as="span" typography="label" color="highlight">
                    <ScrambleText active={hovered === label}>{`[] ${label}`}</ScrambleText>
                  </Text>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
