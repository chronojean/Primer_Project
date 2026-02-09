export interface Course {
    id: string;
    name: string;
    description: string;
}

export interface Section {
    id: string;
    courseId: string;
    professorId: string | null;
    name: string; // e.g., "Section A"
    days: string[]; // e.g., ["Mon", "Wed"]
    startTime: string; // "10:00"
    endTime: string; // "12:00"
    scheduleBlocks?: { day: string; startTime: string }[]; // per-day schedule blocks (90 mins each)
    color?: string; // optional hex/rgb color for schedule blocks
    startDate?: string; // "YYYY-MM-DD"
    endDate?: string; // "YYYY-MM-DD"
    schedule?: string; // Deprecated: for backward compatibility
    roomId: string; // to check for overlaps
}

export interface Student {
    id: string;
    name: string;
    email: string;
    phone: string;
    birthDate?: string; // YYYY-MM-DD
    sex?: 'Male' | 'Female' | 'Other';
}

export interface StudentStatusHistory {
    id: string;
    studentId: string;
    isActive: boolean;
    changedAt: string; // ISO timestamp
}

export interface SectionStudentStatusHistory {
    id: string;
    studentId: string;
    sectionId: string;
    isActive: boolean;
    changedAt: string; // ISO timestamp
}

export interface Professor {
    id: string;
    name: string;
    email: string;
    specialization: string;
}

export interface Enrollment {
    id: string;
    studentId: string;
    sectionId: string;
    courseId: string; // Denormalized for easier checking of "one section per course"
    enrolledAt: string;
}

export interface Attendance {
    id: string;
    sectionId: string;
    date: string; // ISO date YYYY-MM-DD
    records: {
        studentId: string;
        present: boolean;
    }[];
}

export interface Payment {
    id: string;
    studentId: string;
    amount: number;
    date: string;
    concept: string; // e.g., "Monthly fee - March"
}
