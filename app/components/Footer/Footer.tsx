import type { ReactNode } from 'react';
import styles from './Footer.module.css';

type FooterProps = {
  children?: ReactNode;
};

export default function Footer({ children }: FooterProps) {
  return <div className={styles.root}>{children}</div>;
}
