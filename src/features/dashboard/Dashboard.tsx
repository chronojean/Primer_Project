import { useState, useEffect } from 'react';
import { StorageService } from '../../shared/utils/storage';
import { seedDatabase, clearData } from '../../shared/utils/seeder';
import { BookOpen, Users, UserCheck, UserX, Database, Trash, TrendingUp } from 'lucide-react';
import { Button } from '../../shared/components/Button';
import { useConfirmation } from '../../shared/hooks/useConfirmation';
import styles from './Dashboard.module.css';

interface CourseAttendanceStats {
    courseId: string;
    courseName: string;
    present: number;
    total: number;
    percentage: number;
}

export const Dashboard = () => {
    const { showConfirmation } = useConfirmation();
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
                    const activeRecords = a.records.filter(r => StorageService.getEffectiveStudentStatus(r.studentId, section.id));
                    totalRecords += activeRecords.length;
                    totalPresent += activeRecords.filter(r => r.present).length;
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

    const handleClearData = async () => {
        const confirmed = await showConfirmation({
            title: 'Clear All Data?',
            message: 'This will remove all stored data. Are you sure you want to continue?',
            confirmLabel: 'Clear data',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        clearData();
        loadStats();
    };

    const handleLoadDemoData = async () => {
        const confirmed = await showConfirmation({
            title: 'Load Demo Data?',
            message: 'This will add demo data to existing data. Do you want to continue?',
            confirmLabel: 'Load demo data',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        try {
            seedDatabase();
            loadStats();
            setTimeout(() => window.location.reload(), 500);
        } catch (error: any) {
            await showConfirmation({
                title: 'Error Loading Demo Data',
                message: `Error loading demo data: ${error.message}`,
                confirmLabel: 'OK',
                cancelLabel: 'Close'
            });
            console.error(error);
        }
    };

    return (
        <div className="module">
            <div className="module-header">
                <h1 className={styles.dashboardTitle}>Dashboard</h1>
                <div className="module-actions">
                    <Button variant="secondary" onClick={handleClearData}>
                        <Trash size={16} className={styles.buttonIcon} /> Clear Data
                    </Button>
                    <Button onClick={handleLoadDemoData}>
                        <Database size={16} className={styles.buttonIcon} /> Load Demo Data
                    </Button>
                </div>
            </div>

            <div className={`grid ${styles.statsGrid}`}>
                {/* Grouped Courses & Professors Stats Card */}
                <div className="card">
                    <div className="card-header">
                        <div className={styles.cardHeaderIcon}>
                            <BookOpen size={24} color="var(--text-primary)" />
                        </div>
                        <h2 className={styles.cardHeaderTitle}>Overview</h2>
                    </div>

                    <div className={styles.overviewGrid}>
                        <div>
                            <p className={styles.statLabel}>Active Courses</p>
                            <p className={styles.statValue}>{stats.activeCourses}</p>
                        </div>
                        <div className={styles.statDivider}>
                            <p className={styles.statLabel}>Professors</p>
                            <p className={styles.statValue}>{stats.professors}</p>
                        </div>
                    </div>
                </div>

                {/* Grouped Student Stats Card */}
                <div className="card">
                    <div className="card-header">
                        <div className={styles.cardHeaderIcon}>
                            <Users size={24} color="var(--text-primary)" />
                        </div>
                        <h2 className={styles.cardHeaderTitle}>Students Overview</h2>
                    </div>

                    <div className={styles.studentsGrid}>
                        <div>
                            <p className={styles.statLabel}>Total Students</p>
                            <p className={styles.statValue}>{stats.totalStudents}</p>
                        </div>
                        <div className={styles.statDividerWide}>
                            <div className={styles.statIconRow}>
                                <UserCheck size={16} color="var(--text-primary)" />
                                <span className={styles.statLabel}>Enrolled</span>
                            </div>
                            <p className={styles.statValue}>{stats.enrolledStudents}</p>
                        </div>
                        <div className={styles.statDividerWide}>
                            <div className={styles.statIconRow}>
                                <UserX size={16} color="var(--text-primary)" />
                                <span className={styles.statLabel}>Not Enrolled</span>
                            </div>
                            <p className={styles.statValue}>{stats.notEnrolledStudents}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance by Course Section */}
            {courseAttendance.length > 0 && (
                <div className="section">
                    <div className={styles.attendanceHeader}>
                        <TrendingUp size={24} className={styles.attendanceHeaderIcon} />
                        <h2 className={styles.attendanceHeaderTitle}>Course Attendance</h2>
                    </div>

                    <div className={`grid ${styles.attendanceGrid}`}>
                        {courseAttendance.map(course => {
                            const getStatus = (percentage: number) => {
                                if (percentage >= 90) return 'excellent';
                                if (percentage >= 75) return 'good';
                                if (percentage >= 60) return 'warn';
                                return 'poor';
                            };

                            const status = getStatus(course.percentage);

                            return (
                                <div
                                    key={course.courseId}
                                    className={`card ${styles.attendanceCard}`}
                                >
                                    <div className={styles.attendanceCardHeader}>
                                        <div>
                                            <h3 className={styles.attendanceCardTitle}>
                                                {course.courseName}
                                            </h3>
                                            <p className={styles.attendanceCardSubtitle}>
                                                {course.present} / {course.total} present
                                            </p>
                                        </div>
                                        <div className={`${styles.attendanceBadge} ${styles[`attendanceBadge${status}`]}`}>
                                            <span className={`${styles.attendanceBadgeValue} ${styles[`attendanceBadgeValue${status}`]}`}>
                                                {course.percentage}%
                                            </span>
                                            <span className={styles.attendanceBadgeLabel}>attended</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <progress
                                        className={`${styles.attendanceProgress} ${styles[`attendanceProgress${status}`]}`}
                                        value={course.percentage}
                                        max={100}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
