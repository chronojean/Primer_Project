import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StorageService } from '../services/storage';
import { Course } from '../types';
import { ArrowLeft } from 'lucide-react';
import { SectionsModule } from '../components/SectionsModule';

export const CourseDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [course, setCourse] = useState<Course | null>(null);

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = (courseId: string) => {
        const allCourses = StorageService.getCourses();
        const foundCourse = allCourses.find(c => c.id === courseId);
        setCourse(foundCourse || null);
    };

    if (!course) {
        return <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>Loading or Course not found...</div>;
    }

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link to="/courses" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', marginBottom: '1rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Back to Courses
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: '0 0 0.5rem 0' }}>{course.name}</h1>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '600px' }}>
                            {course.description || 'No description available.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Integrated Sections Module */}
            <div style={{ marginTop: '2rem' }}>
                <SectionsModule courseId={id} hideHeader={true} />
            </div>
        </div>
    );
};
