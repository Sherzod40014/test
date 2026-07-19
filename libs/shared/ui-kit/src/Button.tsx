import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function Button({ children, style, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        minHeight: 48,
        fontSize: 16,
        padding: '12px 24px',
        borderRadius: 6,
        border: 'none',
        backgroundColor: '#1d4ed8',
        color: '#ffffff',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
