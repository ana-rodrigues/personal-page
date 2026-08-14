import type { ElementType, HTMLAttributes, ReactNode } from 'react';

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  typography?: 'label' | 'body' | 'caption';
  color?: 'primary' | 'secondary' | 'muted';
};

const colorMap = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted',
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
  return (
    <Component
      className={[
        typographyMap[typography],
        colorMap[color],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Component>
  );
}
