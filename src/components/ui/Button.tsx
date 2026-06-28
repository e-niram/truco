import { type ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx('btn', `btn-${variant}`, `btn-${size}`, className)}
      style={styles[variant]}
      {...props}
    >
      {children}
    </button>
  );
}

const base: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderRadius: '10px',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  transition: 'all 150ms ease',
  cursor: 'pointer',
};

const styles: Record<string, React.CSSProperties> = {
  primary: {
    ...base,
    background: '#ffffff',
    color: '#000000',
    padding: '12px 24px',
  },
  ghost: {
    ...base,
    background: 'transparent',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '12px 24px',
  },
  danger: {
    ...base,
    background: '#e53e3e',
    color: '#ffffff',
    padding: '12px 24px',
  },
};
