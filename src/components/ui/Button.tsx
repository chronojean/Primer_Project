import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) => {
    const baseStyles = {
        cursor: 'pointer',
        borderRadius: '0.375rem',
        fontWeight: 500,
        transition: 'all 0.2s',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const variants = {
        primary: { backgroundColor: 'var(--primary)', color: 'white', border: '1px solid var(--primary)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
        secondary: { backgroundColor: 'white', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
        danger: { backgroundColor: '#ef4444', color: 'white', border: '1px solid #ef4444' },
        ghost: { backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none' },
    };

    const sizes = {
        sm: { padding: '0.25rem 0.5rem', fontSize: '0.875rem' },
        md: { padding: '0.5rem 1rem', fontSize: '1rem' },
        lg: { padding: '0.75rem 1.5rem', fontSize: '1.125rem' },
    };

    return (
        <button
            style={{ ...baseStyles, ...variants[variant], ...sizes[size] }}
            {...props}
        />
    );
};
