'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';
import Button from '../Button/Button';
import ScrollProgress from '../ScrollProgress/ScrollProgress';

const EXIT_DURATION = 550;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, children }: ModalProps) {
  const [rendered, setRendered] = useState(open);
  const panelRef = useRef<HTMLDivElement>(null);

  // Mount synchronously in the same commit as `open` flipping true, instead of
  // via an effect (which would skip a paint with the modal missing entirely).
  if (open && !rendered) {
    setRendered(true);
  }

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setRendered(false), EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [open]);

  // Closing while scrolled would otherwise make the shared layoutId image
  // FLIP-animate all the way from its scrolled-away position back to its
  // origin. Snap the scroll back to top first so it's measured at its
  // canonical position, same as a close from an unscrolled panel.
  const requestClose = () => {
    const panel = panelRef.current;
    if (panel && panel.scrollTop > 0) {
      panel.scrollTo({ top: 0, behavior: 'instant' });
      requestAnimationFrame(onClose);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!rendered) return null;

  return createPortal(
    <div
      className={`${styles.overlay}${open ? ` ${styles.isOpen}` : ''}`}
      onClick={requestClose}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <Button variant="ghost" className={styles.closeButton} onClick={requestClose}>
          [ X ] Close
        </Button>
        {children}
      </div>
      <ScrollProgress targetRef={panelRef} active={open} />
    </div>,
    document.body,
  );
}
