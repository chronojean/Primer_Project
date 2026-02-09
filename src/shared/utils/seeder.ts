import { StorageService } from './storage';
import { Course, Section, Professor, Student } from './types';

export const countData = () => {
    return {
        courses: StorageService.getCourses().length,
        students: StorageService.getStudents().length,
        sections: StorageService.getSections().length,
        professors: StorageService.getProfessors().length
    };
};

export const clearData = () => {
    localStorage.clear();
};

export const seedDatabase = () => {
    // 1. Professors (3)
    const professors: Professor[] = [
        { id: crypto.randomUUID(), name: 'John Keating', email: 'keating@welton.edu', specialization: 'Literature & English' },
        { id: crypto.randomUUID(), name: 'Katherine Johnson', email: 'katherine@nasa.gov', specialization: 'Mathematics & Computing' },
        { id: crypto.randomUUID(), name: 'Albus Dumbledore', email: 'albus@hogwarts.edu', specialization: 'Magic & SQL' }
    ];

    professors.forEach(p => StorageService.addProfessor(p));

    // 2. Courses (6)
    const courses: Course[] = [
        { id: crypto.randomUUID(), name: 'English A1', description: 'Beginner English' },
        { id: crypto.randomUUID(), name: 'English A2', description: 'Elementary English' },
        { id: crypto.randomUUID(), name: 'English B', description: 'Intermediate English' },
        { id: crypto.randomUUID(), name: 'Programming 101', description: 'Introduction to Logic' },
        { id: crypto.randomUUID(), name: 'Web Design 101', description: 'HTML & CSS Basics' },
        { id: crypto.randomUUID(), name: 'SQL 101', description: 'Database Fundamentals' }
    ];

    courses.forEach(c => StorageService.addCourse(c));

    // 3. Students (60)
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'];

    const students: Student[] = [];
    for (let i = 0; i < 60; i++) {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)];
        const last = lastNames[Math.floor(Math.random() * lastNames.length)];
        const sex = Math.random() > 0.5 ? 'Male' : 'Female';
        const age = Math.floor(Math.random() * 10) + 18; // 18-28
        const year = new Date().getFullYear() - age;
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');

        const student = {
            id: crypto.randomUUID(),
            name: `${first} ${last}`,
            email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`,
            phone: `555-01${String(i).padStart(2, '0')}`,
            birthDate: `${year}-${month}-${day}`,
            sex: sex as 'Male' | 'Female'
        };
        students.push(student);
        StorageService.addStudent(student);
    }

    // 4. Sections (9)
    // Schedule Configuration:
    // - Morning Block (Wed, Thu, Fri): 3 slots of 90min starting at 8:00am with 15min breaks
    //   8:00-9:30, 9:45-11:15, 11:30-13:00
    // - Afternoon Block A (Mon, Wed, Fri): 3 slots of 90min starting at 14:00 with 15min breaks
    //   14:00-15:30, 15:45-17:15, 17:30-19:00
    // - Afternoon Block B (Tue, Thu): 3 slots of 90min starting at 14:00 with 15min breaks
    //   14:00-15:30, 15:45-17:15, 17:30-19:00

    const sectionConfigs = [
        // Morning Block: Wed, Thu, Fri
        { days: ['Wed', 'Thu', 'Fri'], start: '08:00', end: '09:30', nameSuffix: 'Morning' },
        { days: ['Wed', 'Thu', 'Fri'], start: '09:45', end: '11:15', nameSuffix: 'Morning' },
        { days: ['Wed', 'Thu', 'Fri'], start: '11:30', end: '13:00', nameSuffix: 'Morning' },

        // Afternoon Block A: Mon, Wed, Fri
        { days: ['Mon', 'Wed', 'Fri'], start: '14:00', end: '15:30', nameSuffix: 'Afternoon' },
        { days: ['Mon', 'Wed', 'Fri'], start: '15:45', end: '17:15', nameSuffix: 'Afternoon' },
        { days: ['Mon', 'Wed', 'Fri'], start: '17:30', end: '19:00', nameSuffix: 'Afternoon' },

        // Afternoon Block B: Tue, Thu
        { days: ['Tue', 'Thu'], start: '14:00', end: '15:30', nameSuffix: 'Afternoon' },
        { days: ['Tue', 'Thu'], start: '15:45', end: '17:15', nameSuffix: 'Afternoon' },
        { days: ['Tue', 'Thu'], start: '17:30', end: '19:00', nameSuffix: 'Afternoon' }
    ];

    const sections: Section[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Distribute courses to sections (Round Robin)
    sectionConfigs.forEach((config, index) => {
        const course = courses[index % courses.length];
        const teacher = professors[index % professors.length];

        const section: Section = {
            id: crypto.randomUUID(),
            courseId: course.id,
            professorId: teacher.id,
            name: config.nameSuffix,
            days: config.days,
            startTime: config.start,
            endTime: config.end,
            startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
            endDate: new Date(currentYear, currentMonth + 3, 1).toISOString().split('T')[0],
            roomId: 'A-101',
        };
        sections.push(section);
    });
    StorageService.saveData('academy_sections', sections);

    // 5. Enrollments & Attendance
    // RULE: A student can only be enrolled in ONE section per course
    // Track which courses each student is enrolled in
    const studentCourseEnrollments: Map<string, Set<string>> = new Map();
    students.forEach(s => studentCourseEnrollments.set(s.id, new Set()));

    students.forEach((student) => {
        // Enroll each student in 2-3 random sections, but never in the same course twice
        const numEnrollments = Math.floor(Math.random() * 2) + 2; // 2-3 enrollments
        const shuffledSections = [...sections].sort(() => Math.random() - 0.5);

        let enrolled = 0;
        for (const section of shuffledSections) {
            if (enrolled >= numEnrollments) break;

            const enrolledCourses = studentCourseEnrollments.get(student.id)!;

            // Skip if already enrolled in this course
            if (enrolledCourses.has(section.courseId)) continue;

            // Enroll student
            enrolledCourses.add(section.courseId);
            StorageService.enrollStudent({
                id: crypto.randomUUID(),
                studentId: student.id,
                sectionId: section.id,
                courseId: section.courseId,
                enrolledAt: new Date().toISOString()
            });
            enrolled++;

            // Generate Attendance for the past 10 days
            for (let d = 1; d <= 10; d++) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                if (section.days.includes(dayName)) {
                    const dateStr = date.toISOString().split('T')[0];

                    let attendance = StorageService.getAttendance().find(a => a.sectionId === section.id && a.date === dateStr);

                    if (!attendance) {
                        attendance = {
                            id: crypto.randomUUID(),
                            sectionId: section.id,
                            date: dateStr,
                            records: []
                        };
                        StorageService.saveAttendance(attendance);
                    }

                    attendance = StorageService.getAttendance().find(a => a.sectionId === section.id && a.date === dateStr)!;

                    // 85% chance of being present
                    const isPresent = Math.random() > 0.15;

                    if (!attendance.records.find(r => r.studentId === student.id)) {
                        attendance.records.push({ studentId: student.id, present: isPresent });
                        StorageService.saveAttendance(attendance);
                    }
                }
            }
        }
    });
};
