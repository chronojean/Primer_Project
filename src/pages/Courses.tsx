import React, { useState, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirmation } from '../context/ConfirmationContext';
import { StorageService } from '../services/storage';
import { Course, Section, Enrollment, Attendance } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { SectionsModule, SectionDetail } from '../components/SectionsModule';
import { Pencil, Trash2, Plus, ChevronRight, Search, BookOpen, Users, ArrowLeft } from 'lucide-react';

export const Courses = () => {
    // Data
    const [courses, setCourses] = useState<Course[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);

    // View State
    const [viewMode, setViewMode] = useState<'courses' | 'sections' | 'sectionDetails'>('courses');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        loadData();
    }, []);

    const { showConfirmation } = useConfirmation();

    // Navigation Blocker (React Router)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        const handleBlock = async () => {
            if (blocker.state === 'blocked') {
                const confirmed = await showConfirmation({
                    title: 'Leave Section Details?',
                    message: 'You have unsaved transfers. Are you sure you want to leave?',
                    confirmLabel: 'Leave anyway',
                    cancelLabel: 'Stay here'
                });

                if (confirmed) {
                    setHasUnsavedChanges(false);
                    blocker.proceed();
                } else {
                    blocker.reset();
                }
            }
        };
        handleBlock();
    }, [blocker, hasUnsavedChanges, showConfirmation]);

    // Unsaved changes browser listener (Refresh/Close)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleNavigate = async (callback: () => void) => {
        if (hasUnsavedChanges) {
            const confirmed = await showConfirmation({
                title: 'Leave Page?',
                message: 'You have unsaved transfers. Are you sure you want to leave?',
                confirmLabel: 'Leave',
                cancelLabel: 'Cancel'
            });

            if (confirmed) {
                setHasUnsavedChanges(false);
                callback();
            }
        } else {
            callback();
        }
    };

    const loadData = () => {
        setCourses(StorageService.getCourses());
        setSections(StorageService.getSections());
        setEnrollments(StorageService.getEnrollments());
        setAttendance(StorageService.getAttendance());
    };

    const handleOpenModal = (e?: React.MouseEvent, course?: Course) => {
        if (e) e.stopPropagation();
        if (course) {
            setEditingCourse(course);
            setFormData({ name: course.name, description: course.description });
        } else {
            setEditingCourse(null);
            setFormData({ name: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
        setFormData({ name: '', description: '' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCourse) {
            StorageService.updateCourse({ ...editingCourse, ...formData });
        } else {
            StorageService.addCourse({
                id: crypto.randomUUID(),
                ...formData
            });
        }
        loadData();
        handleCloseModal();
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this course?')) {
            StorageService.deleteCourse(id);
            loadData();
        }
    };

    const getCourseSections = (courseId: string) => {
        return sections.filter(s => s.courseId === courseId);
    };

    const getCourseStudentCount = (courseId: string) => {
        const courseSections = getCourseSections(courseId);
        const sectionIds = courseSections.map(s => s.id);
        return enrollments.filter(e => sectionIds.includes(e.sectionId)).length;
    };

    const getCourseAttendanceStats = (courseId: string) => {
        const courseSections = sections.filter(s => s.courseId === courseId);
        let totalPresent = 0;
        let totalRecords = 0;
        courseSections.forEach(section => {
            const sectionAttendance = attendance.filter(a => a.sectionId === section.id);
            sectionAttendance.forEach(a => {
                totalRecords += a.records.length;
                totalPresent += a.records.filter(r => r.present).length;
            });
        });
        const percentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        return { percentage };
    };

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentCourse = courses.find(c => c.id === selectedCourseId);

    const renderBreadcrumbs = () => {
        const currentSection = sections.find(s => s.id === selectedSectionId);

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <span
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNavigate(() => { setSelectedCourseId(''); setSelectedSectionId(''); setViewMode('courses'); })}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleNavigate(() => { setSelectedCourseId(''); setSelectedSectionId(''); setViewMode('courses'); });
                        }
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    Courses
                </span>
                {selectedCourseId && (
                    <>
                        <ChevronRight size={14} />
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={() => handleNavigate(() => { setSelectedSectionId(''); setViewMode('sections'); })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleNavigate(() => { setSelectedSectionId(''); setViewMode('sections'); });
                                }
                            }}
                            style={{ cursor: 'pointer', fontWeight: viewMode === 'sections' ? 600 : 400, color: viewMode === 'sections' ? 'var(--primary)' : 'inherit' }}
                        >
                            {currentCourse?.name}
                        </span>
                    </>
                )}
                {selectedSectionId && (
                    <>
                        <ChevronRight size={14} />
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {currentSection?.name}
                        </span>
                    </>
                )}
            </div>
        );
    };

    const renderCourses = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredCourses.map(course => {
                const attStats = getCourseAttendanceStats(course.id);
                const studentCount = getCourseStudentCount(course.id);
                const sectionCount = getCourseSections(course.id).length;

                return (
                    <div
                        key={course.id}
                        onClick={() => { setSelectedCourseId(course.id); setViewMode('sections'); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedCourseId(course.id);
                                setViewMode('sections');
                            }
                        }}
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
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                <BookOpen size={24} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <Button size="sm" variant="ghost" onClick={(e) => handleOpenModal(e, course)} style={{ padding: '0.4rem' }} aria-label="Edit course">
                                    <Pencil size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={(e) => handleDelete(e, course.id)} style={{ padding: '0.4rem', color: '#ef4444' }} aria-label="Delete course">
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>{course.name}</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.5rem' }}>
                                {course.description || 'No description provided.'}
                            </p>
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <Users size={14} />
                                <span>{studentCount} Students</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                <BookOpen size={14} />
                                <span>{sectionCount} Sections</span>
                            </div>
                            <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '0.25rem', height: '4px', overflow: 'hidden', marginBottom: '0.25rem' }}>
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
            })}

            {/* Add Course Card Placeholder */}
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
                <span style={{ fontWeight: 600 }}>Add New Course</span>
            </div>
        </div>
    );

    const renderSections = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SectionsModule
                courseId={selectedCourseId}
                hideHeader={true}
                onSelectSection={(id) => {
                    setSelectedSectionId(id);
                    setViewMode('sectionDetails');
                }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                <Button variant="secondary" onClick={() => handleNavigate(() => { setSelectedCourseId(''); setViewMode('courses'); })}>
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Courses
                </Button>
            </div>
        </div>
    );

    const renderSectionDetails = () => (
        <SectionDetail
            sectionId={selectedSectionId}
            onBack={() => handleNavigate(() => {
                setSelectedSectionId('');
                setViewMode('sections');
            })}
            onUnsavedChanges={setHasUnsavedChanges}
        />
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Courses</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.6rem 1rem 0.6rem 2.75rem',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '2rem',
                                fontSize: '0.9rem',
                                outline: 'none',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        />
                    </div>
                </div>
            </div>

            {renderBreadcrumbs()}

            {viewMode === 'courses' && renderCourses()}
            {viewMode === 'sections' && renderSections()}
            {viewMode === 'sectionDetails' && renderSectionDetails()}

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingCourse ? 'Edit Course' : 'Add Course'}
            >
                <form onSubmit={handleSubmit}>
                    <Input
                        label="Course Name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Mathematics 101"
                    />
                    <Input
                        label="Description"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief overview of the course"
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingCourse ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
