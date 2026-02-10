import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../../shared/utils/storage';
import { Section, Course, Professor, Student, Enrollment, Attendance } from '../../shared/utils/types';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Input, Select } from '../../shared/components/Input';
import { Trash2, Plus, Pencil, Users, User, ArrowRightLeft, UserCheck, ArrowLeft } from 'lucide-react';
import { useConfirmation } from '../../shared/hooks/useConfirmation';
import styles from './SectionsModule.module.css';

interface SectionsModuleProps {
    courseId?: string;
    hideHeader?: boolean;
    onSelectSection?: (sectionId: string) => void;
    searchTerm?: string;
}

export const SectionsModule = ({ courseId, hideHeader = false, onSelectSection, searchTerm = '' }: SectionsModuleProps) => {
    const { showConfirmation } = useConfirmation();
    const [sections, setSections] = useState<Section[]>([]);
    const [allSections, setAllSections] = useState<Section[]>([]);
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
    const [selectedBlocks, setSelectedBlocks] = useState<Array<{ day: string; startTime: string }>>([]);

    const daysOfWeek = [
        { value: 'Mon', label: 'Mon' },
        { value: 'Tue', label: 'Tue' },
        { value: 'Wed', label: 'Wed' },
        { value: 'Thu', label: 'Thu' },
        { value: 'Fri', label: 'Fri' },
        { value: 'Sat', label: 'Sat' },
    ];

    const blockDuration = 90;
    const blockStartTimes = ['08:00', '09:45', '11:30', '14:00', '15:45', '17:30'];

    const timeToMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const addMinutes = (time: string, minutes: number) => minutesToTime(timeToMinutes(time) + minutes);

    const buildBlocksFromLegacy = (days: string[], startTime: string, endTime: string) => {
        if (!days.length || !startTime || !endTime) return [];
        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        if (endMinutes <= startMinutes) return [];
        const blocks: Array<{ day: string; startTime: string }> = [];
        for (let t = startMinutes; t + blockDuration <= endMinutes; t += blockDuration) {
            const blockStart = minutesToTime(t);
            days.forEach(day => blocks.push({ day, startTime: blockStart }));
        }
        return blocks;
    };

    const getSectionBlocks = (section: Section) => {
        if (section.scheduleBlocks && section.scheduleBlocks.length > 0) {
            return section.scheduleBlocks.map(b => ({ day: b.day, startTime: b.startTime }));
        }
        if (section.days?.length && section.startTime && section.endTime) {
            return buildBlocksFromLegacy(section.days, section.startTime, section.endTime);
        }
        return [];
    };

    const getSectionIntervals = (section: Section) => {
        if (section.scheduleBlocks && section.scheduleBlocks.length > 0) {
            return section.scheduleBlocks.map(b => ({
                day: b.day,
                start: timeToMinutes(b.startTime),
                end: timeToMinutes(addMinutes(b.startTime, blockDuration))
            }));
        }
        if (section.days?.length && section.startTime && section.endTime) {
            const start = timeToMinutes(section.startTime);
            const end = timeToMinutes(section.endTime);
            return section.days.map(day => ({ day, start, end }));
        }
        return [];
    };

    const isSectionFinished = (section: Section) => {
        if (!section.endDate) return false;
        const today = new Date().toISOString().split('T')[0];
        return section.endDate < today;
    };

    useEffect(() => {
        loadData();
    }, [courseId]);

    const loadData = () => {
        const loadedSections = StorageService.getSections();
        setAllSections(loadedSections);
        const visibleSections = courseId ? loadedSections.filter(s => s.courseId === courseId) : loadedSections;
        setSections(visibleSections);
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
            const existingBlocks = getSectionBlocks(section);
            setSelectedBlocks(existingBlocks);
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
            setSelectedBlocks([]);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSection(null);
        setError('');
        setSelectedBlocks([]);
    };

    const toggleStudent = (studentId: string) => {
        setFormData(prev => ({
            ...prev,
            selectedStudentIds: prev.selectedStudentIds.includes(studentId)
                ? prev.selectedStudentIds.filter(id => id !== studentId)
                : [...prev.selectedStudentIds, studentId]
        }));
    };

    const toggleBlockSelection = (day: string, startTime: string) => {
        const key = `${day}|${startTime}`;
        if (occupiedBlockKeys.has(key)) return;
        setSelectedBlocks(prev => {
            const exists = prev.some(block => block.day === day && block.startTime === startTime);
            if (exists) {
                return prev.filter(block => !(block.day === day && block.startTime === startTime));
            }
            return [...prev, { day, startTime }];
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (selectedBlocks.length === 0) {
            setError('Please select at least one schedule block.');
            return;
        }

        try {
            const scheduleBlocks = selectedBlocks.map(block => ({ day: block.day, startTime: block.startTime }));
            const uniqueDays = Array.from(new Set(scheduleBlocks.map(block => block.day)));
            const earliestStart = scheduleBlocks.reduce((min, b) => Math.min(min, timeToMinutes(b.startTime)), Number.POSITIVE_INFINITY);
            const latestEnd = scheduleBlocks.reduce((max, b) => Math.max(max, timeToMinutes(addMinutes(b.startTime, blockDuration))), 0);

            const sectionData = {
                courseId: formData.courseId,
                professorId: formData.professorId || null,
                name: formData.name,
                days: uniqueDays,
                startTime: minutesToTime(earliestStart),
                endTime: minutesToTime(latestEnd),
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined,
                roomId: formData.roomId,
                scheduleBlocks
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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const confirmed = await showConfirmation({
            title: 'Delete Section?',
            message: 'Are you sure you want to delete this section?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        StorageService.deleteSection(id);
        loadData();
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
            const enrolledSection = allSections.find(s => s.id === existingEnrollment.sectionId);
            if (enrolledSection && isSectionFinished(enrolledSection)) {
                return false;
            }
            return existingEnrollment.sectionId !== (editingSection?.id || 'new');
        }
        return false;
    };

    const occupiedBlockKeys = useMemo(() => {
        const intervals: Array<{ day: string; start: number; end: number }> = [];
        allSections.forEach(section => {
            if (editingSection && section.id === editingSection.id) return;
            if (isSectionFinished(section)) return;
            intervals.push(...getSectionIntervals(section));
        });

        const keys = new Set<string>();
        daysOfWeek.forEach(day => {
            blockStartTimes.forEach(time => {
                const start = timeToMinutes(time);
                const end = start + blockDuration;
                const overlaps = intervals.some(interval =>
                    interval.day === day.value && interval.start < end && interval.end > start
                );
                if (overlaps) {
                    keys.add(`${day.value}|${time}`);
                }
            });
        });
        return keys;
    }, [allSections, editingSection, daysOfWeek, blockStartTimes, blockDuration, getSectionIntervals, isSectionFinished, timeToMinutes]);

    const availableBlocksByDay = useMemo(() => {
        return daysOfWeek.map(day => ({
            ...day,
            times: blockStartTimes.map(time => ({
                time,
                disabled: occupiedBlockKeys.has(`${day.value}|${time}`)
            }))
        }));
    }, [occupiedBlockKeys, daysOfWeek, blockStartTimes]);

    const selectedBlockKeys = useMemo(() => {
        return new Set(selectedBlocks.map(block => `${block.day}|${block.startTime}`));
    }, [selectedBlocks]);

    const getSectionAttendanceStats = (sectionId: string) => {
        const sectionAttendance = attendance.filter(a => a.sectionId === sectionId);
        let totalPresent = 0;
        let totalRecords = 0;
        sectionAttendance.forEach(a => {
            const activeRecords = a.records.filter(r => StorageService.getEffectiveStudentStatus(r.studentId, sectionId));
            totalRecords += activeRecords.length;
            totalPresent += activeRecords.filter(r => r.present).length;
        });
        const percentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        return { present: totalPresent, total: totalRecords, percentage };
    };

    const getProfessorName = (id?: string | null) => {
        if (!id) return 'Assign Professor';
        return professors.find(p => p.id === id)?.name || 'Unknown Professor';
    };

    const studentsForEnrollment = StorageService.getStudents();
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const displaySections = normalizedSearch
        ? sections.filter(s => s.name.toLowerCase().includes(normalizedSearch))
        : sections;

    return (
        <div>
            {!hideHeader && (
                <div className="module-header" style={{ marginBottom: '2rem' }}>
                    <h1>Sections</h1>
                    <div className="module-actions">
                        <Button onClick={() => handleOpenModal()}>
                            <Plus size={16} style={{ marginRight: '0.5rem' }} /> Add Section
                        </Button>
                    </div>
                </div>
            )}

            {courseId && hideHeader && (
                <div className="module-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Manage Sections</h2>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {displaySections.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '0.75rem' }}>
                        {sections.length === 0 ? 'No sections found.' : 'No sections match your search.'}
                    </div>
                ) : (
                    displaySections.map(section => {
                        const attStats = getSectionAttendanceStats(section.id);
                        const studentCount = getStudentCount(section.id);
                        const profName = getProfessorName(section.professorId);

                        return (
                            <div
                                key={section.id}
                                onClick={() => onSelectSection?.(section.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectSection?.(section.id);
                                    }
                                }}
                                style={{
                                    backgroundColor: 'var(--bg-card)',
                                    padding: '1.5rem',
                                    borderRadius: '0.5rem',
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                            <Users size={20} />
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {section.name}
                                        </h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                        <Button size="sm" variant="ghost" onClick={(e) => handleOpenModal(e, section)} style={{ padding: '0.4rem' }} aria-label="Edit section">
                                            <Pencil size={14} />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={(e) => handleDelete(e, section.id)} style={{ padding: '0.4rem', color: '#ef4444' }} aria-label="Delete section">
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>

                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <User size={14} />
                                    {profName}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <div>{section.days?.join(', ')}</div>
                                    <div>{section.startTime} - {section.endTime}</div>
                                    <div>{section.roomId ? `Room ${section.roomId}` : 'No Room'}</div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <Users size={14} />
                                        <span>{studentCount} Students</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Attendance
                                    </div>
                                    <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                        <div style={{ flex: 1, backgroundColor: 'var(--border-color)', borderRadius: '0.25rem', height: '4px', overflow: 'hidden', marginBottom: '0.25rem' }}>
                                            <div style={{
                                                width: `${attStats.percentage}%`,
                                                backgroundColor: attStats.percentage >= 75 ? '#10b981' : attStats.percentage >= 50 ? '#f59e0b' : '#ef4444',
                                                height: '100%'
                                            }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: attStats.percentage >= 75 ? '#10b981' : attStats.percentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                                            {attStats.percentage}% Overall Attendance
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
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenModal();
                        }
                    }}
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        padding: '1.5rem',
                        borderRadius: '0.5rem',
                        border: '1px dashed var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'row',
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
                    <div style={{ width: '40px', height: '40px', borderRadius: '0.5rem', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={24} />
                    </div>
                    <span style={{ fontWeight: 600 }}>Add New Section</span>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingSection ? 'Edit Section' : 'Add Section'}
                panelClassName={styles.sectionModalPanel}
            >
                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className={styles.sectionModalForm}>
                    <div className={styles.sectionModalBody}>
                        <div className={styles.sectionModalGrid}>
                            <div className={styles.sectionColumn}>
                                <div className={styles.sectionRow}>
                                    <div className={styles.sectionField}>
                                        <Select
                                            label="Course"
                                            value={formData.courseId}
                                            onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                                            options={courses.map(c => ({ value: c.id, label: c.name }))}
                                            required
                                            disabled={!!editingSection || !!courseId}
                                        />
                                    </div>
                                    <div className={styles.sectionField}>
                                        <Select
                                            label="Professor"
                                            value={formData.professorId}
                                            onChange={e => setFormData({ ...formData, professorId: e.target.value })}
                                            options={[{ value: '', label: 'Select Professor' }, ...professors.map(p => ({ value: p.id, label: p.name }))]}
                                        />
                                    </div>
                                </div>

                                <div className={styles.sectionRow}>
                                    <div className={styles.sectionField}>
                                        <Input
                                            label="Section Name"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className={styles.sectionField}>
                                        <Input
                                            label="Room"
                                            value={formData.roomId}
                                            onChange={e => setFormData({ ...formData, roomId: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className={styles.sectionRow}>
                                    <div className={styles.sectionField}>
                                        <Input
                                            label="Start Date"
                                            type="date"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className={styles.sectionField}>
                                        <Input
                                            label="End Date"
                                            type="date"
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className={styles.sectionPanel}>
                                    <label className={styles.enrollLabel}>Enroll Students</label>
                                    <div className={styles.enrollList}>
                                        {(() => {
                                            const availableStudents = studentsForEnrollment.filter(s => !isStudentUnavailable(s.id));
                                            if (availableStudents.length === 0) {
                                                return <p className={styles.enrollEmpty}>No students available for this course.</p>;
                                            }
                                            return availableStudents.map(student => (
                                                <div
                                                    key={student.id}
                                                    className={styles.enrollRow}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        id={`student-${student.id}`}
                                                        checked={formData.selectedStudentIds.includes(student.id)}
                                                        onChange={() => toggleStudent(student.id)}
                                                        className={styles.enrollCheckbox}
                                                    />
                                                    <label htmlFor={`student-${student.id}`} className={styles.enrollName}>
                                                        {student.name}
                                                    </label>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.sectionColumn}>
                                <div className={styles.sectionPanel}>
                                    <div className={styles.scheduleHeader}>
                                        <label className={styles.scheduleLabel}>Schedule Blocks</label>
                                        <span className={styles.scheduleHint}>Taken blocks are disabled.</span>
                                    </div>
                                    <div className={styles.blockGrid}>
                                        {availableBlocksByDay.map(day => (
                                            <div key={day.value} className={styles.blockDay}>
                                                <div className={styles.blockDayLabel}>{day.label}</div>
                                                <div className={styles.blockChips}>
                                                    {day.times.map(({ time, disabled }) => {
                                                        const key = `${day.value}|${time}`;
                                                        const isSelected = selectedBlockKeys.has(key);
                                                        const endTime = addMinutes(time, blockDuration);
                                                        return (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                className={`${styles.blockChip} ${isSelected ? styles.blockChipSelected : ''} ${disabled ? styles.blockChipDisabled : ''}`}
                                                                onClick={() => toggleBlockSelection(day.value, time)}
                                                                aria-pressed={isSelected}
                                                                disabled={disabled}
                                                            >
                                                                <span className={styles.blockChipTime}>{time}</span>
                                                                <span className={styles.blockChipMeta}>{endTime}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.blockFooter}>
                                        {selectedBlocks.length} selected
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.sectionModalActions}>
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
    searchTerm?: string;
}

export const SectionDetail = ({ sectionId, onBack, onUnsavedChanges, searchTerm = '' }: SectionDetailProps) => {
    const { showConfirmation } = useConfirmation();
    const [section, setSection] = useState<Section | null>(null);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [allSections, setAllSections] = useState<Section[]>([]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [pendingTransfers, setPendingTransfers] = useState<{ [studentId: string]: string }>({});
    const [pendingStatusChanges, setPendingStatusChanges] = useState<{ [studentId: string]: boolean }>({});
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferringStudent, setTransferringStudent] = useState<{ student: Student; fromSection: Section } | null>(null);
    const [isBulkTransfer, setIsBulkTransfer] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        loadData();
        setSelectedIds([]);
        setPendingTransfers({});
        setPendingStatusChanges({});
        setStatusMessage('');
    }, [sectionId]);

    useEffect(() => {
        onUnsavedChanges?.(Object.keys(pendingTransfers).length > 0 || Object.keys(pendingStatusChanges).length > 0);
    }, [pendingTransfers, pendingStatusChanges, onUnsavedChanges]);

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

    const handleTransferStudent = async (toSectionId: string) => {
        const studentsToStage = isBulkTransfer
            ? enrolledStudents.filter(s => selectedIds.includes(s.id))
            : transferringStudent ? [transferringStudent.student] : [];

        if (studentsToStage.length === 0) return;

        const confirmed = await showConfirmation({
            title: 'Stage Transfer?',
            message: `This will stage ${studentsToStage.length} transfer${studentsToStage.length === 1 ? '' : 's'}. You can review before saving.`,
            confirmLabel: 'Stage transfer',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;

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

    const handleToggleSectionStatus = async (student: Student) => {
        const current = Object.prototype.hasOwnProperty.call(pendingStatusChanges, student.id)
            ? pendingStatusChanges[student.id]
            : StorageService.getSectionStudentActiveStatus(student.id, section.id);
        const next = !current;
        const confirmed = await showConfirmation({
            title: next ? 'Mark Student Active?' : 'Mark Student Inactive?',
            message: `Are you sure you want to tag "${student.name}" as ${next ? 'active' : 'inactive'}?`,
            confirmLabel: next ? 'Mark active' : 'Mark inactive',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        setPendingStatusChanges(prev => ({ ...prev, [student.id]: next }));
    };

    const cancelTransfer = (studentId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const newPending = { ...pendingTransfers };
        delete newPending[studentId];
        setPendingTransfers(newPending);
    };

    const handleSaveTransfers = async () => {
        const studentIds = Object.keys(pendingTransfers);
        const statusIds = Object.keys(pendingStatusChanges);
        if (studentIds.length === 0 && statusIds.length === 0) return;

        const confirmed = await showConfirmation({
            title: 'Save Changes?',
            message: 'This will apply staged transfers and status changes. Do you want to continue?',
            confirmLabel: 'Save changes',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;

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

        statusIds.forEach(studentId => {
            const isActive = pendingStatusChanges[studentId];
            StorageService.addSectionStudentStatusHistory({
                id: crypto.randomUUID(),
                studentId,
                sectionId: section.id,
                isActive,
                changedAt: new Date().toISOString()
            });
        });

        setPendingTransfers({});
        setPendingStatusChanges({});
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
    const filteredStudents = searchTerm.trim()
        ? enrolledStudents.filter(s => {
            const name = formatStudentName(s.name).toLowerCase();
            return name.includes(searchTerm.toLowerCase());
        })
        : enrolledStudents;
    const otherSections = getOtherSectionsForCourse(section.courseId, section.id);

    return (
        <div>
            <div className={styles.sectionHeader}>
                <div className={styles.sectionHeaderActions} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {enrolledStudents.length > 0 && (
                    <div className={styles.sectionToolbar}>
                        <div className={styles.sectionToolbarLeft}>
                            {onBack && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={onBack}
                                    className={styles.backButton}
                                    aria-label="Return to sections"
                                >
                                    <ArrowLeft size={16} />
                                </Button>
                            )}
                            <div className={styles.sectionToolbarCounter}>
                                <Users size={16} className={styles.sectionHeaderStatIcon} />
                                <span className={styles.sectionHeaderStatText}>{enrolledStudents.length} Students</span>
                            </div>
                            <div className={styles.sectionToolbarCounter}>
                                <UserCheck size={16} className={styles.sectionHeaderStatIconActive} />
                                <span className={styles.sectionHeaderStatText}>Active</span>
                            </div>
                        </div>

                        {/* Status Message */}
                        {statusMessage && (
                            <div className={styles.statusMessage}>
                                <span className={styles.statusMessageText}>
                                    <UserCheck size={16} /> {statusMessage}
                                </span>
                            </div>
                        )}

                        <div className={styles.bulkActions}>
                            <div className={styles.selectionControls}>
                                {selectedIds.length > 0 && (
                                    <div className={styles.selectedBadge}>
                                        <div className={styles.selectedDot}></div>
                                        <span className={styles.selectedText}>
                                            {selectedIds.length} Selected
                                        </span>
                                    </div>
                                )}

                                <Button size="sm" variant="secondary" onClick={selectAll} className={styles.actionButton}>
                                    Select All
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setSelectedIds([]);
                                        setPendingTransfers({});
                                        setPendingStatusChanges({});
                                        setStatusMessage('');
                                    }}
                                    disabled={Object.keys(pendingTransfers).length === 0 && Object.keys(pendingStatusChanges).length === 0 && selectedIds.length === 0}
                                    className={styles.clearButton}
                                >
                                    Reset
                                </Button>
                            </div>

                            <div className={styles.sectionToolbarDivider}></div>
                            <Button
                                size="sm"
                                onClick={handleOpenBulkTransferModal}
                                disabled={selectedIds.length === 0}
                                className={styles.bulkButton}
                            >
                                <ArrowRightLeft size={16} /> Bulk Transfer
                            </Button>

                            <Button
                                onClick={handleSaveTransfers}
                                disabled={Object.keys(pendingTransfers).length === 0 && Object.keys(pendingStatusChanges).length === 0}
                                size="sm"
                                className={styles.saveButton}
                            >
                                <UserCheck size={16} /> Save Changes
                            </Button>
                        </div>
                    </div>
                )}

                {filteredStudents.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '0.75rem' }}>
                        No students found in this section.
                    </div>
                ) : (
                    filteredStudents.map(student => {
                        const attStats = getStudentAttendanceInSection(student.id, section.id);
                        const isSelected = selectedIds.includes(student.id);
                        const isPending = !!pendingTransfers[student.id];
                        const formattedName = formatStudentName(student.name);
                        const sectionActive = Object.prototype.hasOwnProperty.call(pendingStatusChanges, student.id)
                            ? pendingStatusChanges[student.id]
                            : StorageService.getSectionStudentActiveStatus(student.id, section.id);
                        const globalActive = StorageService.getStudentActiveStatus(student.id);
                        const isInactive = !globalActive || !sectionActive;

                        return (
                            <div
                                key={student.id}
                                onClick={() => {
                                    if (isInactive) return;
                                    toggleSelection(student.id);
                                }}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                aria-label={`${formattedName}${isSelected ? ' selected' : ''}${isPending ? ' pending transfer' : ''}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        if (!isInactive) toggleSelection(student.id);
                                    }
                                }}
                                style={{
                                    backgroundColor: isInactive
                                        ? 'var(--bg-hover)'
                                        : isPending ? '#1e3a8a' : (isSelected ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)'),
                                    borderRadius: '0.75rem',
                                    padding: '1.5rem',
                                    border: isPending ? '2px solid #312e81' : (isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)'),
                                    boxShadow: isPending ? '0 0 0 3px rgba(30, 58, 138, 0.2), var(--shadow-sm)' : (isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)'),
                                    cursor: isInactive ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transform: isPending ? 'scale(1.02)' : 'none',
                                    color: isPending ? 'white' : 'inherit',
                                    opacity: isInactive ? 0.6 : 1
                                }}
                            >
                                {(isSelected || isPending) && (
                                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                        <UserCheck size={20} color={isPending ? 'white' : 'var(--primary)'} />
                                    </div>
                                )}
                                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '0.35rem' }}>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleSectionStatus(student);
                                        }}
                                        aria-label={sectionActive ? 'Mark inactive' : 'Mark active'}
                                        style={{ padding: '0.35rem' }}
                                    >
                                        {sectionActive ? <Trash2 size={14} /> : <UserCheck size={14} />}
                                    </Button>
                                    {otherSections.length > 0 && !isPending && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenTransferModal(student, section);
                                            }}
                                            aria-label="Transfer student"
                                            disabled={isInactive}
                                            style={{ padding: '0.35rem' }}
                                        >
                                            <ArrowRightLeft size={14} />
                                        </Button>
                                    )}
                                </div>
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
                                        {formattedName.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: isPending ? 'white' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '1rem' }}>
                                            {formattedName}
                                        </div>
                                        {isInactive && (
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isPending ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Inactive
                                            </div>
                                        )}
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
                                <Button
                                    key={s.id}
                                    type="button"
                                    variant="secondary"
                                    size="md"
                                    onClick={() => handleTransferStudent(s.id)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        padding: '1rem',
                                        width: '100%',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.days?.join(', ')} • {s.startTime} - {s.endTime}</span>
                                </Button>
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
