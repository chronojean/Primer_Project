import { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) => {
    const classNames = [
        styles.base,
        styles[variant],
        styles[size],
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classNames}
            {...props}
        />
    );
};
