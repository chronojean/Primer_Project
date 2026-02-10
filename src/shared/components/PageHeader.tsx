import React from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
    title: string | React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    compact?: boolean;
}

export const PageHeader = ({ title, actions, children, compact = false }: PageHeaderProps) => {
    return (
        <div
            className={[
                'page-header',
                styles.pageHeader,
                compact ? styles.pageHeaderCompact : ''
            ].filter(Boolean).join(' ')}
        >
            <div className={styles.pageHeaderTitleRow}>
                <h1 className={styles.pageHeaderTitle}>
                    {title}
                </h1>
                {children}
            </div>
            {actions && (
                <div className={styles.pageHeaderActions}>
                    {actions}
                </div>
            )}
        </div>
    );
};
