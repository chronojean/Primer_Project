import React from 'react';

// A simple table component
export const Table = ({ headers, children }: { headers: (string | React.ReactNode)[], children: React.ReactNode }) => {
    return (
        <div className="table-wrap">
            <table className="table">
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i}>
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
    <tr className="table-row">
        {children}
    </tr>
);

export const TableCell = ({ children, colSpan, className }: { children: React.ReactNode, colSpan?: number, className?: string }) => (
    <td colSpan={colSpan} className={['table-cell', className].filter(Boolean).join(' ')}>
        {children}
    </td>
);
