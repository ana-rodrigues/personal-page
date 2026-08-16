'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';
import Button from '../Button/Button';

const EXIT_DURATION = 550;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, onClose, children }: ModalProps) {
  const [rendered, setRendered] = useState(open);

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

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!rendered) return null;

  return createPortal(
    <div
      className={`${styles.overlay}${open ? ` ${styles.isOpen}` : ''}`}
      onClick={onClose}
    >
      <div className={styles.panel} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <Button  className="closeButton" variant="primary" onClick={onClose} aria-label="Close">
          [x] Close
        </Button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
