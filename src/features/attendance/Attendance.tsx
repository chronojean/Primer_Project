import { useState, useEffect, useRef } from 'react';
import { useBlocker, useLocation } from 'react-router-dom';
import { useConfirmation } from '../../shared/hooks/useConfirmation';
import { StorageService } from '../../shared/utils/storage';
import { Course, Section, Student, Attendance as AttendanceType } from '../../shared/utils/types';
import { Button } from '../../shared/components/Button';
import { Save, Calendar, CheckSquare, XSquare, ChevronRight, ChevronDown, LayoutGrid, ArrowLeft, History, UserCheck, Users, Search, Clock, MapPin } from 'lucide-react';
import { PageHeader } from '../../shared/components/PageHeader';
import styles from './Attendance.module.css';

export const Attendance = () => {
    // Data
    const [courses, setCourses] = useState<Course[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    // Filters
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const location = useLocation();

    // View State
    const [mainTab, setMainTab] = useState<'hierarchy' | 'timeline' | 'drilldown'>('hierarchy');
    const [viewMode, setViewMode] = useState<'courses' | 'sections' | 'dashboard'>('courses');
    const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');

    // Timeline States (View 1)
    const [expandedTimelineDate, setExpandedTimelineDate] = useState<string | null>(null);

    // Drilldown States (View 2)
    const [expandedDrilldownDate, setExpandedDrilldownDate] = useState<string | null>(null);
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<{ [studentId: string]: boolean }>({});
    const [statusMessage, setStatusMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const persistedRecords = useRef<{ [studentId: string]: boolean }>({});

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        setSearchTerm('');
    }, [location.key]);

    useEffect(() => {
        // Reset section when course changes
        setSelectedSectionId('');
        if (selectedCourseId) {
            setViewMode('sections');
        } else {
            setViewMode('courses');
        }
        if (selectedCourseId) {
            setSearchTerm('');
        }
    }, [selectedCourseId]);

    useEffect(() => {
        if (selectedSectionId) {
            setViewMode('dashboard');
            setMainTab('hierarchy'); // Ensure we switch to marking view when a section is selected
            loadAttendanceData();
            setSearchTerm('');
        }
    }, [selectedSectionId]);

    useEffect(() => {
        if (selectedSectionId && selectedDate) {
            loadAttendanceData();
        } else {
            setEnrolledStudents([]);
            setAttendanceRecords({});
            persistedRecords.current = {};
            setHasUnsavedChanges(false);
        }
    }, [selectedSectionId, selectedDate]);

    const getActiveStudentIds = (sectionId: string) => {
        return StorageService.getActiveStudentIdsForSection(sectionId);
    };

    const getActiveRecordStats = (record: AttendanceType, sectionId: string) => {
        const activeRecords = record.records.filter(r => StorageService.getEffectiveStudentStatus(r.studentId, sectionId));
        const present = activeRecords.filter(r => r.present).length;
        return { present, total: activeRecords.length };
    };

    const getAttendanceStatus = (percentage: number) => {
        if (percentage >= 80) return 'high';
        if (percentage >= 50) return 'mid';
        return 'low';
    };

    const { showConfirmation } = useConfirmation();

    // Navigation Blocker (React Router)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            (hasUnsavedChanges || selectedIds.length > 0) &&
            currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        const handleBlock = async () => {
            if (blocker.state === 'blocked') {
                let message = '';

                if (hasUnsavedChanges) {
                    const count = getUnsavedChangesCount();
                    message = `You have ${count} unsaved attendance change${count === 1 ? '' : 's'}. Are you sure you want to leave?`;
                } else if (selectedIds.length > 0) {
                    message = `You have ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'} selected but no attendance has been marked. Do you want to leave?`;
                }

                const confirmed = await showConfirmation({
                    title: 'Leave Attendance?',
                    message: message,
                    confirmLabel: 'Leave anyway',
                    cancelLabel: 'Stay here'
                });

                if (confirmed) {
                    blocker.proceed();
                } else {
                    blocker.reset();
                }
            }
        };
        handleBlock();
    }, [blocker, hasUnsavedChanges, selectedIds.length, showConfirmation]);

    // Unsaved changes browser listener (Refresh/Close)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges || selectedIds.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, selectedIds.length]);

    const loadInitialData = () => {
        setCourses(StorageService.getCourses());
        setSections(StorageService.getSections());
    };

    const formatStudentName = (name: string) => {
        const parts = name.split(' ');
        if (parts.length <= 1) return name;
        const last = parts[parts.length - 1];
        const first = parts.slice(0, -1).join(' ');
        return `${last} ${first}`;
    };

    const loadAttendanceData = () => {
        // 1. Get enrolled students for this section and sort them
        const studentsInSection = StorageService.getStudentsInSection(selectedSectionId);
        const sortedStudents = [...studentsInSection].sort((a, b) =>
            formatStudentName(a.name).localeCompare(formatStudentName(b.name))
        );
        setEnrolledStudents(sortedStudents);

        // 2. Get existing attendance record for this section & date
        const allAttendance = StorageService.getAttendance();
        const record = allAttendance.find(a => a.sectionId === selectedSectionId && a.date === selectedDate);

        const newRecords: { [key: string]: boolean } = {};
        if (record) {
            record.records.forEach(r => {
                newRecords[r.studentId] = r.present;
            });
        }
        // Initialize false for anyone without a record (optional, or leave undefined)
        setAttendanceRecords(newRecords);
        persistedRecords.current = { ...newRecords };
        setHasUnsavedChanges(false);
    };

    const getUnsavedChangesCount = () => {
        let count = 0;
        const keys = Object.keys({ ...persistedRecords.current, ...attendanceRecords });
        for (const key of keys) {
            if (persistedRecords.current[key] !== attendanceRecords[key]) {
                count++;
            }
        }
        return count;
    };

    const checkIfDirty = (newRecords: { [key: string]: boolean }) => {
        const keys = Object.keys({ ...persistedRecords.current, ...newRecords });
        for (const key of keys) {
            if (persistedRecords.current[key] !== newRecords[key]) {
                setHasUnsavedChanges(true);
                return;
            }
        }
        setHasUnsavedChanges(false);
    };

    const toggleSelection = (studentId: string) => {
        setSelectedIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const markSelected = (present: boolean) => {
        if (selectedIds.length === 0) return;
        const newRecords = { ...attendanceRecords };
        selectedIds.forEach(id => {
            newRecords[id] = present;
        });
        setAttendanceRecords(newRecords);
        checkIfDirty(newRecords);
        setSelectedIds([]);
    };

    const handleReset = () => {
        setAttendanceRecords({ ...persistedRecords.current });
        setHasUnsavedChanges(false);
        setSelectedIds([]);
    };

    const handleSave = () => {
        if (!selectedSectionId || !selectedDate) return;

        const records = enrolledStudents.map(s => ({
            studentId: s.id,
            present: !!attendanceRecords[s.id]
        }));

        const allAttendance = StorageService.getAttendance();
        const existing = allAttendance.find(a => a.sectionId === selectedSectionId && a.date === selectedDate);

        const attendanceData: AttendanceType = {
            id: existing ? existing.id : crypto.randomUUID(),
            sectionId: selectedSectionId,
            date: selectedDate,
            records
        };

        StorageService.saveAttendance(attendanceData);
        persistedRecords.current = { ...attendanceRecords };
        setHasUnsavedChanges(false);
        setStatusMessage('Attendance saved successfully!');
        setTimeout(() => setStatusMessage(''), 2000);
    };


    const activeStudentIds = selectedSectionId ? getActiveStudentIds(selectedSectionId) : [];
    const presentCount = enrolledStudents.filter(s => activeStudentIds.includes(s.id) && attendanceRecords[s.id]).length;
    const absentCount = activeStudentIds.length - presentCount;

    const getHistory = () => {
        if (!selectedSectionId) return [];
        return StorageService.getAttendance()
            .filter(a => a.sectionId === selectedSectionId)
            .sort((a, b) => b.date.localeCompare(a.date));
    };

    const handleEditHistory = (record: AttendanceType) => {
        setSelectedDate(record.date);
        setActiveTab('mark');
    };

    const currentCourse = courses.find(c => c.id === selectedCourseId);
    const currentSection = sections.find(s => s.id === selectedSectionId);

    // Filter courses/sections/students based on search
    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const displaySections = sections.filter(s =>
        s.courseId === selectedCourseId &&
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredEnrolledStudents = searchTerm.trim()
        ? enrolledStudents.filter(s => formatStudentName(s.name).toLowerCase().includes(searchTerm.toLowerCase()))
        : enrolledStudents;

    const selectAll = () => {
        const targetStudents = filteredEnrolledStudents;
        if (selectedIds.length === targetStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(targetStudents.map(s => s.id));
        }
    };

    const handleNavigate = async (callback: () => void) => {
        if (hasUnsavedChanges || selectedIds.length > 0) {
            let message = '';

            if (hasUnsavedChanges) {
                const count = getUnsavedChangesCount();
                message = `You have ${count} unsaved attendance change${count === 1 ? '' : 's'}. Are you sure you want to leave?`;
            } else if (selectedIds.length > 0) {
                message = `You have ${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'} selected but no attendance has been marked. Do you want to leave?`;
            }

            const confirmed = await showConfirmation({
                title: 'Leave Attendance?',
                message: message,
                confirmLabel: 'Leave',
                cancelLabel: 'Cancel'
            });

            if (confirmed) {
                setHasUnsavedChanges(false);
                setSelectedIds([]);
                setSearchTerm('');
                callback();
            }
        } else {
            setSearchTerm('');
            callback();
        }
    };

    // Removed custom mouse-back handling.

    const renderBreadcrumbs = () => (
        <div className={styles.breadcrumbs}>
            <span
                role="button"
                tabIndex={0}
                onClick={() => handleNavigate(() => { setSelectedCourseId(''); setViewMode('courses'); })}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigate(() => { setSelectedCourseId(''); setViewMode('courses'); });
                    }
                }}
                className={styles.breadcrumbLink}
            >
                Hierarchy
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
                    </span >
                </>
            )}
            {selectedSectionId && (
                <>
                    <ChevronRight size={14} />
                    <span className={styles.breadcrumbCurrent}>
                        {currentSection?.name.split(' - ')[1] || currentSection?.name}
                    </span>
                </>
            )}
        </div>
    );

    const renderCourses = () => (
        <div className={styles.courseGrid}>
            {filteredCourses.map(course => (
                <div
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCourseId(course.id);
                        }
                    }}
                    className={styles.courseCard}
                >
                    <div className={styles.courseCardHeader}>
                        <div className={styles.courseCardIcon}>
                            <Users size={20} />
                        </div>
                        <div className={styles.courseCardTitleWrap}>
                            <h3 className={styles.courseCardTitle}>{course.name}</h3>
                        </div>
                    </div>
                    <div>
                        <p className={styles.courseCardDescription}>
                            {course.description}
                        </p>
                    </div>
                    <div className={styles.courseCardFooter}>
                        <span>{sections.filter(s => s.courseId === course.id).length} Sections</span>
                        <ChevronRight size={16} />
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSections = () => (
        <div className={styles.sectionGrid}>
            {displaySections.map(section => (
                <div
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedSectionId(section.id);
                        }
                    }}
                    className={styles.sectionCard}
                >
                    <div className={styles.sectionCardHeader}>
                        <h3 className={styles.sectionCardTitle}>{section.name.split(' - ')[1] || section.name}</h3>
                        <div className={styles.sectionCardBadge}>
                            {StorageService.getActiveStudentIdsForSection(section.id).length} Students
                        </div>
                    </div>
                    <div className={styles.sectionCardMeta}>
                        <div className={styles.sectionCardMetaRow}>
                            <Clock size={14} />
                            <span>{section.days.join(', ')} • {section.startTime} - {section.endTime}</span>
                        </div>
                        <div className={styles.sectionCardMetaRow}>
                            <MapPin size={14} />
                            <span>Room {section.roomId || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            ))}
            <div
                onClick={() => handleNavigate(() => { setSelectedCourseId(''); setViewMode('courses'); })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigate(() => { setSelectedCourseId(''); setViewMode('courses'); });
                    }
                }}
                className={styles.backCard}
            >
                <ArrowLeft size={20} />
                <span>Back to Courses</span>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className={styles.dashboard}>
            {/* Dashboard Header/Tabs */}
            <div className={styles.dashboardHeader}>
                <div className={styles.dashboardTabs}>
                    <Button
                        onClick={() => setActiveTab('mark')}
                        variant={activeTab === 'mark' ? 'primary' : 'secondary'}
                        size="md"
                        className={styles.tabButton}
                    >
                        <UserCheck size={18} /> Mark Attendance
                    </Button>
                    <Button
                        onClick={() => setActiveTab('history')}
                        variant={activeTab === 'history' ? 'primary' : 'secondary'}
                        size="md"
                        className={styles.tabButton}
                    >
                        <History size={18} /> History
                    </Button>
                </div>

                {activeTab === 'mark' && enrolledStudents.length > 0 && (
                    <div className={styles.dashboardSelection}>
                        {/* Selection Controls: Select all, clear, selected counter */}
                        <div className={styles.selectionControls}>
                            {selectedIds.length > 0 && (
                                <div className={styles.selectedBadge}>
                                    <div className={styles.selectedDot}></div>
                                    <span className={styles.selectedText}>
                                        {selectedIds.length} Selected
                                    </span>
                                </div>
                            )}
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={selectAll}
                                className={styles.actionButton}
                            >
                                Select All
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleReset}
                                disabled={!hasUnsavedChanges && selectedIds.length === 0}
                                className={styles.actionButton}
                            >
                                Reset
                            </Button>
                        </div>

                        <div className={styles.dashboardDivider}></div>

                        <div className={styles.dashboardButtons}>
                            <Button
                                size="sm"
                                variant="success"
                                onClick={() => markSelected(true)}
                                disabled={selectedIds.length === 0}
                                className={styles.actionButton}
                            >
                                <CheckSquare size={14} /> Mark Selected Present
                            </Button>
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => markSelected(false)}
                                disabled={selectedIds.length === 0}
                                className={styles.actionButton}
                            >
                                <XSquare size={14} /> Mark Selected Absent
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'mark' ? (
                <>
                    {/* Date Picker & Controls */}
                    <div className={styles.dateCard}>
                        <div className={styles.dateRow}>
                            <div className={styles.dateInputWrap}>
                                <Calendar size={18} className={styles.dateInputIcon} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className={styles.dateInput}
                                />
                            </div>
                            <span className={styles.dateNote}>
                                {selectedDate === new Date().toISOString().split('T')[0] ? "(Today's Lesson)" : ""}
                            </span>
                        </div>

                        {/* Status Message & Save Button */}
                        <div className={styles.statusActions}>
                            {statusMessage && (
                                <span className={styles.statusMessage}>
                                    <CheckSquare size={16} /> {statusMessage}
                                </span>
                            )}

                            <Button
                                onClick={handleSave}
                                disabled={enrolledStudents.length === 0 || !hasUnsavedChanges}
                                size="sm"
                                className={styles.saveButton}
                            >
                                <Save size={18} /> Save Changes
                            </Button>
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        {/* Summary Bar */}
                        <div className={styles.summaryRow}>
                            <div className={`${styles.summaryBlock} ${styles.summaryBlockPresent}`}>
                                <div className={styles.summaryValue}>{presentCount}</div>
                                <div className={styles.summaryLabel}>Present</div>
                            </div>
                            <div className={`${styles.summaryBlock} ${styles.summaryBlockAbsent}`}>
                                <div className={styles.summaryValue}>{absentCount}</div>
                                <div className={styles.summaryLabel}>Absent</div>
                            </div>
                        </div>

                        {enrolledStudents.length === 0 ? (
                            <div className={styles.summaryEmpty}>
                                <Users size={48} className={styles.summaryEmptyIcon} />
                                <p>No students enrolled in this section.</p>
                            </div>
                        ) : (
                            <div
                                className={styles.studentChips}
                            >
                                {filteredEnrolledStudents.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        No students match your search.
                                    </div>
                                ) : filteredEnrolledStudents.map(student => {
                                    const isPresent = !!attendanceRecords[student.id];
                                    const isSelected = selectedIds.includes(student.id);

                                    return (
                                        <div
                                            key={student.id}
                                            onClick={() => toggleSelection(student.id)}
                                            role="button"
                                            tabIndex={0}
                                            aria-pressed={isSelected}
                                            aria-label={`${formatStudentName(student.name)} ${isPresent ? 'present' : 'absent'}${isSelected ? ', selected' : ''}`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    toggleSelection(student.id);
                                                }
                                            }}
                                            className={[
                                                styles.studentChip,
                                                isSelected ? styles.studentChipSelected : '',
                                                !isSelected && isPresent ? styles.studentChipPresent : '',
                                                !isSelected && !isPresent ? styles.studentChipAbsent : ''
                                            ].filter(Boolean).join(' ')}
                                        >
                                            <div className={styles.studentChipAvatar}>
                                                {formatStudentName(student.name).charAt(0)}
                                            </div>
                                            <span className={styles.studentChipName}>
                                                {formatStudentName(student.name)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                    </div>
                </>
            ) : (
                <div className={styles.historyCard}>
                    <div className={styles.historyHeader}>
                        Previous Lessons ({getHistory().length})
                    </div>
                    {getHistory().length === 0 ? (
                        <div className={styles.historyEmpty}>
                            <History size={48} className={styles.historyEmptyIcon} />
                            <p>No attendance records found for this section yet.</p>
                        </div>
                    ) : (
                        <div>
                            {getHistory().map(record => {
                                const { present, total } = getActiveRecordStats(record, record.sectionId);
                                return (
                                    <div
                                        key={record.id}
                                        onClick={() => handleEditHistory(record)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleEditHistory(record);
                                            }
                                        }}
                                        className={styles.historyItem}
                                    >
                                        <div className={styles.historyItemContent}>
                                            <div className={styles.historyItemIcon}>
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <div className={styles.historyItemDate}>{new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                <div className={styles.historyItemMeta}>
                                                    {present} of {total} students present • {total > 0 ? Math.round((present / total) * 100) : 0}% Attendance
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const renderTimelineHistory = () => {
        const allAttendance = StorageService.getAttendance();
        const allStudents = StorageService.getStudents();
        const groupedByDate: { [date: string]: AttendanceType[] } = {};

        allAttendance.forEach(record => {
            if (!groupedByDate[record.date]) groupedByDate[record.date] = [];
            groupedByDate[record.date].push(record);
        });

        const recordMatchesSearch = (record: AttendanceType) => {
            const q = searchTerm.trim().toLowerCase();
            if (!q) return true;
            const section = sections.find(s => s.id === record.sectionId);
            const course = courses.find(c => c && section && c.id === section.courseId);
            if (section?.name.toLowerCase().includes(q)) return true;
            if (course?.name.toLowerCase().includes(q)) return true;
            return record.records.some(r => {
                const student = allStudents.find(s => s.id === r.studentId);
                return student ? formatStudentName(student.name).toLowerCase().includes(q) : false;
            });
        };

        const filteredGroupedByDate: { [date: string]: AttendanceType[] } = {};
        Object.keys(groupedByDate).forEach(date => {
            const records = groupedByDate[date].filter(recordMatchesSearch);
            if (records.length > 0) filteredGroupedByDate[date] = records;
        });

        const sortedDates = Object.keys(filteredGroupedByDate).sort((a, b) => b.localeCompare(a));

        if (sortedDates.length === 0) {
            return (
                <div className={styles.timelineEmpty}>
                    <History size={64} className={styles.timelineEmptyIcon} />
                    <h3 className={styles.timelineEmptyTitle}>
                        {searchTerm.trim() ? 'No Matching Records' : 'No Timeline History'}
                    </h3>
                    <p className={styles.timelineEmptyText}>
                        {searchTerm.trim() ? 'Try a different search term.' : 'Start marking attendance to see your chronology here.'}
                    </p>
                </div>
            );
        }

        return (
            <div className={styles.timelineList}>
                {sortedDates.map(date => (
                    <div key={date}>
                        <div className={styles.timelineHeader}>
                            <div className={styles.timelineDateBadge}>
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <h3 className={styles.timelineDateTitle}>
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
                            </h3>
                            <div className={styles.timelineDivider}></div>
                        </div>

                        <div className={styles.timelineGrid}>
                            {filteredGroupedByDate[date].map(record => {
                                const section = sections.find(s => s.id === record.sectionId);
                                const course = courses.find(c => c && section && c.id === section.courseId);
                                const { present: presentCount, total: totalCount } = getActiveRecordStats(record, record.sectionId);
                                const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                                const isExpanded = expandedTimelineDate === record.id;
                                const attendanceStatus = getAttendanceStatus(percentage);

                                const attendingStudents = record.records
                                    .filter(r => r.present && StorageService.getEffectiveStudentStatus(r.studentId, record.sectionId))
                                    .map(r => allStudents.find(s => s.id === r.studentId))
                                    .filter((s): s is Student => !!s)
                                    .sort((a, b) => formatStudentName(a.name).localeCompare(formatStudentName(b.name)));

                                return (
                                    <div
                                        key={record.id}
                                        className={styles.timelineCard}
                                    >
                                        <div
                                            onClick={() => setExpandedTimelineDate(isExpanded ? null : record.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setExpandedTimelineDate(isExpanded ? null : record.id);
                                                }
                                            }}
                                            className={[
                                                styles.timelineCardHeader,
                                                isExpanded ? styles.timelineCardHeaderActive : ''
                                            ].filter(Boolean).join(' ')}
                                        >
                                            <div className={styles.timelineCardTitleRow}>
                                                <div>
                                                    <div className={styles.timelineCardCourse}>{course?.name || 'Unknown'}</div>
                                                    <div className={styles.timelineCardTitle}>{section?.name || 'Unknown'}</div>
                                                </div>
                                                <div className={styles.timelineMetric}>
                                                    <div className={[
                                                        styles.timelineMetricValue,
                                                        styles[`timelineMetric${attendanceStatus}`]
                                                    ].join(' ')}>{percentage}%</div>
                                                    <div className={styles.timelineMetricLabel}>ATTENDANCE</div>
                                                </div>
                                            </div>
                                            <div className={styles.timelineCardMeta}>
                                                <div className={styles.timelineCardMetaItem}>
                                                    <Users size={14} /> <span>{presentCount} / {totalCount} Students</span>
                                                </div>
                                                <div className={styles.timelineToggle}>
                                                    {isExpanded ? 'Hide Details' : 'View Details'} <ChevronDown size={14} className={isExpanded ? styles.timelineChevronOpen : styles.timelineChevron} />
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className={styles.timelineDetails}>
                                                <div className={styles.timelineDetailsTitle}>Present Students</div>
                                                <div className={styles.timelineDetailsList}>
                                                    {attendingStudents.length === 0 ? (
                                                        <div className={styles.timelineDetailsEmpty}>No students present</div>
                                                    ) : (
                                                        attendingStudents.map(s => (
                                                            <div key={s.id} className={styles.timelineStudentChip}>
                                                                {formatStudentName(s.name)}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className={styles.timelineDetailsButton}
                                                    onClick={() => {
                                                        setSelectedCourseId(course?.id || '');
                                                        setSelectedSectionId(record.sectionId);
                                                        setSelectedDate(record.date);
                                                    }}
                                                >
                                                    <UserCheck size={14} className={styles.timelineDetailsButtonIcon} /> Dashboard
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderDrilldownHistory = () => {
        const allAttendance = StorageService.getAttendance();
        const allStudents = StorageService.getStudents();
        const groupedByDate: { [date: string]: AttendanceType[] } = {};

        allAttendance.forEach(record => {
            if (!groupedByDate[record.date]) groupedByDate[record.date] = [];
            groupedByDate[record.date].push(record);
        });

        const recordMatchesSearch = (record: AttendanceType) => {
            const q = searchTerm.trim().toLowerCase();
            if (!q) return true;
            const section = sections.find(s => s.id === record.sectionId);
            const course = courses.find(c => c && section && c.id === section.courseId);
            if (section?.name.toLowerCase().includes(q)) return true;
            if (course?.name.toLowerCase().includes(q)) return true;
            return record.records.some(r => {
                const student = allStudents.find(s => s.id === r.studentId);
                return student ? formatStudentName(student.name).toLowerCase().includes(q) : false;
            });
        };

        const filteredGroupedByDate: { [date: string]: AttendanceType[] } = {};
        Object.keys(groupedByDate).forEach(date => {
            const records = groupedByDate[date].filter(recordMatchesSearch);
            if (records.length > 0) filteredGroupedByDate[date] = records;
        });

        const sortedDates = Object.keys(filteredGroupedByDate).sort((a, b) => b.localeCompare(a));

        if (sortedDates.length === 0) {
            return (
                <div className={styles.drilldownEmpty}>
                    <LayoutGrid size={64} className={styles.drilldownEmptyIcon} />
                    <h3 className={styles.drilldownEmptyTitle}>
                        {searchTerm.trim() ? 'No Matching Records' : 'No Records for Drilldown'}
                    </h3>
                    <p className={styles.drilldownEmptyText}>
                        {searchTerm.trim() ? 'Try a different search term.' : 'Attendance data will appear here once saved.'}
                    </p>
                </div>
            );
        }

        return (
            <div className={styles.drilldownCard}>
                {sortedDates.map((date, idx) => {
                    const isDateExpanded = expandedDrilldownDate === date;
                    const dailyRecords = filteredGroupedByDate[date];

                    return (
                        <div key={date} className={idx === sortedDates.length - 1 ? styles.drilldownRowLast : styles.drilldownRow}>
                            {/* Level 1: Date Row */}
                            <div
                                onClick={() => setExpandedDrilldownDate(isDateExpanded ? null : date)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setExpandedDrilldownDate(isDateExpanded ? null : date);
                                    }
                                }}
                                className={[
                                    styles.drilldownRowHeader,
                                    isDateExpanded ? styles.drilldownRowHeaderActive : ''
                                ].filter(Boolean).join(' ')}
                            >
                                <div className={styles.drilldownRowLeft}>
                                    <div className={isDateExpanded ? styles.drilldownChevronOpen : styles.drilldownChevron}>
                                        <ChevronDown size={20} />
                                    </div>
                                    <div className={styles.drilldownDateText}>
                                        <div className={styles.drilldownDateLabel}>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</div>
                                        <div className={isDateExpanded ? styles.drilldownDateValueActive : styles.drilldownDateValue}>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    </div>
                                </div>
                                <div className={isDateExpanded ? styles.drilldownBadgeActive : styles.drilldownBadge}>
                                    {dailyRecords.length} {dailyRecords.length === 1 ? 'Section' : 'Sections'}
                                </div>
                            </div>

                            {/* Level 2: Sections Dropdown */}
                            {isDateExpanded && (
                                <div className={styles.drilldownSectionList}>
                                    {dailyRecords.map(record => {
                                        const section = sections.find(s => s.id === record.sectionId);
                                        const course = courses.find(c => c && section && c.id === section.courseId);
                                        const isSectionExpanded = expandedSectionId === record.id;
                                        const { present: presentCount } = getActiveRecordStats(record, record.sectionId);

                                        return (
                                            <div key={record.id}>
                                                <div
                                                    onClick={() => setExpandedSectionId(isSectionExpanded ? null : record.id)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setExpandedSectionId(isSectionExpanded ? null : record.id);
                                                        }
                                                    }}
                                                    className={[
                                                        styles.drilldownSectionRow,
                                                        isSectionExpanded ? styles.drilldownSectionRowActive : ''
                                                    ].filter(Boolean).join(' ')}
                                                >
                                                    <div className={styles.drilldownSectionLeft}>
                                                        <ChevronRight size={18} className={isSectionExpanded ? styles.drilldownSectionChevronOpen : styles.drilldownSectionChevron} />
                                                        <div>
                                                            <div className={styles.drilldownSectionCourse}>{course?.name}</div>
                                                            <div className={styles.drilldownSectionTitle}>{section?.name}</div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.drilldownSectionStats}>
                                                        <div className={styles.drilldownSectionCount}>{presentCount} Present</div>
                                                        <div className={styles.drilldownSectionCountLabel}>at this time</div>
                                                    </div>
                                                </div>

                                                {/* Level 3: Attendee Cards */}
                                                {isSectionExpanded && (
                                                    <div className={styles.drilldownAttendees}>
                                                        {getActiveRecordStats(record, record.sectionId).present === 0 ? (
                                                            <div className={styles.drilldownAttendeesEmpty}>No attendees recorded.</div>
                                                        ) : (
                                                            record.records.filter(r => r.present && StorageService.getEffectiveStudentStatus(r.studentId, record.sectionId)).map(r => {
                                                                const student = allStudents.find(s => s.id === r.studentId);
                                                                return (
                                                                    <div key={r.studentId} className={styles.drilldownAttendeeCard}>
                                                                        <div className={styles.drilldownAttendeeAvatar}>
                                                                            {student?.name.charAt(0)}
                                                                        </div>
                                                                        <div className={styles.drilldownAttendeeInfo}>
                                                                            <div className={styles.drilldownAttendeeName}>{student ? formatStudentName(student.name) : 'Unknown'}</div>
                                                                            <div className={styles.drilldownAttendeeStatus}>PRESENT</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={`module ${styles.attendanceModule}`}>
            <PageHeader
                compact={true}
                title="Attendance"
                actions={
                    <div className={styles.searchWrap}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder={
                                mainTab === 'hierarchy'
                                    ? viewMode === 'dashboard'
                                        ? 'Search students...'
                                        : `Search ${viewMode}...`
                                    : 'Search records...'
                            }
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
            >
                <div className={styles.mainTabs}>
                    <button
                        onClick={() => setMainTab('hierarchy')}
                        className={[
                            styles.mainTabButton,
                            mainTab === 'hierarchy' ? styles.mainTabButtonActive : ''
                        ].filter(Boolean).join(' ')}
                    >
                        <Users size={16} /> Hierarchy
                    </button>
                    <button
                        onClick={() => setMainTab('timeline')}
                        className={[
                            styles.mainTabButton,
                            mainTab === 'timeline' ? styles.mainTabButtonActive : ''
                        ].filter(Boolean).join(' ')}
                    >
                        <Clock size={16} /> Timeline
                    </button>
                    <button
                        onClick={() => setMainTab('drilldown')}
                        className={[
                            styles.mainTabButton,
                            mainTab === 'drilldown' ? styles.mainTabButtonActive : ''
                        ].filter(Boolean).join(' ')}
                    >
                        <LayoutGrid size={16} /> Drilldown
                    </button>
                </div>
            </PageHeader >

            {
                mainTab === 'hierarchy' ? (
                    <>
                        {renderBreadcrumbs()}
                        <div className={styles.hierarchyContent}>
                            {viewMode === 'courses' && renderCourses()}
                            {viewMode === 'sections' && renderSections()}
                            {viewMode === 'dashboard' && renderDashboard()}
                        </div>
                    </>
                ) : mainTab === 'timeline' ? (
                    renderTimelineHistory()
                ) : (
                    renderDrilldownHistory()
                )
            }
        </div >
    );
};
