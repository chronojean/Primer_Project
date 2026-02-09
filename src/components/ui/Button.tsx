import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'primary', size = 'md', className, style, ...props }: ButtonProps) => {
    const baseStyles = {
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        borderRadius: '0.375rem',
        fontWeight: 500,
        transition: 'all 0.2s',
        border: '1px solid transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: props.disabled ? 0.55 : 1,
    };

    const variants = {
        primary: { backgroundColor: 'var(--button-primary-bg)', color: 'var(--button-primary-text)', border: '1px solid var(--button-primary-border)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
        secondary: { backgroundColor: 'var(--button-secondary-bg)', color: 'var(--button-secondary-text)', border: '1px solid var(--button-secondary-border)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
        success: { backgroundColor: 'var(--button-success-bg)', color: 'var(--button-success-text)', border: '1px solid var(--button-success-border)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
        danger: { backgroundColor: 'var(--button-danger-bg)', color: 'var(--button-danger-text)', border: '1px solid var(--button-danger-border)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
        ghost: { backgroundColor: 'var(--button-ghost-bg)', color: 'var(--button-ghost-text)', border: '1px solid var(--button-ghost-border)', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
    };

    const uniformSize = {
        padding: '0.5rem 1rem',
        fontSize: '0.95rem',
        lineHeight: 1.2,
        minHeight: '2.25rem',
    };

    const sanitizedStyle = style ? { ...style } : {};
    delete sanitizedStyle.padding;
    delete sanitizedStyle.paddingLeft;
    delete sanitizedStyle.paddingRight;
    delete sanitizedStyle.paddingTop;
    delete sanitizedStyle.paddingBottom;
    delete sanitizedStyle.fontSize;
    delete sanitizedStyle.lineHeight;
    delete sanitizedStyle.height;
    delete sanitizedStyle.minHeight;

    return (
        <button
            style={{ ...baseStyles, ...variants[variant], ...uniformSize, ...sanitizedStyle }}
            {...props}
        />
    );
};
