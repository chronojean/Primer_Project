import React, { useState, useEffect } from 'react';
import { StorageService } from '../../shared/utils/storage';
import { Payment, Student } from '../../shared/utils/types';
import { Button } from '../../shared/components/Button';
import { Table, TableRow, TableCell } from '../../shared/components/Table';
import { Modal } from '../../shared/components/Modal';
import { Input, Select } from '../../shared/components/Input';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import styles from './PaymentsModule.module.css';
import { PageHeader } from '../../shared/components/PageHeader';

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
        if (sortField !== field) return <ArrowUpDown size={14} className={styles.sortIconMuted} />;
        return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    return (
        <div>
            {!hideHeader && (
                <PageHeader
                    title="Payments"
                    actions={
                        <Button onClick={handleOpenModal}>
                            <Plus size={16} className={styles.buttonIcon} /> Record Payment
                        </Button>
                    }
                />
            )}

            <Table headers={[
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('date')}
                    className={styles.sortButton}
                >
                    Date <SortIcon field="date" />
                </Button>,
                !studentId && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('student')}
                        className={styles.sortButton}
                    >
                        Student <SortIcon field="student" />
                    </Button>
                ),
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('concept')}
                    className={styles.sortButton}
                >
                    Concept <SortIcon field="concept" />
                </Button>,
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('amount')}
                    className={styles.sortButton}
                >
                    Amount <SortIcon field="amount" />
                </Button>
            ].filter(Boolean)}>
                {getSortedPayments().map(payment => (
                    <TableRow key={payment.id}>
                        <TableCell>{payment.date}</TableCell>
                        {!studentId && (
                            <TableCell>
                                <span className={styles.studentName}>{getStudentName(payment.studentId)}</span>
                            </TableCell>
                        )}
                        <TableCell>{payment.concept}</TableCell>
                        <TableCell>
                            <span className={styles.amountValue}>
                                ${payment.amount.toFixed(2)}
                            </span>
                        </TableCell>
                    </TableRow>
                ))}
                {payments.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={studentId ? 3 : 4} className={styles.emptyCell}>
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
                    <div className={styles.formActions}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">Save Payment</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
