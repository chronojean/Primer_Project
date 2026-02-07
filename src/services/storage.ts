import { Course, Section, Student, Professor, Enrollment, Attendance, Payment } from '../types';

const STORAGE_KEYS = {
    COURSES: 'academy_courses',
    SECTIONS: 'academy_sections',
    STUDENTS: 'academy_students',
    PROFESSORS: 'academy_professors',
    ENROLLMENTS: 'academy_enrollments',
    ATTENDANCE: 'academy_attendance',
    PAYMENTS: 'academy_payments',
};

const initialCourses: Course[] = [
    { id: 'c1', name: 'Mathematics 101', description: 'Basic Algebra and Geometry' },
    { id: 'c2', name: 'Physics 101', description: 'Mechanics and Thermodynamics' },
    { id: 'c3', name: 'History 101', description: 'World History' },
];

const initialProfessors: Professor[] = [
    { id: 'p1', name: 'Dr. Alan Smith', email: 'alan@academy.com', specialization: 'Mathematics' },
    { id: 'p2', name: 'Prof. Marie Curie', email: 'marie@academy.com', specialization: 'Physics' },
];

const initialStudents: Student[] = [
    { id: 's1', name: 'Juan Perez', email: 'juan@test.com', phone: '555-0101' },
    { id: 's2', name: 'Maria Garcia', email: 'maria@test.com', phone: '555-0102' },
];

