import React from 'react';


interface PageHeaderProps {
    title: string | React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    compact?: boolean;
}

export const PageHeader = ({ title, actions, children, compact = false }: PageHeaderProps) => {
    return (
        <div className="page-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: compact ? 0 : 'var(--space-4)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <h1 style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 'var(--font-weight-bold)',
                    margin: 0
                }}>
                    {title}
                </h1>
                {children}
            </div>
            {actions && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                }}>
                    {actions}
                </div>
            )}
        </div>
    );
};
