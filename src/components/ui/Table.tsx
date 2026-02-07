import React from 'react';

// A simple table component
export const Table = ({ headers, children }: { headers: (string | React.ReactNode)[], children: React.ReactNode }) => {
    return (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.5rem', boxShadow: 'var(--shadow-sm)', backgroundColor: 'white' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} style={{ padding: '0.875rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {children}
                </tbody>
            </table>
        </div>
    );
};

export const TableRow = ({ children }: { children: React.ReactNode }) => (
    <tr style={{ borderTop: '1px solid var(--border-color)', transition: 'background-color 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
        {children}
    </tr>
);

export const TableCell = ({ children, colSpan, style }: { children: React.ReactNode, colSpan?: number, style?: React.CSSProperties }) => (
    <td colSpan={colSpan} style={{ padding: '0.875rem 1rem', color: 'var(--text-primary)', overflowWrap: 'break-word', fontSize: '0.9rem', ...style }}>
        {children}
    </td>
);
