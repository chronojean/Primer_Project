import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useBlocker } from 'react-router-dom';
import { useConfirmation } from '../../shared/hooks/useConfirmation';
import { StorageService } from '../../shared/utils/storage';
import { Section, Course } from '../../shared/utils/types';
import { Button } from '../../shared/components/Button';
import styles from './Schedule.module.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CLASS_MINUTES = 90;
const TIME_SLOTS = [
    '08:00', '09:45', '11:30', '13:15', '14:00'
];
const BLOCKED_TIMES = new Set(['13:15']);

export const Schedule = () => {
    const [sections, setSections] = useState<Section[]>([]);
    const [originalSections, setOriginalSections] = useState<Section[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [dragContext, setDragContext] = useState<{ sectionId: string, sourceDay: string, sourceTime: string } | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);
    const location = useLocation();
    const [colorSeed, setColorSeed] = useState<number>(() => Date.now());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { showConfirmation } = useConfirmation();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setColorSeed(Date.now());
    }, [location.key]);

    const cloneSections = (items: Section[]) => items.map(section => ({
        ...section,
        days: [...section.days],
        scheduleBlocks: section.scheduleBlocks ? section.scheduleBlocks.map(b => ({ ...b })) : undefined
    }));

    const loadData = () => {
        const storedSections = StorageService.getSections();
        const today = new Date().toISOString().split('T')[0];
        const activeSections = storedSections.filter(section => {
            if (!section.endDate) return true;
            return section.endDate >= today;
        });
        setOriginalSections(cloneSections(activeSections));
        setSections(cloneSections(activeSections));
        setCourses(StorageService.getCourses());
    };

    const getCourseName = (courseId: string) => {
        return courses.find(c => c.id === courseId)?.name || 'Unknown Course';
    };

    const getSubjectKey = (section: Section) => {
        const courseName = getCourseName(section.courseId);
        const token = (courseName.match(/[A-Za-z]+/)?.[0] || courseName || section.id).toLowerCase();
        return token;
    };

    const hashToIndex = (value: string, mod: number) => {
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
            hash = (hash * 31 + value.charCodeAt(i)) % mod;
        }
        return hash;
    };

    const buildSectionToneMap = (_seed: number) => {
        const map = new Map<string, number>();
        const sorted = [...sections].sort((a, b) => {
            const aKey = getSubjectKey(a);
            const bKey = getSubjectKey(b);
            if (aKey !== bKey) return aKey.localeCompare(bKey);
            return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
        });

        sorted.forEach((section, idx) => {
            if (section.color) {
                map.set(section.id, hashToIndex(section.color, 12));
                return;
            }
            map.set(section.id, idx % 12);
        });

        return map;
    };

    const sectionToneMap = useMemo(() => buildSectionToneMap(colorSeed), [sections, colorSeed]);
    const toneClasses = [
        styles.sectionTone0,
        styles.sectionTone1,
        styles.sectionTone2,
        styles.sectionTone3,
        styles.sectionTone4,
        styles.sectionTone5,
        styles.sectionTone6,
        styles.sectionTone7,
        styles.sectionTone8,
        styles.sectionTone9,
        styles.sectionTone10,
        styles.sectionTone11
    ];
    const getSectionToneClass = (section: Section) => toneClasses[sectionToneMap.get(section.id) ?? 0];

    const slotKey = (day: string, time: string) => `${day}-${time}`;

    const getTimeSlots = () => {
        const allTimes = new Set(TIME_SLOTS);
        sections.forEach(s => {
            if (s.scheduleBlocks && s.scheduleBlocks.length > 0) {
                s.scheduleBlocks.forEach(b => allTimes.add(b.startTime));
            } else if (s.startTime) {
                allTimes.add(s.startTime);
            }
        });
        return Array.from(allTimes).sort();
    };

    const sectionBySlot = new Map<string, Section>();
    const blockBySlot = new Map<string, { section: Section, day: string, startTime: string }>();
    sections.forEach(section => {
        const blocks = section.scheduleBlocks && section.scheduleBlocks.length > 0
            ? section.scheduleBlocks
            : section.days.map(day => ({ day, startTime: section.startTime }));
        blocks.forEach(block => {
            const key = slotKey(block.day, block.startTime);
            sectionBySlot.set(key, section);
            blockBySlot.set(key, { section, day: block.day, startTime: block.startTime });
        });
    });

    const getSectionAt = (day: string, time: string) => sectionBySlot.get(slotKey(day, time));

    const getSectionBlocks = (section: Section) => {
        return section.scheduleBlocks && section.scheduleBlocks.length > 0
            ? section.scheduleBlocks
            : section.days.map(day => ({ day, startTime: section.startTime }));
    };

    const normalizeBlocks = (blocks: { day: string, startTime: string }[]) => {
        const dayIndex = new Map(DAYS.map((d, i) => [d, i]));
        const unique = new Map<string, { day: string, startTime: string }>();
        blocks.forEach(b => {
            unique.set(`${b.day}-${b.startTime}`, b);
        });
        return Array.from(unique.values()).sort((a, b) => {
            const dDiff = (dayIndex.get(a.day) ?? 999) - (dayIndex.get(b.day) ?? 999);
            if (dDiff !== 0) return dDiff;
            return a.startTime.localeCompare(b.startTime);
        });
    };

    const normalizeSectionForCompare = (section: Section) => ({
        id: section.id,
        courseId: section.courseId,
        professorId: section.professorId,
        name: section.name,
        days: [...section.days],
        startTime: section.startTime,
        endTime: section.endTime,
        roomId: section.roomId,
        color: section.color ?? null,
        scheduleBlocks: section.scheduleBlocks && section.scheduleBlocks.length > 0
            ? normalizeBlocks(section.scheduleBlocks)
            : []
    });

    const areSectionsEqual = (a: Section[], b: Section[]) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort((x, y) => x.id.localeCompare(y.id));
        const sortedB = [...b].sort((x, y) => x.id.localeCompare(y.id));
        for (let i = 0; i < sortedA.length; i += 1) {
            if (JSON.stringify(normalizeSectionForCompare(sortedA[i])) !== JSON.stringify(normalizeSectionForCompare(sortedB[i]))) {
                return false;
            }
        }
        return true;
    };

    useEffect(() => {
        setHasUnsavedChanges(!areSectionsEqual(sections, originalSections));
    }, [sections, originalSections]);

    // Navigation Blocker (React Router)
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        const handleBlock = async () => {
            if (blocker.state === 'blocked') {
                const confirmed = await showConfirmation({
                    title: 'Leave Schedule?',
                    message: 'You have unsaved schedule changes. Are you sure you want to leave?',
                    confirmLabel: 'Leave anyway',
                    cancelLabel: 'Stay here'
                });

                if (confirmed) {
                    setHasUnsavedChanges(false);
                    blocker.proceed();
                } else {
                    blocker.reset();
                }
            }
        };
        handleBlock();
    }, [blocker, hasUnsavedChanges, showConfirmation]);

    // Unsaved changes browser listener (Refresh/Close)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const getDaysFromBlocks = (blocks: { day: string, startTime: string }[]) => {
        const dayIndex = new Map(DAYS.map((d, i) => [d, i]));
        const uniqueDays = Array.from(new Set(blocks.map(b => b.day)));
        return uniqueDays.sort((a, b) => (dayIndex.get(a) ?? 999) - (dayIndex.get(b) ?? 999));
    };

    const handleDragStart = (e: React.DragEvent, sectionId: string, sourceDay: string, sourceTime: string) => {
        e.dataTransfer.setData('sectionId', sectionId);
        e.dataTransfer.setData('sourceDay', sourceDay);
        e.dataTransfer.setData('sourceTime', sourceTime);
        e.dataTransfer.setData('text/plain', JSON.stringify({ sectionId, sourceDay, sourceTime }));
        e.dataTransfer.effectAllowed = 'move';
        setDragContext({ sectionId, sourceDay, sourceTime });

        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = '1';
        setDragContext(null);
        setDragOverKey(null);
    };

    const handleDragOver = (e: React.DragEvent, targetDay: string, targetTime: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dragContext) return;
        if (BLOCKED_TIMES.has(targetTime)) {
            setDragOverKey(null);
            return;
        }
        const targetKey = slotKey(targetDay, targetTime);
        const targetSection = getSectionAt(targetDay, targetTime);
        const draggedSection = sections.find(s => s.id === dragContext.sectionId);
        const sourceKey = draggedSection ? slotKey(dragContext.sourceDay, dragContext.sourceTime) : null;
        if (draggedSection) {
            const draggedBlocks = getSectionBlocks(draggedSection);
            if (draggedBlocks.some(b => b.day === targetDay && b.startTime === targetTime)) {
                setDragOverKey(null);
                return;
            }
        }
        if (!targetSection && targetKey !== sourceKey) {
            setDragOverKey(targetKey);
            return;
        }
        if (targetSection && draggedSection && targetSection.id !== draggedSection.id) {
            const targetBlocks = getSectionBlocks(targetSection);
            const canSwap = !targetBlocks.some(b => b.day === dragContext.sourceDay && b.startTime === dragContext.sourceTime);
            setDragOverKey(canSwap ? targetKey : null);
            return;
        }
        setDragOverKey(null);
    };

    const handleDragLeave = () => {
        setDragOverKey(null);
    };

    const handleDrop = (e: React.DragEvent, targetDay: string, targetTime: string) => {
        e.preventDefault();
        setDragOverKey(null);
        if (BLOCKED_TIMES.has(targetTime)) {
            setError('Lunch time: 13:15 is blocked.');
            setTimeout(() => setError(null), 3000);
            return;
        }
        let sectionId = e.dataTransfer.getData('sectionId');
        let sourceDay = e.dataTransfer.getData('sourceDay');
        let sourceTime = e.dataTransfer.getData('sourceTime');
        if (!sectionId || !sourceDay || !sourceTime) {
            const fallback = e.dataTransfer.getData('text/plain');
            if (fallback) {
                try {
                    const parsed = JSON.parse(fallback);
                    sectionId = parsed.sectionId;
                    sourceDay = parsed.sourceDay;
                    sourceTime = parsed.sourceTime;
                } catch {
                    // no-op
                }
            }
        }
        if ((!sectionId || !sourceDay || !sourceTime) && dragContext) {
            sectionId = dragContext.sectionId;
            sourceDay = dragContext.sourceDay;
            sourceTime = dragContext.sourceTime;
        }
        if (!sectionId || !sourceDay || !sourceTime) return;

        const draggedSection = sections.find(s => s.id === sectionId);
        if (!draggedSection) return;
        const draggedBlocks = getSectionBlocks(draggedSection);
        const sourceBlockIndex = draggedBlocks.findIndex(b => b.day === sourceDay && b.startTime === sourceTime);
        if (sourceBlockIndex === -1) return;

        const existingSection = getSectionAt(targetDay, targetTime);

        try {
            if (draggedBlocks.some(b => b.day === targetDay && b.startTime === targetTime)) {
                return;
            }

            if (existingSection) {
                if (existingSection.id === draggedSection.id) {
                    if (sourceDay === targetDay && sourceTime === targetTime) return;
                    return;
                }

                const existingBlocks = getSectionBlocks(existingSection);
                if (existingBlocks.some(b => b.day === sourceDay && b.startTime === sourceTime)) {
                    throw new Error(`Section "${existingSection.name}" already has a block on ${sourceDay} at ${sourceTime}`);
                }

                const newBlocksForExisting = existingBlocks.map(b =>
                    b.day === targetDay && b.startTime === targetTime
                        ? { day: sourceDay, startTime: sourceTime }
                        : b
                );
                const newBlocksForDragged = draggedBlocks.map((b, idx) =>
                    idx === sourceBlockIndex
                        ? { day: targetDay, startTime: targetTime }
                        : b
                );

                const normalizedExisting = normalizeBlocks(newBlocksForExisting);
                const normalizedDragged = normalizeBlocks(newBlocksForDragged);

                const updatedExisting = {
                    ...existingSection,
                    scheduleBlocks: normalizedExisting,
                    days: getDaysFromBlocks(normalizedExisting)
                };

                const updatedDragged = {
                    ...draggedSection,
                    scheduleBlocks: normalizedDragged,
                    days: getDaysFromBlocks(normalizedDragged)
                };

                setSections(prev =>
                    prev.map(s => {
                        if (s.id === updatedExisting.id) return updatedExisting;
                        if (s.id === updatedDragged.id) return updatedDragged;
                        return s;
                    })
                );
                setHasUnsavedChanges(true);
            } else {
                const newBlocks = draggedBlocks.map((b, idx) =>
                    idx === sourceBlockIndex
                        ? { day: targetDay, startTime: targetTime }
                        : b
                );
                const normalized = normalizeBlocks(newBlocks);
                const updatedSection = {
                    ...draggedSection,
                    scheduleBlocks: normalized,
                    days: getDaysFromBlocks(normalized)
                };
                setSections(prev => prev.map(s => (s.id === updatedSection.id ? updatedSection : s)));
                setHasUnsavedChanges(true);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const calculateEndTime = (startTime: string) => {
        const [h, m] = startTime.split(':').map(Number);
        let totalMinutes = h * 60 + m + CLASS_MINUTES;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    const timeSlots = getTimeSlots();

    const handleReset = () => {
        setSections(cloneSections(originalSections));
        setError(null);
        setDragOverKey(null);
        setDragContext(null);
    };

    const handleSave = async () => {
        const confirmed = await showConfirmation({
            title: 'Save Schedule Changes?',
            message: 'This will update the schedule for all sections. Do you want to continue?',
            confirmLabel: 'Save changes',
            cancelLabel: 'Cancel'
        });
        if (!confirmed) return;
        const originalMap = new Map(originalSections.map(s => [s.id, s]));
        const changed = sections.filter(s => {
            const original = originalMap.get(s.id);
            if (!original) return true;
            return JSON.stringify(normalizeSectionForCompare(s)) !== JSON.stringify(normalizeSectionForCompare(original));
        });
        if (changed.length === 0) return;
        const changedIds = new Set(changed.map(s => s.id));
        try {
            changed.forEach(section => {
                StorageService.updateSection(section, { ignoreIds: [...changedIds].filter(id => id !== section.id) });
            });
            setOriginalSections(cloneSections(sections));
            setHasUnsavedChanges(false);
            setError(null);
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    return (
        <div className={`module ${styles.scheduleModule}`}>
            <div className={`module-header ${styles.header}`}>
                <div>
                    <h1 className={styles.headerTitle}>System Schedule</h1>
                    <p className={styles.headerSubtitle}>Drag and drop sections to reorganize the academy routine.</p>
                </div>

                <div className={styles.headerActions}>
                    <div className={styles.headerButtons}>
                        {hasUnsavedChanges && (
                            <div className={styles.unsavedNotice}>
                                Unsaved changes
                            </div>
                        )}
                        <Button variant="secondary" onClick={handleReset} disabled={!hasUnsavedChanges}>
                            Reset
                        </Button>
                        <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
                            Save changes
                        </Button>
                    </div>
                    {error && (
                        <div
                            role="alert"
                            aria-live="polite"
                            className={styles.errorAlert}
                        >
                            {error}
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`schedule-board ${styles.board}`}
            >
                {/* Header Days */}
                <div className={styles.boardHeader}>
                    <div className={styles.boardCorner}>
                        <Button size="sm" variant="secondary" onClick={() => window.print()}>
                            Print
                        </Button>
                    </div>
                    {DAYS.map(day => (
                        <div key={day} className={styles.dayHeader}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Grid Body */}
                {timeSlots.map((time, timeIdx) => (
                    <div
                        key={time}
                        className={[
                            styles.timeRow,
                            timeIdx === timeSlots.length - 1 ? styles.timeRowLast : ''
                        ].filter(Boolean).join(' ')}
                    >
                        {/* Time Column */}
                        <div className={styles.timeCell}>
                            <div className={styles.timeLabel}>{time}</div>
                            <div className={styles.timeSubLabel}>
                                {calculateEndTime(time)}
                            </div>
                            {BLOCKED_TIMES.has(time) && (
                                <div className={styles.timeBlockedLabel}>
                                    LUNCH
                                </div>
                            )}
                        </div>

                        {/* Day Slots */}
                        {DAYS.map(day => {
                            const section = getSectionAt(day, time);
                            const isEmptySlot = !section;
                            const isBlocked = BLOCKED_TIMES.has(time);
                            const isDragHighlight = dragOverKey === slotKey(day, time);

                            return (
                                <div
                                    key={`${day}-${time}`}
                                    className={[
                                        styles.slot,
                                        day === 'Sat' ? styles.slotLast : '',
                                        isDragHighlight ? styles.slotDragHighlight : ''
                                    ].filter(Boolean).join(' ')}
                                    onDragOver={(e) => handleDragOver(e, day, time)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, day, time)}
                                >
                                    <div
                                        className={[
                                            styles.slotInner,
                                            isBlocked ? styles.slotInnerBlocked : ''
                                        ].filter(Boolean).join(' ')}
                                    >
                                        {section && !isBlocked ? (
                                            (() => {
                                                const toneClass = getSectionToneClass(section);
                                                return (
                                                <div
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, section.id, day, time)}
                                                    onDragEnd={handleDragEnd}
                                                    className={[
                                                        styles.sectionCard,
                                                        toneClass
                                                    ].join(' ')}
                                                    aria-label={`${section.name} ${time}-${calculateEndTime(time)} on ${day}`}
                                                >
                                                    <h3 className={styles.sectionCardTitle}>
                                                        {getCourseName(section.courseId)}
                                                    </h3>
                                                    <h4 className={styles.sectionCardSubtitle}>
                                                        {section.name}
                                                    </h4>
                                                    <div className={styles.sectionCardMeta}>
                                                        Room {section.roomId || 'N/A'}
                                                    </div>
                                                </div>
                                                );
                                            })()
                                        ) : (
                                            <div className={styles.emptySlot}>
                                                <PlusIcon size={24} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

const PlusIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);
