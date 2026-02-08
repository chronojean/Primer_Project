import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Professor } from '../types';
import { Button } from './ui/Button';
import { Table, TableRow, TableCell } from './ui/Table';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Pencil, Trash2, Plus, UserCheck, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ProfessorsModuleProps {
    hideHeader?: boolean;
}

export const ProfessorsModule = ({ hideHeader = false }: ProfessorsModuleProps) => {
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

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this professor?')) {
            StorageService.deleteProfessor(id);
            loadProfessors();
        }
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
        if (sortField !== field) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    return (
        <div>
            {!hideHeader && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>Professors</h1>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Professor
                    </Button>
                </div>
            )}

            <Table headers={[
                <button
                    type="button"
                    onClick={() => handleSort('name')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                >
                    Name <SortIcon field="name" />
                </button>,
                <button
                    type="button"
                    onClick={() => handleSort('email')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                >
                    Email <SortIcon field="email" />
                </button>,
                <button
                    type="button"
                    onClick={() => handleSort('specialization')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit' }}
                >
                    Specialization <SortIcon field="specialization" />
                </button>,
                'Actions'
            ]}>
                {getSortedProfessors().map(professor => (
                    <TableRow key={professor.id}>
                        <TableCell>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserCheck size={16} color="#fbbf24" />
                                </div>
                                <span style={{ fontWeight: 500, color: '#fff' }}>{professor.name}</span>
                            </div>
                        </TableCell>
                        <TableCell>{professor.email}</TableCell>
                        <TableCell>{professor.specialization}</TableCell>
                        <TableCell>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                        <TableCell colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingProfessor ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
