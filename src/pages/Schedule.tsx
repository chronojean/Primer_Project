import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { Section, Course } from '../types';
import { MapPin } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = [
    '08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00'
];

export const Schedule = () => {
    const [sections, setSections] = useState<Section[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setSections(StorageService.getSections());
        setCourses(StorageService.getCourses());
    };

    const getCourseName = (courseId: string) => {
        return courses.find(c => c.id === courseId)?.name || 'Unknown Course';
    };

    const handleDragStart = (e: React.DragEvent, sectionId: string, sourceDay: string) => {
        e.dataTransfer.setData('sectionId', sectionId);
        e.dataTransfer.setData('sourceDay', sourceDay);
        e.dataTransfer.effectAllowed = 'move';

        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDay: string, targetTime: string) => {
        e.preventDefault();
        const sectionId = e.dataTransfer.getData('sectionId');
        const sourceDay = e.dataTransfer.getData('sourceDay');
        if (!sectionId || !sourceDay) return;

        const draggedSection = sections.find(s => s.id === sectionId);
        if (!draggedSection) return;

        // Check if there's a section already in the target slot
        const existingSection = sections.find(s =>
            s.days.includes(targetDay) && s.startTime === targetTime
        );

        try {
            // RULE: Same section can't be placed the same day
            // If the section already has a block on targetDay (other than the one we are dragging)
            if (draggedSection.days.includes(targetDay) && sourceDay !== targetDay) {
                throw new Error(`Section "${draggedSection.name}" already has a block on ${targetDay}`);
            }

            if (existingSection) {
                // If it's a self-swap (dragging onto its own slot on another day/time)
                if (existingSection.id === draggedSection.id) {
                    // If it's literally the same slot, do nothing
                    if (sourceDay === targetDay && draggedSection.startTime === targetTime) return;

                    // User said: "If a section tries to swap with the same section from other day It should do naught"
                    return;
                }

                // SWAP logic
                // 1. Move existing section's targetDay block to sourceDay
                const newDaysForExisting = existingSection.days.map(d => d === targetDay ? sourceDay : d);
                // 2. Move dragged section's sourceDay block to targetDay
                const newDaysForDragged = draggedSection.days.map(d => d === sourceDay ? targetDay : d);

                const updatedExisting = {
                    ...existingSection,
                    days: newDaysForExisting,
                    startTime: draggedSection.startTime,
                    endTime: draggedSection.endTime
                };

                const updatedDragged = {
                    ...draggedSection,
                    days: newDaysForDragged,
                    startTime: targetTime,
                    endTime: calculateEndTime(targetTime)
                };

                // Update storage (Update the one being replaced first to avoid temporary overlap errors if possible)
                StorageService.updateSection(updatedExisting);
                StorageService.updateSection(updatedDragged);
            } else {
                // MOVE logic
                // Replace sourceDay with targetDay in the array (preserves other days)
                const newDays = draggedSection.days.map(d => d === sourceDay ? targetDay : d);

                const updatedSection = {
                    ...draggedSection,
                    days: newDays,
                    startTime: targetTime,
                    endTime: calculateEndTime(targetTime)
                };
                StorageService.updateSection(updatedSection);
            }
            setError(null);
            loadData();
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const calculateEndTime = (startTime: string) => {
        const [h, m] = startTime.split(':').map(Number);
        let totalMinutes = h * 60 + m + 90;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>System Schedule</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Drag and drop sections to reorganize the academy routine.</p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #fecaca',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both'
                    }}>
                        {error}
                    </div>
                )}
            </div>

            <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '1rem',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden'
            }}>
                {/* Header Days */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '100px repeat(7, 1fr)',
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <div style={{ padding: '1rem', borderRight: '1px solid var(--border-color)' }}></div>
                    {DAYS.map(day => (
                        <div key={day} style={{
                            padding: '1rem',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid Body */}
                {TIME_SLOTS.map((time, timeIdx) => (
                    <div key={time} style={{
                        display: 'grid',
                        gridTemplateColumns: '100px repeat(7, 1fr)',
                        borderBottom: timeIdx === TIME_SLOTS.length - 1 ? 'none' : '1px solid var(--border-color)',
                        minHeight: '120px'
                    }}>
                        {/* Time Column */}
                        <div style={{
                            padding: '1rem',
                            borderRight: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(0,0,0,0.01)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem'
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{time}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>90 MINS</div>
                        </div>

                        {/* Day Slots */}
                        {DAYS.map(day => {
                            const section = sections.find(s => s.days.includes(day) && s.startTime === time);

                            return (
                                <div
                                    key={`${day}-${time}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, day, time)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRight: day === 'Sun' ? 'none' : '1px solid var(--border-color)',
                                        backgroundColor: 'transparent',
                                        transition: 'background-color 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    {section ? (
                                        <div
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, section.id, day)}
                                            onDragEnd={handleDragEnd}
                                            style={{
                                                height: '100%',
                                                backgroundColor: 'var(--bg-card)',
                                                borderRadius: '0.75rem',
                                                padding: '0.8rem',
                                                border: '1px solid var(--border-color)',
                                                boxShadow: 'var(--shadow-sm)',
                                                cursor: 'grab',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.4rem',
                                                transition: 'all 0.2s',
                                                borderLeft: '4px solid var(--primary)',
                                                zIndex: 1
                                            }}
                                            onMouseEnter={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.boxShadow = 'var(--shadow-md)';
                                                target.style.transform = 'scale(1.02)';
                                            }}
                                            onMouseLeave={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.boxShadow = 'var(--shadow-sm)';
                                                target.style.transform = 'scale(1)';
                                            }}
                                        >
                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                                                {getCourseName(section.courseId)}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {section.name}
                                            </div>
                                            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                <MapPin size={10} /> Room {section.roomId || 'N/A'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
                                            <PlusIcon size={24} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            <style>
                {`
                    @keyframes shake {
                        10%, 90% { transform: translate3d(-1px, 0, 0); }
                        20%, 80% { transform: translate3d(2px, 0, 0); }
                        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                        40%, 60% { transform: translate3d(4px, 0, 0); }
                    }
                `}
            </style>
        </div>
    );
};

const PlusIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);
