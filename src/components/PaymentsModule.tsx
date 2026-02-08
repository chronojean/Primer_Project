import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Payment, Student } from '../types';
import { Button } from './ui/Button';
import { Table, TableRow, TableCell } from './ui/Table';
import { Modal } from './ui/Modal';
import { Input, Select } from './ui/Input';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface PaymentsModuleProps {
    studentId?: string;
    hideHeader?: boolean;
}

export const PaymentsModule = ({ studentId, hideHeader = false }: PaymentsModuleProps) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [sortField, setSortField] = useState<'date' | 'student' | 'concept' | 'amount'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        studentId: studentId || '',
        amount: '',
        concept: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        loadData();
    }, [studentId]);

    const loadData = () => {
        let allPayments = StorageService.getPayments();
        if (studentId) {
            allPayments = allPayments.filter(p => p.studentId === studentId);
        }
        setPayments(allPayments.reverse()); // Show newest first
        setStudents(StorageService.getStudents());
    };

    const handleOpenModal = () => {
        setFormData({
            studentId: studentId || '',
            amount: '',
            concept: '',
            date: new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        StorageService.addPayment({
            id: crypto.randomUUID(),
            studentId: formData.studentId,
            amount: parseFloat(formData.amount),
            concept: formData.concept,
            date: formData.date
        });

        loadData();
        handleCloseModal();
    };

    const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown';

    const getSortedPayments = () => {
        let sorted = [...payments];

        if (sortField === 'date') {
            sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else if (sortField === 'student') {
            sorted.sort((a, b) => getStudentName(a.studentId).localeCompare(getStudentName(b.studentId)));
        } else if (sortField === 'concept') {
            sorted.sort((a, b) => a.concept.localeCompare(b.concept));
        } else if (sortField === 'amount') {
            sorted.sort((a, b) => a.amount - b.amount);
        }

        if (sortDirection === 'desc') {
            sorted.reverse();
        }

        return sorted;
    };

    const handleSort = (field: 'date' | 'student' | 'concept' | 'amount') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: 'date' | 'student' | 'concept' | 'amount' }) => {
        if (sortField !== field) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    return (
        <div>
            {!hideHeader && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>Payments</h1>
                    <Button onClick={handleOpenModal}>
                        <Plus size={16} style={{ marginRight: '0.5rem' }} /> Record Payment
                    </Button>
                </div>
            )}

            <Table headers={[
                <button
                    type="button"
                    onClick={() => handleSort('date')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                >
                    Date <SortIcon field="date" />
                </button>,
                !studentId && (
                    <button
                        type="button"
                        onClick={() => handleSort('student')}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                    >
                        Student <SortIcon field="student" />
                    </button>
                ),
                <button
                    type="button"
                    onClick={() => handleSort('concept')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                >
                    Concept <SortIcon field="concept" />
                </button>,
                <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                >
                    Amount <SortIcon field="amount" />
                </button>
            ].filter(Boolean)}>
                {getSortedPayments().map(payment => (
                    <TableRow key={payment.id}>
                        <TableCell>{payment.date}</TableCell>
                        {!studentId && (
                            <TableCell>
                                <span style={{ fontWeight: 500, color: '#fff' }}>{getStudentName(payment.studentId)}</span>
                            </TableCell>
                        )}
                        <TableCell>{payment.concept}</TableCell>
                        <TableCell>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                ${payment.amount.toFixed(2)}
                            </span>
                        </TableCell>
                    </TableRow>
                ))}
                {payments.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={studentId ? 3 : 4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            No payments recorded.
                        </TableCell>
                    </TableRow>
                )}
            </Table>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title="Record Payment"
            >
                <form onSubmit={handleSubmit}>
                    {!studentId && (
                        <Select
                            label="Student"
                            value={formData.studentId}
                            onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                            options={[
                                { value: '', label: 'Select Student' },
                                ...students.map(s => ({ value: s.id, label: s.name }))
                            ]}
                            required
                        />
                    )}
                    <Input
                        label="Amount ($)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        required
                    />
                    <Input
                        label="Concept"
                        value={formData.concept}
                        onChange={e => setFormData({ ...formData, concept: e.target.value })}
                        placeholder="e.g. Monthly Fee - April"
                        required
                    />
                    <Input
                        label="Date"
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        required
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">Save Payment</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
