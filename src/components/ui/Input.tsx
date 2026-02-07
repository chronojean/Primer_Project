import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = ({ label, ...props }: InputProps) => {
    return (
        <div style={{ marginBottom: '1rem' }}>
            {label && <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
            <input
                style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                }}
                {...props}
            />
        </div>
    );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string, label: string }[];
}

export const Select = ({ label, options, ...props }: SelectProps) => {
    return (
        <div style={{ marginBottom: '1rem' }}>
            {label && <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
            <select
                style={{
                    width: '100%',
                    padding: '0.65rem 0.8rem',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                }}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};
