import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Student, Section, Attendance, Enrollment } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input, Select } from './ui/Input';
import { Pencil, Trash2, Plus, ClipboardList, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { PaymentsModule } from './PaymentsModule';
import { useConfirmation } from '../context/ConfirmationContext';

interface StudentsModuleProps {
    sectionId?: string;
    courseId?: string;
    hideHeader?: boolean;
}

export const StudentsModule = ({ sectionId, courseId, hideHeader = false }: StudentsModuleProps) => {
    const { showConfirmation } = useConfirmation();
    // Data
    const [students, setStudents] = useState<Student[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    // Form
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        birthDate: '',
        sex: '' as 'Male' | 'Female' | 'Other' | ''
    });

    useEffect(() => {
        loadData();
    }, [sectionId, courseId]);

    const formatStudentName = (name: string) => {
        const parts = name.split(' ');
        if (parts.length <= 1) return name;
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return `${last} ${first}`;
    };

    const loadData = () => {
        let allStudents = StorageService.getStudents();
        const allEnrollments = StorageService.getEnrollments();

        if (sectionId) {
            const sectionEnrollments = allEnrollments.filter(e => e.sectionId === sectionId);
            allStudents = allStudents.filter(s => sectionEnrollments.some(e => e.studentId === s.id));
        } else if (courseId) {
            const courseEnrollments = allEnrollments.filter(e => e.courseId === courseId);
            allStudents = allStudents.filter(s => courseEnrollments.some(e => e.studentId === s.id));
        }

        const sortedStudents = [...allStudents].sort((a, b) => {
            return formatStudentName(a.name).localeCompare(formatStudentName(b.name));
        });

        setStudents(sortedStudents);
        setSections(StorageService.getSections());
        setAttendanceData(StorageService.getAttendance());
        setEnrollments(allEnrollments);
    };

    const handleOpenModal = (student?: Student) => {
        if (student) {
            setEditingStudent(student);
            setFormData({
                name: student.name,
                email: student.email,
                phone: student.phone,
                birthDate: student.birthDate || '',
                sex: student.sex || ''
            });
        } else {
            setEditingStudent(null);
            setFormData({ name: '', email: '', phone: '', birthDate: '', sex: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStudent(null);
        setFormData({ name: '', email: '', phone: '', birthDate: '', sex: '' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const studentData = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            birthDate: formData.birthDate || undefined,
            sex: formData.sex as 'Male' | 'Female' | 'Other' | undefined
        };

        if (editingStudent) {
            StorageService.updateStudent({ ...editingStudent, ...studentData });
        } else {
            StorageService.addStudent({
                id: crypto.randomUUID(),
                ...studentData
            });
        }
        loadData();
        handleCloseModal();
    };

    const handleDeactivateFromTrash = async (student: Student) => {
        const confirmed = await showConfirmation({
            title: 'Mark Student Inactive?',
            message: `Are you sure you want to tag "${student.name}" as inactive?`,
            confirmLabel: 'Mark inactive',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        StorageService.addStudentStatusHistory({
            id: crypto.randomUUID(),
            studentId: student.id,
            isActive: false,
            changedAt: new Date().toISOString()
        });
        const enrollmentsForStudent = StorageService.getEnrollments().filter(e => e.studentId === student.id);
        enrollmentsForStudent.forEach(e => {
            StorageService.addSectionStudentStatusHistory({
                id: crypto.randomUUID(),
                studentId: student.id,
                sectionId: e.sectionId,
                isActive: false,
                changedAt: new Date().toISOString()
            });
        });
        loadData();
    };

    const handleToggleGlobalStatus = async (student: Student) => {
        const isActive = StorageService.getStudentActiveStatus(student.id);
        const confirmed = await showConfirmation({
            title: isActive ? 'Mark Student Inactive?' : 'Mark Student Active?',
            message: `Are you sure you want to ${isActive ? 'mark' : 'set'} "${student.name}" ${isActive ? 'inactive' : 'active'}?`,
            confirmLabel: isActive ? 'Mark inactive' : 'Mark active',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        StorageService.addStudentStatusHistory({
            id: crypto.randomUUID(),
            studentId: student.id,
            isActive: !isActive,
            changedAt: new Date().toISOString()
        });
        if (isActive) {
            const enrollmentsForStudent = StorageService.getEnrollments().filter(e => e.studentId === student.id);
            enrollmentsForStudent.forEach(e => {
                StorageService.addSectionStudentStatusHistory({
                    id: crypto.randomUUID(),
                    studentId: student.id,
                    sectionId: e.sectionId,
                    isActive: false,
                    changedAt: new Date().toISOString()
                });
            });
        }
        loadData();
    };

    const handleToggleSectionStatus = async (student: Student, section: Section) => {
        const isActive = StorageService.getSectionStudentActiveStatus(student.id, section.id);
        const confirmed = await showConfirmation({
            title: isActive ? 'Mark Student Inactive?' : 'Mark Student Active?',
            message: `Are you sure you want to ${isActive ? 'mark' : 'set'} "${student.name}" ${isActive ? 'inactive' : 'active'} in "${section.name}"?`,
            confirmLabel: isActive ? 'Mark inactive' : 'Mark active',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        StorageService.addSectionStudentStatusHistory({
            id: crypto.randomUUID(),
            studentId: student.id,
            sectionId: section.id,
            isActive: !isActive,
            changedAt: new Date().toISOString()
        });
        loadData();
    };

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return '-';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const getStudentOverallAttendance = (studentId: string) => {
        const studentEnrollments = enrollments.filter(e => e.studentId === studentId);
        if (studentEnrollments.length === 0) return { percent: 0, present: 0, total: 0 };

        let totalPresent = 0;
        let totalStudentRecords = 0;

        studentEnrollments.forEach(enrollment => {
            if (!StorageService.getEffectiveStudentStatus(studentId, enrollment.sectionId)) return;
            const sectionRecords = attendanceData.filter(a => a.sectionId === enrollment.sectionId);
            sectionRecords.forEach(record => {
                const studentRecord = record.records.find(r => r.studentId === studentId);
                if (studentRecord) {
                    totalStudentRecords++;
                    if (studentRecord.present) {
                        totalPresent++;
                    }
                }
            });
        });

        const percent = totalStudentRecords > 0 ? Math.round((totalPresent / totalStudentRecords) * 100) : 0;
        return { percent, present: totalPresent, total: totalStudentRecords };
    };

    const getStudentMetrics = (studentId: string) => {
        const studentEnrollments = enrollments.filter(e => e.studentId === studentId);
        const studentSections = sections.filter(s => studentEnrollments.some(e => e.sectionId === s.id));

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const activeSections = studentSections.filter(s => {
            if (!s.endDate) return true;
            return s.endDate >= today;
        });

        const finishedSections = studentSections.filter(s => {
            if (!s.endDate) return false;
            return s.endDate < today;
        });

        const calcAttendance = (sectionId: string) => {
            if (!StorageService.getEffectiveStudentStatus(studentId, sectionId)) {
                return { percent: 0, present: 0, total: 0 };
            }
            const sectionRecords = attendanceData.filter(a => a.sectionId === sectionId);
            const totalClasses = sectionRecords.length;
            if (totalClasses === 0) return { percent: 0, present: 0, total: 0 };

            let presentCount = 0;
            sectionRecords.forEach(record => {
                const studentRecord = record.records.find(r => r.studentId === studentId);
                if (studentRecord && studentRecord.present) {
                    presentCount++;
                }
            });

            return {
                percent: Math.round((presentCount / totalClasses) * 100),
                present: presentCount,
                total: totalClasses
            };
        };

        return { activeSections, finishedSections, calcAttendance };
    };

    const toggleStudentExpand = (studentId: string) => {
        setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
    };

    return (
        <div>
            {!hideHeader && (
                <div className="module-header" style={{ marginBottom: '2rem' }}>
                    <h1>Students</h1>
                    <div className="module-actions">
                        <Button onClick={() => handleOpenModal()}>
                            <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Student
                        </Button>
                    </div>
                </div>
            )}

            <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1.5fr 80px 80px 100px 1.5fr 100px', backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div></div>
                    <div>Name</div>
                    <div>Email</div>
                    <div>Age</div>
                    <div>Sex</div>
                    <div>Courses</div>
                    <div>Attendance</div>
                    <div>Actions</div>
                </div>

                {students.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No students found.
                    </div>
                ) : (
                    students.map(student => {
                        const attendanceStats = getStudentOverallAttendance(student.id);
                        const isExpanded = expandedStudentId === student.id;
                        const globalActive = StorageService.getStudentActiveStatus(student.id);

                        return (
                            <React.Fragment key={student.id}>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '40px 1.5fr 1.5fr 80px 80px 100px 1.5fr 100px',
                                        padding: '1rem',
                                        borderBottom: '1px solid var(--border-color)',
                                        backgroundColor: isExpanded ? '#f1f5f9' : 'transparent',
                                        alignItems: 'center',
                                        transition: 'background-color 0.2s',
                                        opacity: globalActive ? 1 : 0.65
                                    }}
                                >
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-expanded={isExpanded}
                                        aria-label={isExpanded ? 'Collapse student details' : 'Expand student details'}
                                        onClick={() => toggleStudentExpand(student.id)}
                                        style={{ padding: 0 }}
                                    >
                                        {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#94a3b8" />}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-expanded={isExpanded}
                                        onClick={() => toggleStudentExpand(student.id)}
                                        style={{ padding: 0, justifyContent: 'flex-start', color: 'var(--text-primary)' }}
                                    >
                                        {formatStudentName(student.name)}
                                    </Button>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{student.email}</div>
                                    <div style={{ fontSize: '0.875rem' }}>{calculateAge(student.birthDate)}</div>
                                    <div style={{ fontSize: '0.875rem' }}>{student.sex || '-'}</div>
                                    <div style={{ fontSize: '0.875rem' }}>
                                        {enrollments.filter(e => e.studentId === student.id).length}
                                    </div>
                                    <div>
                                        {attendanceStats.total > 0 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '0.25rem', height: '6px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${attendanceStats.percent}%`,
                                                        backgroundColor: attendanceStats.percent >= 75 ? '#10b981' : attendanceStats.percent >= 50 ? '#f59e0b' : '#ef4444',
                                                        height: '100%'
                                                    }}></div>
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: attendanceStats.percent >= 75 ? '#10b981' : attendanceStats.percent >= 50 ? '#f59e0b' : '#ef4444' }}>
                                                    {attendanceStats.percent}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>N/A</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {!globalActive && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleToggleGlobalStatus(student)}
                                                aria-label="Mark student active"
                                            >
                                                Activate
                                            </Button>
                                        )}
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenModal(student)} aria-label="Edit student">
                                            <Pencil size={14} />
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDeactivateFromTrash(student)} aria-label="Mark student inactive">
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ padding: '2rem', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                            {/* Left: Course & Attendance History */}
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <ClipboardList size={18} /> Course History
                                                </h3>
                                                {(() => {
                                                    const { activeSections, finishedSections, calcAttendance } = getStudentMetrics(student.id);

                                                    const SectionRow = ({ section, status }: { section: Section, status: string }) => {
                                                        const globalActive = StorageService.getStudentActiveStatus(student.id);
                                                        const sectionActive = StorageService.getSectionStudentActiveStatus(student.id, section.id);
                                                        const effectiveActive = globalActive && sectionActive;
                                                        const statusLabel = !globalActive
                                                            ? 'Inactive (Global)'
                                                            : !sectionActive
                                                                ? 'Inactive'
                                                                : status;
                                                        const stats = calcAttendance(section.id);
                                                        return (
                                                            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginBottom: '0.75rem', boxShadow: 'var(--shadow-sm)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                                    <div style={{ fontWeight: 600 }}>{section.name}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', backgroundColor: statusLabel === 'Active' ? '#f0fdf4' : '#f8fafc', color: statusLabel === 'Active' ? '#16a34a' : '#64748b', border: '1px solid currentColor', opacity: 0.8 }}>
                                                                            {statusLabel}
                                                                        </span>
                                                                        <Button
                                                                            size="sm"
                                                                            variant={effectiveActive ? 'danger' : 'secondary'}
                                                                            onClick={() => handleToggleSectionStatus(student, section)}
                                                                        >
                                                                            {effectiveActive ? 'Deactivate' : 'Activate'}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '0.25rem', height: '6px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${stats.percent}%`, backgroundColor: stats.percent >= 75 ? '#10b981' : stats.percent >= 50 ? '#f59e0b' : '#ef4444', height: '100%' }}></div>
                                                                    </div>
                                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{stats.percent}% Att.</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    };

                                                    return (
                                                        <>
                                                            {activeSections.length > 0 && activeSections.map(s => <SectionRow key={s.id} section={s} status="Active" />)}
                                                            {finishedSections.length > 0 && finishedSections.map(s => <SectionRow key={s.id} section={s} status="Past" />)}
                                                            {activeSections.length === 0 && finishedSections.length === 0 && (
                                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '0.5rem' }}>No courses enrolled</div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            {/* Right: Payment History */}
                                            <div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <DollarSign size={18} /> Payment History
                                                </h3>
                                                <PaymentsModule studentId={student.id} hideHeader={true} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingStudent ? 'Edit Student' : 'Add Student'}
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
                        label="Phone"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input
                            label="Birth Date"
                            type="date"
                            value={formData.birthDate}
                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        />
                        <Select
                            label="Sex"
                            value={formData.sex}
                            onChange={e => setFormData({ ...formData, sex: e.target.value as any })}
                            options={[
                                { value: '', label: 'Select Sex' },
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' },
                                { value: 'Other', label: 'Other' },
                            ]}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingStudent ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
