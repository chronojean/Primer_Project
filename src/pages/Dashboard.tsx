import { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { seedDatabase, clearData } from '../services/seeder';
import { BookOpen, Users, UserCheck, UserX, Database, Trash, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface CourseAttendanceStats {
    courseId: string;
    courseName: string;
    present: number;
    total: number;
    percentage: number;
}

export const Dashboard = () => {
    const [stats, setStats] = useState({
        activeCourses: 0,
        totalStudents: 0,
        enrolledStudents: 0,
        notEnrolledStudents: 0,
        professors: 0
    });
    const [courseAttendance, setCourseAttendance] = useState<CourseAttendanceStats[]>([]);

    const loadStats = () => {
        const courses = StorageService.getCourses();
        const students = StorageService.getStudents();
        const professors = StorageService.getProfessors();
        const sections = StorageService.getSections();
        const enrollments = StorageService.getEnrollments();
        const attendance = StorageService.getAttendance();

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // 1. Identify Active Sections
        const activeSectionIds = sections.filter(s => {
            if (!s.startDate || !s.endDate) return true;
            return s.startDate <= today && s.endDate >= today;
        }).map(s => s.id);

        // 2. Active Courses
        const activeCourseIds = new Set(
            sections.filter(s => activeSectionIds.includes(s.id)).map(s => s.courseId)
        );

        // 3. Enrolled Students
        const enrolledStudentIds = new Set(
            enrollments
                .filter(e => activeSectionIds.includes(e.sectionId))
                .map(e => e.studentId)
        );

        setStats({
            activeCourses: activeCourseIds.size,
            totalStudents: students.length,
            enrolledStudents: enrolledStudentIds.size,
            notEnrolledStudents: students.length - enrolledStudentIds.size,
            professors: professors.length
        });

        // Calculate attendance by course
        const courseAttendanceMap = new Map<string, { present: number; total: number }>();
        
        courses.forEach(course => {
            const courseSections = sections.filter(s => s.courseId === course.id);
            let totalPresent = 0;
            let totalRecords = 0;

            courseSections.forEach(section => {
                const sectionAttendance = attendance.filter(a => a.sectionId === section.id);
                sectionAttendance.forEach(a => {
                    totalRecords += a.records.length;
                    totalPresent += a.records.filter(r => r.present).length;
                });
            });

            if (totalRecords > 0) {
                courseAttendanceMap.set(course.id, { present: totalPresent, total: totalRecords });
            }
        });

        const attendanceStats: CourseAttendanceStats[] = courses
            .map(course => {
                const stats = courseAttendanceMap.get(course.id);
                if (!stats) return null;
                return {
                    courseId: course.id,
                    courseName: course.name,
                    present: stats.present,
                    total: stats.total,
                    percentage: Math.round((stats.present / stats.total) * 100)
                };
            })
            .filter((s): s is CourseAttendanceStats => s !== null)
            .sort((a, b) => b.percentage - a.percentage);

        setCourseAttendance(attendanceStats);
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleClearData = () => {
        if (confirm('Clear all data?')) {
            clearData();
            loadStats();
        }
    };

    const handleLoadDemoData = () => {
        if (confirm('Load dummy data? (This will add to existing data)')) {
            try {
                seedDatabase();
                loadStats();
                setTimeout(() => window.location.reload(), 500);
            } catch (error: any) {
                alert('Error loading demo data: ' + error.message);
                console.error(error);
            }
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button variant="secondary" onClick={handleClearData}>
                        <Trash size={16} style={{ marginRight: '0.5rem' }} /> Clear Data
                    </Button>
                    <Button onClick={handleLoadDemoData}>
                        <Database size={16} style={{ marginRight: '0.5rem' }} /> Load Demo Data
                    </Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                {/* Grouped Courses & Professors Stats Card */}
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#fef3c7' }}>
                            <BookOpen size={24} color="#f59e0b" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Overview</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Active Courses</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{stats.activeCourses}</p>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Professors</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{stats.professors}</p>
                        </div>
                    </div>
                </div>

                {/* Grouped Student Stats Card */}
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#ecfdf5' }}>
                            <Users size={24} color="#10b981" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Students Overview</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Students</p>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{stats.totalStudents}</p>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <UserCheck size={16} color="#2563eb" />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Enrolled</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#2563eb' }}>{stats.enrolledStudents}</p>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <UserX size={16} color="#ef4444" />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Not Enrolled</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>{stats.notEnrolledStudents}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance by Course Section */}
            {courseAttendance.length > 0 && (
                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <TrendingUp size={24} color="#10b981" />
                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Course Attendance</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                        {courseAttendance.map(course => {
                            const getColor = (percentage: number) => {
                                if (percentage >= 90) return '#10b981'; // Green
                                if (percentage >= 75) return '#f59e0b'; // Amber
                                if (percentage >= 60) return '#f97316'; // Orange
                                return '#ef4444'; // Red
                            };

                            const color = getColor(course.percentage);

                            return (
                                <div
                                    key={course.courseId}
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        padding: '1.5rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--shadow-sm)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {course.courseName}
                                            </h3>
                                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                {course.present} / {course.total} present
                                            </p>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '70px',
                                            height: '70px',
                                            borderRadius: '50%',
                                            backgroundColor: `${color}20`,
                                            flexDirection: 'column'
                                        }}>
                                            <span style={{ fontSize: '1.75rem', fontWeight: 700, color }}>
                                                {course.percentage}%
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>attended</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{
                                        width: '100%',
                                        height: '8px',
                                        backgroundColor: 'var(--border-color)',
                                        borderRadius: '10px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${course.percentage}%`,
                                            backgroundColor: color,
                                            transition: 'width 0.3s ease'
                                        }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
