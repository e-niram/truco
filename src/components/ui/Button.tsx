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
  fontWeight: 600,
  letterSpacing: '-0.01em',
  transition: 'all 150ms ease',
  cursor: 'pointer',
  width: '100%',
};

const styles: Record<string, React.CSSProperties> = {
  primary: {
    ...base,
    background: 'var(--color-accent)',
    color: '#ffffff',
    padding: '13px 24px',
    fontSize: '15px',
  },
  ghost: {
    ...base,
    background: 'transparent',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.18)',
    padding: '13px 24px',
    fontSize: '15px',
  },
  danger: {
    ...base,
    background: 'var(--color-danger)',
    color: '#ffffff',
    padding: '13px 24px',
    fontSize: '15px',
  },
};
