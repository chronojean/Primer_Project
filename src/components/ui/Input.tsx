import React, { InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = ({ label, id, ...props }: InputProps) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
        <div style={{ marginBottom: '1rem' }}>
            {label && <label htmlFor={inputId} style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
            <input
                id={inputId}
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

export const Select = ({ label, options, id, ...props }: SelectProps) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    return (
        <div style={{ marginBottom: '1rem' }}>
            {label && <label htmlFor={selectId} style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
            <select
                id={selectId}
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
