import React, { InputHTMLAttributes, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Input = ({ label, id, ...props }: InputProps) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
        <div className="field">
            {label && <label htmlFor={inputId} className="field-label">{label}</label>}
            <input
                id={inputId}
                className="field-input"
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
        <div className="field">
            {label && <label htmlFor={selectId} className="field-label">{label}</label>}
            <select
                id={selectId}
                className="field-select"
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};
