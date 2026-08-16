import { createElement, type ReactNode } from 'react';
import styles from './Button.module.css';

type ButtonProps = {
  as?: React.ElementType;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
};

const variantMap = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
};


export default function Button ({
  as: Component = 'button',
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    createElement(
      Component,
      {
        className: [variantMap[variant], className].join(' '),
        ...props,
      },
      children,
    ) 
  );
}
