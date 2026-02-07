import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Section, Student, Course, Professor } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Input';
import { ArrowLeft, UserPlus } from 'lucide-react';

export const SectionDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [section, setSection] = useState<Section | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [professor, setProfessor] = useState<Professor | null>(null);

    // Enrollments
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);

    // Enrollment Modal
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [enrollError, setEnrollError] = useState('');

    // Attendance
    const [attendanceDate] = useState(new Date().toISOString().split('T')[0]);
    // Removed unused attendanceRecords
    // Removed unused setSaveStatus, saveStatus, setAttendanceDate

    useEffect(() => {
        if (id) loadSectionData(id);
    }, [id]);

    useEffect(() => {
        // When date changes, load attendance for that date
        if (id && attendanceDate) {
            loadAttendanceForDate(id, attendanceDate);
        }
    }, [attendanceDate, id]);

    const loadSectionData = (sectionId: string) => {
        const sections = StorageService.getSections();
        const foundSection = sections.find(s => s.id === sectionId);

        if (foundSection) {
            setSection(foundSection);

            const courses = StorageService.getCourses();
            setCourse(courses.find(c => c.id === foundSection.courseId) || null);

            const professors = StorageService.getProfessors();
            setProfessor(professors.find(p => p.id === foundSection.professorId) || null);

            setAllStudents(StorageService.getStudents());
            setEnrolledStudents(StorageService.getStudentsInSection(sectionId));
        }
    };

    const loadAttendanceForDate = (_sectionId: string, _date: string) => {
        // Attendance records logic removed - moved to dedicated attendance module
    };

    const handleEnrollStudent = (e: React.FormEvent) => {
        e.preventDefault();
        setEnrollError('');
        if (!selectedStudentId) {
            setEnrollError('Please select a student.');
            return;
        }
        if (!section) return;

        try {
            StorageService.enrollStudent({
                id: crypto.randomUUID(),
                studentId: selectedStudentId,
                sectionId: section.id,
                courseId: section.courseId,
                enrolledAt: new Date().toISOString()
            });

            // Refresh
            setEnrolledStudents(StorageService.getStudentsInSection(section.id));
            setIsEnrollModalOpen(false);
            setSelectedStudentId('');
        } catch (err: any) {
            setEnrollError(err.message);
        }
    };

    // Removed unused toggleAttendance and saveAttendance functions

    if (!section) return <div style={{ padding: '2rem' }}>Loading or Section not found...</div>;

    // Filter students eligible for enrollment (not already enrolled in this section)
    // The service check will catch "already in course" but for UI we might want to filter candidates?
    // For now, just show all not in *this* section. Service handles logic.
    const eligibleStudents = allStudents.filter(s => !enrolledStudents.find(es => es.id === s.id));

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link to="/sections" style={{ display: 'flex', alignItems: 'center', color: '#a1a1aa', marginBottom: '1rem' }}>
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Sections
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: '0 0 0.5rem 0' }}>{section.name}</h1>
                        <p style={{ margin: 0, color: '#a1a1aa' }}>
                            {course?.name} • {professor?.name || 'No Professor'} • {section.days ? `${section.days.join(', ')} ${section.startTime}-${section.endTime}` : section.schedule} • {section.roomId}
                        </p>
                    </div>
                    <Button onClick={() => setIsEnrollModalOpen(true)}>
                        <UserPlus size={16} style={{ marginRight: '0.5rem' }} /> Enroll Student
                    </Button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Enrolled Students List */}
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                        Enrolled Students ({enrolledStudents.length})
                    </h2>
                    <div style={{ backgroundColor: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', overflow: 'hidden' }}>
                        {enrolledStudents.length === 0 ? (
                            <div style={{ padding: '1rem', color: '#71717a' }}>No students enrolled.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {enrolledStudents.map(student => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid #27272a' }}>
                                            <td style={{ padding: '0.75rem 1rem' }}>{student.name}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                {/* Un-enroll capability can be added here */}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Attendance */}
                <div>
                    {/* Attendance Panel Removed - Moved to dedicated /attendance module */}
                    <div style={{ backgroundColor: '#1a1a1a', borderRadius: '0.5rem', border: '1px solid #333', padding: '1.5rem', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#a1a1aa' }}>Attendance</h2>
                        <p style={{ color: '#71717a', marginBottom: '1rem' }}>Attendance management has moved to the dedicated module.</p>
                        <Link to="/attendance" style={{ display: 'inline-block' }}>
                            <Button variant="secondary">Go to Attendance</Button>
                        </Link>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                title="Enroll Student"
            >
                {enrollError && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                        {enrollError}
                    </div>
                )}
                <form onSubmit={handleEnrollStudent}>
                    {eligibleStudents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#a1a1aa' }}>
                            <p>No eligible students found to enroll.</p>
                            <Button type="button" variant="secondary" onClick={() => setIsEnrollModalOpen(false)}>Close</Button>
                        </div>
                    ) : (
                        <>
                            <Select
                                label="Student"
                                value={selectedStudentId}
                                onChange={e => setSelectedStudentId(e.target.value)}
                                options={[
                                    { value: '', label: 'Select Student' },
                                    ...eligibleStudents.map(s => ({ value: s.id, label: s.name }))
                                ]}
                                required
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsEnrollModalOpen(false)}>Cancel</Button>
                                <Button type="submit">Enroll</Button>
                            </div>
                        </>
                    )}
                </form>
            </Modal>
        </div>
    );
};
