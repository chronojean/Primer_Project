import { useState, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfirmation } from '../context/ConfirmationContext';
import { StorageService } from '../services/storage';
import { Course, Section, Student, Attendance as AttendanceType } from '../types';
import { Button } from '../components/ui/Button';
import { Save, Calendar, CheckSquare, XSquare, ChevronRight, ChevronDown, LayoutGrid, ArrowLeft, History, UserCheck, Users, Search, Clock, MapPin } from 'lucide-react';

export const Attendance = () => {
    // Data
    const [courses, setCourses] = useState<Course[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    // Filters
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
        // Reset section when course changes
        setSelectedSectionId('');
        if (selectedCourseId) {
            setViewMode('sections');
        } else {
            setViewMode('courses');
        }
    }, [selectedCourseId]);

    useEffect(() => {
        if (selectedSectionId) {
            setViewMode('dashboard');
            setMainTab('hierarchy'); // Ensure we switch to marking view when a section is selected
            loadAttendanceData();
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

    const selectAll = () => {
        if (selectedIds.length === enrolledStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(enrolledStudents.map(s => s.id));
        }
    };

    const presentCount = enrolledStudents.filter(s => attendanceRecords[s.id]).length;
    const absentCount = enrolledStudents.length - presentCount;

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

    // Filter courses/sections based on search
    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const displaySections = sections.filter(s =>
        s.courseId === selectedCourseId &&
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                callback();
            }
        } else {
            callback();
        }
    };

    const renderBreadcrumbs = () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
                style={{ cursor: 'pointer' }}
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
                        style={{ cursor: 'pointer', fontWeight: viewMode === 'sections' ? 600 : 400, color: viewMode === 'sections' ? 'var(--primary)' : 'inherit' }}
                    >
                        {currentCourse?.name}
                    </span >
                </>
            )}
            {selectedSectionId && (
                <>
                    <ChevronRight size={14} />
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {currentSection?.name.split(' - ')[1] || currentSection?.name}
                    </span>
                </>
            )}
        </div>
    );

    const renderCourses = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
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
                        gap: '1rem'
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
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <Users size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>{course.name}</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {course.description}
                        </p>
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>{sections.filter(s => s.courseId === course.id).length} Sections</span>
                        <ChevronRight size={16} />
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSections = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
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
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: 'var(--shadow-sm)'
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{section.name.split(' - ')[1] || section.name}</h3>
                        <div style={{ padding: '0.25rem 0.6rem', backgroundColor: 'var(--bg-hover)', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                            {StorageService.getEnrollments().filter(e => e.sectionId === section.id).length} Students
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={14} />
                            <span>{section.days.join(', ')} • {section.startTime} - {section.endTime}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                style={{
                    backgroundColor: 'transparent',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    border: '2px dashed var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.borderColor = 'var(--primary)';
                    target.style.color = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.borderColor = 'var(--border-color)';
                    target.style.color = 'var(--text-secondary)';
                }}
            >
                <ArrowLeft size={20} />
                <span>Back to Courses</span>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}
        >
            {/* Dashboard Header/Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem', backgroundColor: 'var(--bg-card)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                        onClick={() => setActiveTab('mark')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            backgroundColor: activeTab === 'mark' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'mark' ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <UserCheck size={18} /> Mark Attendance
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            padding: '0.6rem 1.25rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            backgroundColor: activeTab === 'history' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'history' ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <History size={18} /> History
                    </button>
                </div>

                {activeTab === 'mark' && enrolledStudents.length > 0 && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingRight: '0.5rem' }}>
                        {/* Selection Controls: Select all, clear, selected counter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {selectedIds.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', borderRight: '1px solid var(--border-color)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', animation: 'pulse 2s infinite' }}></div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {selectedIds.length} Selected
                                    </span>
                                </div>
                            )}
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={selectAll}
                                style={{ fontWeight: 600, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                                Select All
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedIds([])}
                                disabled={selectedIds.length === 0}
                                style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                            >
                                Clear
                            </Button>
                        </div>

                        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)', margin: '0 0.25rem' }}></div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <Button
                                size="sm"
                                onClick={() => markSelected(true)}
                                disabled={selectedIds.length === 0}
                                style={{
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 600,
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    opacity: selectedIds.length === 0 ? 0.6 : 1
                                }}
                            >
                                <CheckSquare size={14} /> Mark Selected Present
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => markSelected(false)}
                                disabled={selectedIds.length === 0}
                                style={{
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontWeight: 600,
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.85rem',
                                    opacity: selectedIds.length === 0 ? 0.6 : 1
                                }}
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
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    style={{
                                        padding: '0.6rem 1rem 0.6rem 2.75rem',
                                        backgroundColor: 'var(--bg-input)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.375rem',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        width: '200px'
                                    }}
                                />
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                {selectedDate === new Date().toISOString().split('T')[0] ? "(Today's Lesson)" : ""}
                            </span>
                        </div>

                        {/* Status Message & Save Button */}
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                            {statusMessage && (
                                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <CheckSquare size={16} /> {statusMessage}
                                </span>
                            )}

                            <Button
                                onClick={handleSave}
                                disabled={enrolledStudents.length === 0 || !hasUnsavedChanges}
                                size="sm"
                                style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
                            >
                                <Save size={18} /> Save Changes
                            </Button>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                        {/* Summary Bar */}
                        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ flex: 1, padding: '1.25rem', backgroundColor: '#ecfdf5', color: '#065f46', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{presentCount}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</div>
                            </div>
                            <div style={{ flex: 1, padding: '1.25rem', backgroundColor: '#fef2f2', color: '#991b1b', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{absentCount}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent</div>
                            </div>
                        </div>

                        {enrolledStudents.length === 0 ? (
                            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <Users size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                <p>No students enrolled in this section.</p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem',
                                    maxHeight: '600px',
                                    overflowY: 'auto',
                                    backgroundColor: '#fafafa'
                                }}
                            >
                                {enrolledStudents.map(student => {
                                    const isPresent = !!attendanceRecords[student.id];
                                    const isSelected = selectedIds.includes(student.id);

                                    // Status colors
                                    const bgColor = isSelected ? '#1e3a8a' : (isPresent ? '#10b981' : '#ef4444');
                                    const borderColor = isSelected ? '#312e81' : (isPresent ? '#059669' : '#dc2626');
                                    const textColor = 'white';

                                    return (
                                        <div
                                            key={student.id}
                                            onClick={() => toggleSelection(student.id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    toggleSelection(student.id);
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.6rem 1.25rem',
                                                borderRadius: '2rem',
                                                cursor: 'pointer',
                                                width: 'fit-content',
                                                backgroundColor: bgColor,
                                                border: `2px solid ${borderColor}`,
                                                color: textColor,
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: isSelected ? '0 0 0 3px rgba(30, 58, 138, 0.2), var(--shadow-sm)' : 'var(--shadow-sm)',
                                                userSelect: 'none',
                                                transform: isSelected ? 'scale(1.02)' : 'none'
                                            }}
                                            onMouseEnter={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.transform = isSelected ? 'scale(1.02) translateY(-2px)' : 'translateY(-2px)';
                                                target.style.boxShadow = 'var(--shadow-md)';
                                            }}
                                            onMouseLeave={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.transform = isSelected ? 'scale(1.02)' : 'none';
                                                target.style.boxShadow = isSelected ? '0 0 0 3px rgba(30, 58, 138, 0.2), var(--shadow-sm)' : 'var(--shadow-sm)';
                                            }}
                                        >
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(255,255,255,0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                color: 'white'
                                            }}>
                                                {formatStudentName(student.name).charAt(0)}
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
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
                <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc', fontWeight: 600, color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Previous Lessons ({getHistory().length})
                    </div>
                    {getHistory().length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <History size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                            <p>No attendance records found for this section yet.</p>
                        </div>
                    ) : (
                        <div>
                            {getHistory().map(record => {
                                const present = record.records.filter(r => r.present).length;
                                const total = record.records.length;
                                return (
                                    <div key={record.id}
                                        onClick={() => handleEditHistory(record)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleEditHistory(record);
                                            }
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '1.25rem',
                                            borderBottom: '1px solid var(--border-color)',
                                            transition: 'background-color 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'}
                                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-hover)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                    {present} of {total} students present • {Math.round((present / total) * 100)}% Attendance
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

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

        if (sortedDates.length === 0) {
            return (
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '4rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <History size={64} style={{ marginBottom: '1.5rem', opacity: 0.1 }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>No Timeline History</h3>
                    <p style={{ margin: 0 }}>Start marking attendance to see your chronology here.</p>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {sortedDates.map(date => (
                    <div key={date}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
                            </h3>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                            {groupedByDate[date].map(record => {
                                const section = sections.find(s => s.id === record.sectionId);
                                const course = courses.find(c => c && section && c.id === section.courseId);
                                const presentCount = record.records.filter(r => r.present).length;
                                const totalCount = record.records.length;
                                const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
                                const isExpanded = expandedTimelineDate === record.id;

                                const attendingStudents = record.records
                                    .filter(r => r.present)
                                    .map(r => allStudents.find(s => s.id === r.studentId))
                                    .filter((s): s is Student => !!s)
                                    .sort((a, b) => formatStudentName(a.name).localeCompare(formatStudentName(b.name)));

                                return (
                                    <div
                                        key={record.id}
                                        style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
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
                                            style={{ padding: '1.25rem', cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: isExpanded ? 'var(--bg-hover)' : 'transparent' }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{course?.name || 'Unknown'}</div>
                                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{section?.name || 'Unknown'}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: percentage >= 80 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444' }}>{percentage}%</div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>ATTENDANCE</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Users size={14} /> <span>{presentCount} / {totalCount} Students</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                    {isExpanded ? 'Hide Details' : 'View Details'} <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }} />
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Present Students</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {attendingStudents.length === 0 ? (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No students present</div>
                                                    ) : (
                                                        attendingStudents.map(s => (
                                                            <div key={s.id} style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-hover)', borderRadius: '0.25rem', fontSize: '0.75rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                                                                {formatStudentName(s.name)}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    style={{ width: '100%', marginTop: '1.25rem', fontWeight: 700 }}
                                                    onClick={() => {
                                                        setSelectedCourseId(course?.id || '');
                                                        setSelectedSectionId(record.sectionId);
                                                        setSelectedDate(record.date);
                                                    }}
                                                >
                                                    <UserCheck size={14} style={{ marginRight: '0.5rem' }} /> Dashboard
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

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

        if (sortedDates.length === 0) {
            return (
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '4rem', textAlign: 'center', borderRadius: '0.75rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <LayoutGrid size={64} style={{ marginBottom: '1.5rem', opacity: 0.1 }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>No Records for Drilldown</h3>
                    <p style={{ margin: 0 }}>Attendance data will appear here once saved.</p>
                </div>
            );
        }

        return (
            <div style={{ borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                {sortedDates.map((date, idx) => {
                    const isDateExpanded = expandedDrilldownDate === date;
                    const dailyRecords = groupedByDate[date];

                    return (
                        <div key={date} style={{ borderBottom: idx === sortedDates.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
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
                                style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isDateExpanded ? 'var(--bg-hover)' : 'transparent', transition: 'all 0.2s' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                    <div style={{ color: isDateExpanded ? 'var(--primary)' : 'var(--text-secondary)', transition: 'transform 0.2s', transform: isDateExpanded ? 'rotate(180deg)' : 'none' }}>
                                        <ChevronDown size={20} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isDateExpanded ? 'var(--primary)' : 'var(--text-primary)' }}>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    </div>
                                </div>
                                <div style={{ padding: '0.4rem 0.8rem', backgroundColor: isDateExpanded ? 'var(--primary)' : 'var(--bg-hover)', color: isDateExpanded ? 'white' : 'var(--primary)', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700 }}>
                                    {dailyRecords.length} {dailyRecords.length === 1 ? 'Section' : 'Sections'}
                                </div>
                            </div>

                            {/* Level 2: Sections Dropdown */}
                            {isDateExpanded && (
                                <div style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderTop: '1px solid var(--border-color)', padding: '0.5rem 0' }}>
                                    {dailyRecords.map(record => {
                                        const section = sections.find(s => s.id === record.sectionId);
                                        const course = courses.find(c => c && section && c.id === section.courseId);
                                        const isSectionExpanded = expandedSectionId === record.id;
                                        const presentCount = record.records.filter(r => r.present).length;

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
                                                    style={{ padding: '1rem 1.5rem 1rem 4rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isSectionExpanded ? 'white' : 'transparent', transition: 'all 0.2s', borderBottom: isSectionExpanded ? '1px solid var(--border-color)' : 'none' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <ChevronRight size={18} style={{ color: isSectionExpanded ? 'var(--primary)' : '#94a3b8', transform: isSectionExpanded ? 'rotate(90deg)' : 'none', transition: 'all 0.2s' }} />
                                                        <div>
                                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{course?.name}</div>
                                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{section?.name}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{presentCount} Present</div>
                                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>at this time</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Level 3: Attendee Cards */}
                                                {isSectionExpanded && (
                                                    <div style={{ padding: '1.5rem 1.5rem 1.5rem 5.5rem', backgroundColor: 'white', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                                        {record.records.filter(r => r.present).length === 0 ? (
                                                            <div style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No attendees recorded.</div>
                                                        ) : (
                                                            record.records.filter(r => r.present).map(r => {
                                                                const student = allStudents.find(s => s.id === r.studentId);
                                                                return (
                                                                    <div key={r.studentId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>
                                                                            {student?.name.charAt(0)}
                                                                        </div>
                                                                        <div style={{ overflow: 'hidden' }}>
                                                                            <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student ? formatStudentName(student.name) : 'Unknown'}</div>
                                                                            <div style={{ fontSize: '0.65rem', color: '#22c55e', fontWeight: 800 }}>PRESENT</div>
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Attendance</h1>

                    {/* Main Tabs */}
                    <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                        <button
                            onClick={() => setMainTab('hierarchy')}
                            style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: '0.5rem', backgroundColor: mainTab === 'hierarchy' ? 'var(--primary)' : 'transparent', color: mainTab === 'hierarchy' ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                        >
                            <Users size={16} /> Hierarchy
                        </button>
                        <button
                            onClick={() => setMainTab('timeline')}
                            style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: '0.5rem', backgroundColor: mainTab === 'timeline' ? 'var(--primary)' : 'transparent', color: mainTab === 'timeline' ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                        >
                            <Clock size={16} /> Timeline
                        </button>
                        <button
                            onClick={() => setMainTab('drilldown')}
                            style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: '0.5rem', backgroundColor: mainTab === 'drilldown' ? 'var(--primary)' : 'transparent', color: mainTab === 'drilldown' ? 'white' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                        >
                            <LayoutGrid size={16} /> Drilldown
                        </button>
                    </div>
                </div>

                <div style={{ position: 'relative', width: '320px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder={mainTab === 'hierarchy' ? `Search ${viewMode}...` : "Search records..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1.25rem 0.75rem 3.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '2rem', fontSize: '0.9rem', outline: 'none', boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.2s' }}
                    />
                </div>
            </div>

            {mainTab === 'hierarchy' ? (
                <>
                    {renderBreadcrumbs()}
                    <div style={{ marginTop: '1rem' }}>
                        {viewMode === 'courses' && renderCourses()}
                        {viewMode === 'sections' && renderSections()}
                        {viewMode === 'dashboard' && renderDashboard()}
                    </div>
                </>
            ) : mainTab === 'timeline' ? (
                renderTimelineHistory()
            ) : (
                renderDrilldownHistory()
            )}
        </div>
    );
};
