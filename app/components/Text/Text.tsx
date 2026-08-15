import { createElement, type ElementType, type HTMLAttributes, type ReactNode } from 'react';

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  typography?: 'label' | 'body' | 'caption';
  color?: 'primary' | 'secondary' | 'highlight';
};

const colorMap = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  highlight: 'text-highlight'
};

const typographyMap = {
  label: 'label',
  body: 'body-regular',
  caption: 'caption'
};

export default function Text({
  as: Component = 'p',
  children,
  className = '',
  typography = 'body',
  color = 'primary',
  ...props
}: TextProps) {
  return createElement(
    Component,
    {
      className: [typographyMap[typography], colorMap[color], className].join(' '),
      ...props,
    },
    children,
  );
}
