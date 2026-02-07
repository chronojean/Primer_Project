import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Section, Course, Professor, Student, Enrollment, Attendance } from '../types';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input, Select } from './ui/Input';
import { Trash2, Plus, Pencil, Users, User, ArrowRightLeft, UserCheck, ArrowLeft } from 'lucide-react';

interface SectionsModuleProps {
    courseId?: string;
    hideHeader?: boolean;
    onSelectSection?: (sectionId: string) => void;
}

export const SectionsModule = ({ courseId, hideHeader = false, onSelectSection }: SectionsModuleProps) => {
    const [sections, setSections] = useState<Section[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [formData, setFormData] = useState({
        courseId: courseId || '',
        professorId: '',
        name: '',
        days: [] as string[],
        startTime: '',
        endTime: '',
        startDate: '',
        endDate: '',
        roomId: '',
        selectedStudentIds: [] as string[]
    });
    const [error, setError] = useState('');

    const daysOfWeek = [
        { value: 'Mon', label: 'Mon' },
        { value: 'Tue', label: 'Tue' },
        { value: 'Wed', label: 'Wed' },
        { value: 'Thu', label: 'Thu' },
        { value: 'Fri', label: 'Fri' },
        { value: 'Sat', label: 'Sat' },
        { value: 'Sun', label: 'Sun' },
    ];

    useEffect(() => {
        loadData();
    }, [courseId]);

    const loadData = () => {
        let allSections = StorageService.getSections();
        if (courseId) {
            allSections = allSections.filter(s => s.courseId === courseId);
        }
        setSections(allSections);
        setCourses(StorageService.getCourses());
        setProfessors(StorageService.getProfessors());
        setEnrollments(StorageService.getEnrollments());
        setAttendance(StorageService.getAttendance());
    };

    const handleOpenModal = (e?: React.MouseEvent, section?: Section) => {
        if (e) e.stopPropagation();
        setError('');
        if (section) {
            setEditingSection(section);
            const currentEnrolledIds = StorageService.getStudentsInSection(section.id).map(s => s.id);
            setFormData({
                courseId: section.courseId,
                professorId: section.professorId || '',
                name: section.name,
                days: section.days || [],
                startTime: section.startTime || '',
                endTime: section.endTime || '',
                startDate: section.startDate || '',
                endDate: section.endDate || '',
                roomId: section.roomId,
                selectedStudentIds: currentEnrolledIds
            });
        } else {
            setEditingSection(null);
            setFormData({
                courseId: courseId || (courses.length > 0 ? courses[0].id : ''),
                professorId: '',
                name: '',
                days: [],
                startTime: '',
                endTime: '',
                startDate: '',
                endDate: '',
                roomId: '',
                selectedStudentIds: []
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSection(null);
        setError('');
    };

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const toggleStudent = (studentId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedStudentIds: prev.selectedStudentIds.includes(studentId)
                ? prev.selectedStudentIds.filter(id => id !== studentId)
                : [...prev.selectedStudentIds, studentId]
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.days.length === 0) {
            setError('Please select at least one day.');
            return;
        }

        try {
            const sectionData = {
                courseId: formData.courseId,
                professorId: formData.professorId || null,
                name: formData.name,
                days: formData.days,
                startTime: formData.startTime,
                endTime: formData.endTime,
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined,
                roomId: formData.roomId
            };

            let sectionId = editingSection ? editingSection.id : crypto.randomUUID();

            if (editingSection) {
                StorageService.deleteSection(editingSection.id);
                sectionId = editingSection.id;
                StorageService.addSection({
                    id: sectionId,
                    ...sectionData
                });
            } else {
                StorageService.addSection({
                    id: sectionId,
                    ...sectionData
                });
            }

            const currentEnrollments = editingSection ? StorageService.getStudentsInSection(sectionId) : [];
            const currentStudentIds = currentEnrollments.map(s => s.id);

            const toAdd = formData.selectedStudentIds.filter(id => !currentStudentIds.includes(id));
            const toRemove = currentStudentIds.filter(id => !formData.selectedStudentIds.includes(id));

            for (const studentId of toAdd) {
                StorageService.enrollStudent({
                    id: crypto.randomUUID(),
                    studentId,
                    sectionId,
                    courseId: formData.courseId,
                    enrolledAt: new Date().toISOString()
                });
            }

            for (const studentId of toRemove) {
                StorageService.unenrollStudent(sectionId, studentId);
            }

            loadData();
            handleCloseModal();
        } catch (err: any) {
            setError(err.message);
            if (editingSection) loadData();
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this section?')) {
            StorageService.deleteSection(id);
            loadData();
        }
    };

    const getStudentCount = (sectionId: string) => {
        return enrollments.filter(e => e.sectionId === sectionId).length;
    };

    const isStudentUnavailable = (studentId: string) => {
        if (!formData.courseId) return false;
        const existingEnrollment = enrollments.find(e =>
            e.studentId === studentId &&
            e.courseId === formData.courseId
        );
        if (existingEnrollment) {
            return existingEnrollment.sectionId !== (editingSection?.id || 'new');
        }
        return false;
    };

    const getSectionAttendanceStats = (sectionId: string) => {
        const sectionAttendance = attendance.filter(a => a.sectionId === sectionId);
        let totalPresent = 0;
        let totalRecords = 0;
        sectionAttendance.forEach(a => {
            totalRecords += a.records.length;
            totalPresent += a.records.filter(r => r.present).length;
        });
        const percentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        return { present: totalPresent, total: totalRecords, percentage };
    };

    const getProfessorName = (id?: string | null) => {
        if (!id) return 'Assign Professor';
        return professors.find(p => p.id === id)?.name || 'Unknown Professor';
    };

    const studentsForEnrollment = StorageService.getStudents();

    return (
        <div>
            {!hideHeader && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h1>Sections</h1>
                    <Button onClick={() => handleOpenModal()}>
                        <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Section
                    </Button>
                </div>
            )}

            {courseId && hideHeader && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Manage Sections</h2>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {sections.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '0.75rem' }}>
                        No sections found.
                    </div>
                ) : (
                    sections.map(section => {
                        const attStats = getSectionAttendanceStats(section.id);
                        const studentCount = getStudentCount(section.id);
                        const profName = getProfessorName(section.professorId);

                        return (
                            <div
                                key={section.id}
                                onClick={() => onSelectSection?.(section.id)}
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    const target = e.currentTarget as HTMLElement;
                                    target.style.transform = 'translateY(-4px)';
                                    target.style.boxShadow = 'var(--shadow-md)';
                                    target.style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                    const target = e.currentTarget as HTMLElement;
                                    target.style.transform = 'none';
                                    target.style.boxShadow = 'var(--shadow-sm)';
                                    target.style.borderColor = 'var(--border-color)';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-hover)', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {section.roomId ? `Room ${section.roomId}` : 'No Room'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <Button size="sm" variant="ghost" onClick={(e) => handleOpenModal(e, section)} style={{ padding: '0.4rem' }}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={(e) => handleDelete(e, section.id)} style={{ padding: '0.4rem', color: '#ef4444' }}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 600 }}>{section.name}</h3>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <User size={14} />
                                        {profName}
                                    </div>
                                </div>

                                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {section.days?.join(', ')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {section.startTime} - {section.endTime}
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                                        <Users size={16} color="var(--text-secondary)" />
                                        <span style={{ fontWeight: 600 }}>{studentCount} Students</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Attendance</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: attStats.percentage >= 75 ? '#10b981' : attStats.percentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                                            {attStats.percentage}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Add Section Card Placeholder */}
                <div
                    onClick={() => handleOpenModal()}
                    style={{
                        backgroundColor: 'transparent',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '2px dashed var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        color: 'var(--text-secondary)',
                        transition: 'all 0.2s',
                        minHeight: '200px'
                    }}
                    onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.borderColor = 'var(--primary)';
                        target.style.color = 'var(--primary)';
                        target.style.backgroundColor = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.borderColor = 'var(--border-color)';
                        target.style.color = 'var(--text-secondary)';
                        target.style.backgroundColor = 'transparent';
                    }}
                >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={24} />
                    </div>
                    <span style={{ fontWeight: 600 }}>Add New Section</span>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSection ? 'Edit Section' : 'Add Section'}
            >
                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <Select
                        label="Course"
                        value={formData.courseId}
                        onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                        options={courses.map(c => ({ value: c.id, label: c.name }))}
                        required
                        disabled={!!editingSection || !!courseId}
                    />
                    <Select
                        label="Professor"
                        value={formData.professorId}
                        onChange={e => setFormData({ ...formData, professorId: e.target.value })}
                        options={[{ value: '', label: 'Select Professor' }, ...professors.map(p => ({ value: p.id, label: p.name }))]}
                    />
                    <Input
                        label="Section Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#d4d4d8' }}>Days</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {daysOfWeek.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleDay(day.value)}
                                    style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '0.375rem',
                                        border: '1px solid',
                                        borderColor: formData.days.includes(day.value) ? '#646cff' : '#3f3f46',
                                        backgroundColor: formData.days.includes(day.value) ? '#646cff' : 'transparent',
                                        color: formData.days.includes(day.value) ? 'white' : '#a1a1aa',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input
                            label="Start Time"
                            type="time"
                            value={formData.startTime}
                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                            required
                        />
                        <Input
                            label="End Time"
                            type="time"
                            value={formData.endTime}
                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input
                            label="Start Date"
                            type="date"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        />
                        <Input
                            label="End Date"
                            type="date"
                            value={formData.endDate}
                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        />
                    </div>

                    <Input
                        label="Room"
                        value={formData.roomId}
                        onChange={e => setFormData({ ...formData, roomId: e.target.value })}
                        required
                    />

                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>Enroll Students</label>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.5rem', backgroundColor: 'var(--bg-primary)' }}>
                            {(() => {
                                const availableStudents = studentsForEnrollment.filter(s => !isStudentUnavailable(s.id));
                                if (availableStudents.length === 0) {
                                    return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: '1rem 0' }}>No students available for this course.</p>;
                                }
                                return availableStudents.map(student => (
                                    <div key={student.id} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', borderRadius: '0.25rem', transition: 'background-color 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`student-${student.id}`}
                                            checked={formData.selectedStudentIds.includes(student.id)}
                                            onChange={() => toggleStudent(student.id)}
                                            style={{ marginRight: '0.75rem', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                        />
                                        <label htmlFor={`student-${student.id}`} style={{ cursor: 'pointer', flex: 1, color: 'var(--text-primary)' }}>
                                            {student.name}
                                        </label>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingSection ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

// --- New Component for Section Details ---

interface SectionDetailProps {
    sectionId: string;
    onBack?: () => void;
    onUnsavedChanges?: (hasUnsaved: boolean) => void;
}

export const SectionDetail = ({ sectionId, onBack, onUnsavedChanges }: SectionDetailProps) => {
    const [section, setSection] = useState<Section | null>(null);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [allSections, setAllSections] = useState<Section[]>([]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [pendingTransfers, setPendingTransfers] = useState<{ [studentId: string]: string }>({});
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferringStudent, setTransferringStudent] = useState<{ student: Student; fromSection: Section } | null>(null);
    const [isBulkTransfer, setIsBulkTransfer] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        loadData();
        setSelectedIds([]);
        setPendingTransfers({});
        setStatusMessage('');
    }, [sectionId]);

    useEffect(() => {
        onUnsavedChanges?.(Object.keys(pendingTransfers).length > 0);
    }, [pendingTransfers, onUnsavedChanges]);

    const loadData = () => {
        const sections = StorageService.getSections();
        setAllSections(sections);
        const foundSection = sections.find(s => s.id === sectionId);
        setSection(foundSection || null);

        setAttendance(StorageService.getAttendance());
        setCourses(StorageService.getCourses());
    };

    if (!section) return <div>Section not found.</div>;

    const formatStudentName = (name: string) => {
        const parts = name.split(' ');
        if (parts.length <= 1) return name;
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return `${last} ${first}`;
    };

    const calculateAge = (birthDate?: string) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const getSectionStudents = (sectionId: string) => {
        const students = StorageService.getStudentsInSection(sectionId);
        return [...students].sort((a, b) => {
            const nameA = formatStudentName(a.name);
            const nameB = formatStudentName(b.name);
            return nameA.localeCompare(nameB);
        });
    };

    const getStudentAttendanceInSection = (studentId: string, sectionId: string) => {
        const sectionAttendance = attendance.filter(a => a.sectionId === sectionId);
        let totalStudentRecords = 0;
        let presentCount = 0;

        sectionAttendance.forEach(record => {
            const studentRecord = record.records.find(r => r.studentId === studentId);
            if (studentRecord) {
                totalStudentRecords++;
                if (studentRecord.present) {
                    presentCount++;
                }
            }
        });

        const percentage = totalStudentRecords > 0 ? Math.round((presentCount / totalStudentRecords) * 100) : 0;
        return { present: presentCount, total: totalStudentRecords, percentage };
    };

    const getOtherSectionsForCourse = (courseId: string, currentSectionId: string) => {
        return allSections.filter(s => s.courseId === courseId && s.id !== currentSectionId);
    };

    const handleOpenTransferModal = (student: Student, fromSection: Section) => {
        setTransferringStudent({ student, fromSection });
        setIsBulkTransfer(false);
        setIsTransferModalOpen(true);
    };

    const handleOpenBulkTransferModal = () => {
        setIsBulkTransfer(true);
        setIsTransferModalOpen(true);
    };

    const handleTransferStudent = (toSectionId: string) => {
        const studentsToStage = isBulkTransfer
            ? enrolledStudents.filter(s => selectedIds.includes(s.id))
            : transferringStudent ? [transferringStudent.student] : [];

        if (studentsToStage.length === 0) return;

        const newPending = { ...pendingTransfers };
        studentsToStage.forEach(student => {
            newPending[student.id] = toSectionId;
        });

        setPendingTransfers(newPending);
        setIsTransferModalOpen(false);
        setTransferringStudent(null);
        setIsBulkTransfer(false);
        setSelectedIds([]);
    };

    const cancelTransfer = (studentId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newPending = { ...pendingTransfers };
        delete newPending[studentId];
        setPendingTransfers(newPending);
    };

    const handleSaveTransfers = () => {
        const studentIds = Object.keys(pendingTransfers);
        if (studentIds.length === 0) return;

        const fromSection = section;
        const allEnrollments = StorageService.getEnrollments();
        const allAttendance = StorageService.getAttendance();
        let updatedAttendance = [...allAttendance];

        studentIds.forEach(studentId => {
            const toSectionId = pendingTransfers[studentId];
            const enrollment = allEnrollments.find(e => e.studentId === studentId && e.sectionId === fromSection.id);

            if (enrollment) {
                StorageService.unenrollStudent(fromSection.id, studentId);
                StorageService.enrollStudent({
                    ...enrollment,
                    id: crypto.randomUUID(),
                    sectionId: toSectionId
                });

                allAttendance.forEach((att, attIndex) => {
                    if (att.sectionId === fromSection.id) {
                        const studentRecord = att.records.find(r => r.studentId === studentId);
                        if (studentRecord) {
                            const updatedRecords = att.records.filter(r => r.studentId !== studentId);
                            updatedAttendance[attIndex] = { ...att, records: updatedRecords };

                            let targetAttIndex = updatedAttendance.findIndex(a => a.sectionId === toSectionId && a.date === att.date);

                            if (targetAttIndex >= 0) {
                                const targetAtt = updatedAttendance[targetAttIndex];
                                if (!targetAtt.records.find(r => r.studentId === studentId)) {
                                    const newRecords = [...targetAtt.records, studentRecord];
                                    updatedAttendance[targetAttIndex] = { ...targetAtt, records: newRecords };
                                }
                            } else {
                                const newAtt: Attendance = {
                                    id: crypto.randomUUID(),
                                    sectionId: toSectionId,
                                    date: att.date,
                                    records: [studentRecord]
                                };
                                updatedAttendance.push(newAtt);
                            }
                        }
                    }
                });
            }
        });

        StorageService.saveData('academy_attendance', updatedAttendance);

        setPendingTransfers({});
        setStatusMessage('Changes saved successfully!');
        setTimeout(() => setStatusMessage(''), 2000);
        loadData();
    };

    const toggleSelection = (studentId: string) => {
        setSelectedIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === enrolledStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(enrolledStudents.map(s => s.id));
        }
    };

    const enrolledStudents = getSectionStudents(section.id);
    const otherSections = getOtherSectionsForCourse(section.courseId, section.id);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {onBack && (
                        <Button variant="secondary" size="sm" onClick={onBack} style={{ padding: '0.5rem' }}>
                            <ArrowLeft size={16} />
                        </Button>
                    )}
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{section.name}</h2>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{courses.find(c => c.id === section.courseId)?.name}</span>
                    </div>
                </div>
                <div style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={16} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>{enrolledStudents.length} Students</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <UserCheck size={16} color="#10b981" />
                        <span style={{ fontWeight: 600 }}>Active</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {enrolledStudents.length > 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        padding: '1rem 1.5rem',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        marginBottom: '0.5rem',
                        gap: '1.25rem',
                        flexWrap: 'wrap'
                    }}>
                        {/* Status Message */}
                        {statusMessage && (
                            <div style={{ marginRight: 'auto' }}>
                                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <UserCheck size={16} /> {statusMessage}
                                </span>
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {selectedIds.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', borderRight: '1px solid var(--border-color)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', animation: 'pulse 2s infinite' }}></div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {selectedIds.length} Selected
                                    </span>
                                </div>
                            )}

                            <Button size="sm" variant="secondary" onClick={selectAll} style={{ fontWeight: 600 }}>
                                Select All
                            </Button>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedIds([])}
                                disabled={selectedIds.length === 0}
                                style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                                Clear
                            </Button>
                        </div>

                        <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)', margin: '0 0.25rem' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Button
                                size="sm"
                                onClick={handleOpenBulkTransferModal}
                                disabled={selectedIds.length === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                            >
                                <ArrowRightLeft size={16} /> Bulk Transfer
                            </Button>

                            <Button
                                onClick={handleSaveTransfers}
                                disabled={Object.keys(pendingTransfers).length === 0}
                                size="sm"
                                style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                                <UserCheck size={16} /> Save Changes
                            </Button>
                        </div>
                    </div>
                )}

                {enrolledStudents.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '0.75rem' }}>
                        No students enrolled in this section.
                    </div>
                ) : (
                    enrolledStudents.map(student => {
                        const attStats = getStudentAttendanceInSection(student.id, section.id);
                        const isSelected = selectedIds.includes(student.id);
                        const isPending = !!pendingTransfers[student.id];

                        return (
                            <div
                                key={student.id}
                                onClick={() => toggleSelection(student.id)}
                                style={{
                                    backgroundColor: isPending ? '#1e3a8a' : (isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)'),
                                    borderRadius: '0.75rem',
                                    padding: '1.5rem',
                                    border: isPending ? '2px solid #312e81' : (isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)'),
                                    boxShadow: isPending ? '0 0 0 3px rgba(30, 58, 138, 0.2), var(--shadow-sm)' : (isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)'),
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transform: isPending ? 'scale(1.02)' : 'none',
                                    color: isPending ? 'white' : 'inherit'
                                }}
                            >
                                {(isSelected || isPending) && (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                        <UserCheck size={20} color={isPending ? 'white' : 'var(--primary)'} />
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        backgroundColor: isPending ? 'rgba(255,255,255,0.2)' : (isSelected ? 'var(--primary)' : 'var(--bg-hover)'),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        color: (isPending || isSelected) ? 'white' : 'var(--primary)',
                                        fontWeight: 700,
                                        fontSize: '1.1rem',
                                        transition: 'all 0.2s'
                                    }}>
                                        {formatStudentName(student.name).charAt(0)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: isPending ? 'white' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '1rem' }}>
                                            {formatStudentName(student.name)}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: isPending ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                                            {calculateAge(student.birthDate)} yrs • {student.sex || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isPending ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>Section Attendance</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isPending ? 'white' : (attStats.percentage >= 75 ? '#10b981' : attStats.percentage >= 50 ? '#f59e0b' : '#ef4444') }}>
                                            {attStats.total > 0 ? `${attStats.percentage}%` : 'No data'}
                                        </span>
                                    </div>
                                    <div style={{ backgroundColor: isPending ? 'rgba(255,255,255,0.1)' : 'var(--bg-primary)', borderRadius: '0.25rem', height: '6px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${attStats.percentage}%`,
                                            backgroundColor: isPending ? 'white' : (attStats.percentage >= 75 ? '#10b981' : attStats.percentage >= 50 ? '#f59e0b' : '#ef4444'),
                                            height: '100%',
                                            transition: 'width 0.3s ease'
                                        }}></div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: isPending ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', marginTop: '0.4rem', textAlign: 'right' }}>
                                        {attStats.present} of {attStats.total} sessions present
                                    </div>
                                </div>

                                {otherSections.length > 0 && !isPending && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenTransferModal(student, section);
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                                        >
                                            <ArrowRightLeft size={14} />
                                            Transfer Section
                                        </Button>
                                    </div>
                                )}

                                {isPending && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.3)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700, marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                            Pending Transfer
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>
                                            Move to: {allSections.find(s => s.id === pendingTransfers[student.id])?.name}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => cancelTransfer(student.id, e)}
                                            style={{ width: '100%', color: '#f87171', fontSize: '0.75rem', height: 'auto', padding: '0.4rem', backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)' }}
                                            onMouseEnter={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.backgroundColor = 'rgba(248, 113, 113, 0.2)';
                                            }}
                                            onMouseLeave={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.backgroundColor = 'rgba(248, 113, 113, 0.1)';
                                            }}
                                        >
                                            Cancel Transfer
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Transfer Student Modal */}
            {isTransferModalOpen && (transferringStudent || isBulkTransfer) && (
                <Modal
                    isOpen={isTransferModalOpen}
                    onClose={() => { setIsTransferModalOpen(false); setTransferringStudent(null); setIsBulkTransfer(false); }}
                    title={isBulkTransfer ? `Bulk Transfer (${selectedIds.length} students)` : `Transfer ${transferringStudent?.student.name}`}
                >
                    <div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Select target section. All history will be moved.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {otherSections.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleTransferStudent(s.id)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '1rem',
                                        backgroundColor: 'var(--bg-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                                    }}
                                >
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.days?.join(', ')} • {s.startTime} - {s.endTime}</span>
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <Button variant="secondary" onClick={() => { setIsTransferModalOpen(false); setTransferringStudent(null); setIsBulkTransfer(false); }}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
