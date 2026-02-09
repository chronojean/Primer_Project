import React, { useState, useEffect } from 'react';
import { useBlocker, useLocation } from 'react-router-dom';
import { useConfirmation } from '../../shared/hooks/useConfirmation';
import { StorageService } from '../../shared/utils/storage';
import { Course, Section, Enrollment, Attendance } from '../../shared/utils/types';
import { Button } from '../../shared/components/Button';
import { Modal } from '../../shared/components/Modal';
import { Input } from '../../shared/components/Input';
import { SectionsModule, SectionDetail } from './SectionsModule';
import { Pencil, Trash2, Plus, ChevronRight, Search, BookOpen, Users, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../shared/components/PageHeader';
import styles from './Courses.module.css';

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
    const location = useLocation();

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
                setSearchTerm('');
                callback();
            }
        } else {
            setSearchTerm('');
            callback();
        }
    };

    // Removed custom mouse-back handling.

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

    useEffect(() => {
        setSearchTerm('');
    }, [location.key]);

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

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const confirmed = await showConfirmation({
            title: 'Delete Course?',
            message: 'Are you sure you want to delete this course?',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        StorageService.deleteCourse(id);
        loadData();
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
                const activeRecords = a.records.filter(r => StorageService.getEffectiveStudentStatus(r.studentId, section.id));
                totalRecords += activeRecords.length;
                totalPresent += activeRecords.filter(r => r.present).length;
            });
        });
        const percentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;
        return { percentage };
    };

    const getAttendanceStatus = (percentage: number) => {
        if (percentage >= 75) return 'high';
        if (percentage >= 50) return 'mid';
        return 'low';
    };

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentCourse = courses.find(c => c.id === selectedCourseId);
    const currentSection = sections.find(s => s.id === selectedSectionId);

    const headerTitle = viewMode === 'sections'
        ? (currentCourse?.name || 'Courses')
        : viewMode === 'sectionDetails'
            ? (currentSection?.name || 'Courses')
            : 'Courses';

    const searchPlaceholder = viewMode === 'sections'
        ? 'Search sections...'
        : viewMode === 'sectionDetails'
            ? 'Search students...'
            : 'Search courses...';

    const renderBreadcrumbs = () => {
        const currentSection = sections.find(s => s.id === selectedSectionId);

        return (
            <div className={styles.breadcrumbs}>
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
                    className={styles.breadcrumbLink}
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
                            className={[
                                styles.breadcrumbLink,
                                viewMode === 'sections' ? styles.breadcrumbActive : ''
                            ].filter(Boolean).join(' ')}
                        >
                            {currentCourse?.name}
                        </span>
                    </>
                )}
                {selectedSectionId && (
                    <>
                        <ChevronRight size={14} />
                        <span className={styles.breadcrumbActive}>
                            {currentSection?.name}
                        </span>
                    </>
                )}
            </div>
        );
    };

    const renderCourses = () => (
        <div className={styles.courseGrid}>
            {filteredCourses.map(course => {
                const attStats = getCourseAttendanceStats(course.id);
                const studentCount = getCourseStudentCount(course.id);
                const sectionCount = getCourseSections(course.id).length;
                const attendanceStatus = getAttendanceStatus(attStats.percentage);

                return (
                    <div
                        key={course.id}
                        onClick={() => { setSelectedCourseId(course.id); setViewMode('sections'); setSearchTerm(''); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedCourseId(course.id);
                                setViewMode('sections');
                                setSearchTerm('');
                            }
                        }}
                        className={styles.courseCard}
                    >
                        <div className={styles.courseCardHeader}>
                            <div className={styles.courseTitleRow}>
                                <div className={styles.courseIcon}>
                                    <BookOpen size={20} />
                                </div>
                                <h3 className={styles.courseTitle}>
                                    {course.name}
                                </h3>
                            </div>
                            <div className={styles.courseActions}>
                                <Button size="sm" variant="ghost" onClick={(e) => handleOpenModal(e, course)} className={styles.iconButton} aria-label="Edit course">
                                    <Pencil size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={(e) => handleDelete(e, course.id)} className={`${styles.iconButton} ${styles.iconButtonDanger}`} aria-label="Delete course">
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <p className={styles.courseDescription}>
                                {course.description || 'No description provided.'}
                            </p>
                        </div>

                        <div className={styles.courseFooter}>
                            <div className={styles.courseMetaItem}>
                                <Users size={14} />
                                <span>{studentCount} Students</span>
                            </div>
                            <div className={styles.courseMetaItem}>
                                <BookOpen size={14} />
                                <span>{sectionCount} Sections</span>
                            </div>
                            <div className={styles.courseAttendance}>
                                <progress
                                    className={`${styles.attendanceProgress} ${styles[`attendanceProgress${attendanceStatus}`]}`}
                                    value={attStats.percentage}
                                    max={100}
                                />
                                <span className={`${styles.attendanceValue} ${styles[`attendanceValue${attendanceStatus}`]}`}>
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
                className={styles.addCard}
            >
                <div className={styles.addCardIcon}>
                    <Plus size={24} />
                </div>
                <span className={styles.addCardText}>Add New Course</span>
            </div>
        </div>
    );

    const renderSections = () => (
        <div className={styles.sectionsWrap}>
            <SectionsModule
                courseId={selectedCourseId}
                hideHeader={true}
                onSelectSection={(id) => {
                    setSelectedSectionId(id);
                    setViewMode('sectionDetails');
                    setSearchTerm('');
                }}
                searchTerm={searchTerm}
            />
            <div className={styles.backButtonWrap}>
                <Button variant="secondary" onClick={() => handleNavigate(() => { setSelectedCourseId(''); setViewMode('courses'); })}>
                    <ArrowLeft size={16} className={styles.buttonIcon} /> Back to Courses
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
            searchTerm={searchTerm}
        />
    );

    return (
        <>
            <div className="module" style={{ gap: 0 }}>
                <PageHeader
                    compact={true}
                    title={headerTitle}
                    actions={
                        <div className={styles.searchWrap}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setSearchTerm('');
                                    }
                                }}
                                className={styles.searchInput}
                            />
                        </div>
                    }
                />

                {renderBreadcrumbs()}

                {viewMode === 'courses' && renderCourses()}
                {viewMode === 'sections' && renderSections()}
                {viewMode === 'sectionDetails' && renderSectionDetails()}
            </div>

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
                    <div className={styles.formActions}>
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">{editingCourse ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
};
