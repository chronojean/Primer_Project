import React, { useState, useEffect } from 'react';
import { StorageService } from '../../shared/utils/storage';
import { Professor } from '../../shared/utils/types';
import { Button } from '../../shared/components/Button';
import { PageHeader } from '../../shared/components/PageHeader';
import { Table, TableRow, TableCell } from '../../shared/components/Table';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { Pencil, Trash2, Plus, UserCheck, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useConfirmation } from '../../shared/hooks/useConfirmation';
import styles from './ProfessorsModule.module.css';

interface ProfessorsModuleProps {
    hideHeader?: boolean;
}

export const ProfessorsModule = ({ hideHeader = false }: ProfessorsModuleProps) => {
    const { showConfirmation } = useConfirmation();
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProfessor, setEditingProfessor] = useState<Professor | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', specialization: '' });
    const [sortField, setSortField] = useState<'name' | 'email' | 'specialization'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        loadProfessors();
    }, []);

    const loadProfessors = () => {
        setProfessors(StorageService.getProfessors());
    };

    const handleOpenModal = (professor?: Professor) => {
        if (professor) {
            setEditingProfessor(professor);
            setFormData({ name: professor.name, email: professor.email, specialization: professor.specialization });
        } else {
            setEditingProfessor(null);
            setFormData({ name: '', email: '', specialization: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProfessor(null);
        setFormData({ name: '', email: '', specialization: '' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingProfessor) {
            StorageService.deleteProfessor(editingProfessor.id);
            StorageService.addProfessor({
                id: editingProfessor.id,
                ...formData
            });
        } else {
            StorageService.addProfessor({
                id: crypto.randomUUID(),
                ...formData
            });
        }
        loadProfessors();
        handleCloseModal();
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirmation({
            title: 'Delete Professor?',
            message: 'Are you sure you want to delete this professor?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        StorageService.deleteProfessor(id);
        loadProfessors();
    };

    const getSortedProfessors = () => {
        let sorted = [...professors];

        if (sortField === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortField === 'email') {
            sorted.sort((a, b) => a.email.localeCompare(b.email));
        } else if (sortField === 'specialization') {
            sorted.sort((a, b) => a.specialization.localeCompare(b.specialization));
        }

        if (sortDirection === 'desc') {
            sorted.reverse();
        }

        return sorted;
    };

    const handleSort = (field: 'name' | 'email' | 'specialization') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: 'name' | 'email' | 'specialization' }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className={styles.sortIconMuted} />;
        return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    return (
        <div>
            {!hideHeader && (
                <PageHeader
                    title="Professors"
                    actions={
                        <Button onClick={() => handleOpenModal()}>
                            <Plus size={16} className={styles.buttonIcon} /> Add Professor
                        </Button>
                    }
                />
            )}

            <Table headers={[
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('name')}
                    className={styles.sortButton}
                >
                    Name <SortIcon field="name" />
                </Button>,
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('email')}
                    className={styles.sortButton}
                >
                    Email <SortIcon field="email" />
                </Button>,
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('specialization')}
                    className={styles.sortButton}
                >
                    Specialization <SortIcon field="specialization" />
                </Button>,
                'Actions'
            ]}>
                {getSortedProfessors().map(professor => (
                    <TableRow key={professor.id}>
                        <TableCell>
                            <div className={styles.professorRow}>
                                <div className={styles.professorAvatar}>
                                    <UserCheck size={16} color="#fbbf24" />
                                </div>
                                <span className={styles.professorName}>{professor.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{professor.email}</TableCell>
                        <TableCell>{professor.specialization}</TableCell>
                        <TableCell>
                            <div className={styles.actionGroup}>
                                <Button size="sm" variant="secondary" onClick={() => handleOpenModal(professor)} aria-label="Edit professor">
                                    <Pencil size={14} />
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => handleDelete(professor.id)} aria-label="Delete professor">
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
                {professors.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className={styles.emptyCell}>
                            No professors found.
                        </TableCell>
                    </TableRow>
                )}
            </Table>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProfessor ? 'Edit Professor' : 'Add Professor'}
            >
                <form onSubmit={handleSubmit}>
                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                    <Input
                        label="Specialization"
                        value={formData.specialization}
                        onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                        required
                    />
                    <div className={styles.formActions}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingProfessor ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