export const StorageService = {
    // Generic helper to get data
    getData: <T>(key: string): T[] => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    // Generic helper to save data
    saveData: <T>(key: string, data: T[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    },

    initialize: () => {
        if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
            StorageService.saveData(STORAGE_KEYS.COURSES, initialCourses);
            StorageService.saveData(STORAGE_KEYS.PROFESSORS, initialProfessors);
            StorageService.saveData(STORAGE_KEYS.STUDENTS, initialStudents);
            // Initialize others as empty
            [STORAGE_KEYS.SECTIONS, STORAGE_KEYS.ENROLLMENTS, STORAGE_KEYS.ATTENDANCE, STORAGE_KEYS.PAYMENTS].forEach(key => {
                if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([]));
            });
        }
    },

    // Courses
    getCourses: () => StorageService.getData<Course>(STORAGE_KEYS.COURSES),
    addCourse: (course: Course) => {
        const courses = StorageService.getCourses();
        courses.push(course);
        StorageService.saveData(STORAGE_KEYS.COURSES, courses);
    },
    updateCourse: (course: Course) => {
        const courses = StorageService.getCourses();
        const index = courses.findIndex(c => c.id === course.id);
        if (index !== -1) {
            courses[index] = course;
            StorageService.saveData(STORAGE_KEYS.COURSES, courses);
        }
    },
    deleteCourse: (id: string) => {
        let courses = StorageService.getCourses();
        courses = courses.filter(c => c.id !== id);
        StorageService.saveData(STORAGE_KEYS.COURSES, courses);
    },

    // Sections
    getSections: () => StorageService.getData<Section>(STORAGE_KEYS.SECTIONS),
    addSection: (section: Section) => {
        const sections = StorageService.getSections();
        // Validate overlap
        const overlap = sections.find(s => {
            // 1. Check if ANY day overlaps
            const dayOverlap = s.days.some(day => section.days.includes(day));
            if (!dayOverlap) return false;

            // 2. Check time overlap
            const toMinutes = (time: string) => {
                const [h, m] = time.split(':').map(Number);
                return h * 60 + m;
            };

            const sStart = toMinutes(s.startTime);
            const sEnd = toMinutes(s.endTime);
            const newStart = toMinutes(section.startTime);
            const newEnd = toMinutes(section.endTime);

            return (sStart < newEnd) && (sEnd > newStart);
        });

        if (overlap) {
            throw new Error(`Schedule conflict: Overlaps with section "${overlap.name}" (${overlap.days.join(', ')} ${overlap.startTime}-${overlap.endTime})`);
        }
        sections.push(section);
        StorageService.saveData(STORAGE_KEYS.SECTIONS, sections);
    },
    updateSection: (section: Section) => {
        const sections = StorageService.getSections();
        const index = sections.findIndex(s => s.id === section.id);
        if (index === -1) throw new Error('Section not found');

        // Validate overlap (excluding self)
        const otherSections = sections.filter(s => s.id !== section.id);
        const overlap = otherSections.find(s => {
            const dayOverlap = s.days.some(day => section.days.includes(day));
            if (!dayOverlap) return false;

            const toMinutes = (time: string) => {
                const [h, m] = time.split(':').map(Number);
                return h * 60 + m;
            };

            const sStart = toMinutes(s.startTime);
            const sEnd = toMinutes(s.endTime);
            const newStart = toMinutes(section.startTime);
            const newEnd = toMinutes(section.endTime);

            return (sStart < newEnd) && (sEnd > newStart);
        });

        if (overlap) {
            throw new Error(`Schedule conflict: Overlaps with section "${overlap.name}" (${overlap.days.join(', ')} ${overlap.startTime}-${overlap.endTime})`);
        }

        sections[index] = section;
        StorageService.saveData(STORAGE_KEYS.SECTIONS, sections);
    },
    deleteSection: (id: string) => {
        let sections = StorageService.getSections();
        sections = sections.filter(s => s.id !== id);
        StorageService.saveData(STORAGE_KEYS.SECTIONS, sections);
    },

    // Students
    getStudents: () => StorageService.getData<Student>(STORAGE_KEYS.STUDENTS),
    addStudent: (student: Student) => {
        const students = StorageService.getStudents();
        students.push(student);
        StorageService.saveData(STORAGE_KEYS.STUDENTS, students);
    },
    updateStudent: (student: Student) => {
        const students = StorageService.getStudents();
        const index = students.findIndex(s => s.id === student.id);
        if (index !== -1) {
            students[index] = student;
            StorageService.saveData(STORAGE_KEYS.STUDENTS, students);
        }
    },
    deleteStudent: (id: string) => {
        let students = StorageService.getStudents();
        students = students.filter(s => s.id !== id);
        StorageService.saveData(STORAGE_KEYS.STUDENTS, students);
    },

    // Professors
    getProfessors: () => StorageService.getData<Professor>(STORAGE_KEYS.PROFESSORS),
    addProfessor: (professor: Professor) => {
        const professors = StorageService.getProfessors();
        professors.push(professor);
        StorageService.saveData(STORAGE_KEYS.PROFESSORS, professors);
    },
    deleteProfessor: (id: string) => {
        let professors = StorageService.getProfessors();
        professors = professors.filter(p => p.id !== id);
        StorageService.saveData(STORAGE_KEYS.PROFESSORS, professors);
    },

    // Enrollments
    getEnrollments: () => StorageService.getData<Enrollment>(STORAGE_KEYS.ENROLLMENTS),
    enrollStudent: (enrollment: Enrollment) => {
        const enrollments = StorageService.getEnrollments();
        // Validate: Student can be in only ONE section per course
        const existing = enrollments.find(e =>
            e.studentId === enrollment.studentId && e.courseId === enrollment.courseId
        );
        if (existing) {
            throw new Error('Student is already enrolled in a section for this course.');
        }
        enrollments.push(enrollment);
        StorageService.saveData(STORAGE_KEYS.ENROLLMENTS, enrollments);
    },
    unenrollStudent: (sectionId: string, studentId: string) => {
        let enrollments = StorageService.getEnrollments();
        enrollments = enrollments.filter(e => !(e.sectionId === sectionId && e.studentId === studentId));
        StorageService.saveData(STORAGE_KEYS.ENROLLMENTS, enrollments);
    },
    getStudentsInSection: (sectionId: string) => {
        const enrollments = StorageService.getEnrollments();
        const students = StorageService.getStudents();
        const sectionEnrollments = enrollments.filter(e => e.sectionId === sectionId);
        return sectionEnrollments.map(e => students.find(s => s.id === e.studentId)).filter((s): s is Student => !!s);
    },

    // Attendance
    getAttendance: () => StorageService.getData<Attendance>(STORAGE_KEYS.ATTENDANCE),
    getAttendanceForSection: (sectionId: string) => {
        return StorageService.getAttendance().filter(a => a.sectionId === sectionId);
    },
    saveAttendance: (attendance: Attendance) => {
        const allAttendance = StorageService.getAttendance();
        const index = allAttendance.findIndex(a => a.id === attendance.id);
        if (index >= 0) {
            allAttendance[index] = attendance;
        } else {
            allAttendance.push(attendance);
        }
        StorageService.saveData(STORAGE_KEYS.ATTENDANCE, allAttendance);
    },

    // Payments
    getPayments: () => StorageService.getData<Payment>(STORAGE_KEYS.PAYMENTS),
    getPaymentsForStudent: (studentId: string) => {
        return StorageService.getPayments().filter(p => p.studentId === studentId);
    },
    addPayment: (payment: Payment) => {
        const payments = StorageService.getPayments();
        payments.push(payment);
        StorageService.saveData(STORAGE_KEYS.PAYMENTS, payments);
    }
};
