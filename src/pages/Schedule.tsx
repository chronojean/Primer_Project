import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useBlocker } from 'react-router-dom';
import { useConfirmation } from '../context/ConfirmationContext';
import { StorageService } from '../services/storage';
import { Section, Course } from '../types';
import { Button } from '../components/ui/Button';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CLASS_MINUTES = 90;
const TIME_SLOTS = [
    '08:00', '09:45', '11:30', '13:15'
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
        setOriginalSections(cloneSections(storedSections));
        setSections(cloneSections(storedSections));
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

    const hslToHex = (h: number, s: number, l: number) => {
        const sat = s / 100;
        const light = l / 100;
        const c = (1 - Math.abs(2 * light - 1)) * sat;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = light - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const buildSectionColorMap = (_seed: number) => {
        const map = new Map<string, string>();
        const sorted = [...sections].sort((a, b) => {
            const aKey = getSubjectKey(a);
            const bKey = getSubjectKey(b);
            if (aKey !== bKey) return aKey.localeCompare(bKey);
            return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
        });

        const GOLDEN_ANGLE = 137.508;
        const SATURATION = 85;
        const L_BASE = 25;
        const L_STEP = 18;
        const L_LEVELS = 4;

        sorted.forEach((section, idx) => {
            if (section.color) {
                map.set(section.id, section.color);
                return;
            }
            const hue = (idx * GOLDEN_ANGLE) % 360;
            const lightness = L_BASE + (idx % L_LEVELS) * L_STEP;
            map.set(section.id, hslToHex(hue, SATURATION, lightness));
        });

        return map;
    };

    const sectionColorMap = useMemo(() => buildSectionColorMap(colorSeed), [sections, colorSeed]);
    const getSectionColor = (section: Section) => sectionColorMap.get(section.id) || '#1F3A8A';

    const parseColorToRgb = (color: string) => {
        const hex = color.trim();
        if (hex.startsWith('#')) {
            const clean = hex.slice(1);
            if (clean.length === 3) {
                const r = parseInt(clean[0] + clean[0], 16);
                const g = parseInt(clean[1] + clean[1], 16);
                const b = parseInt(clean[2] + clean[2], 16);
                return { r, g, b };
            }
            if (clean.length === 6) {
                const r = parseInt(clean.slice(0, 2), 16);
                const g = parseInt(clean.slice(2, 4), 16);
                const b = parseInt(clean.slice(4, 6), 16);
                return { r, g, b };
            }
            return null;
        }
        const rgbMatch = hex.match(/^rgba?\(([^)]+)\)$/i);
        if (rgbMatch) {
            const parts = rgbMatch[1].split(',').map(v => Number(v.trim()));
            if (parts.length >= 3 && parts.every(n => Number.isFinite(n))) {
                const [r, g, b] = parts;
                return { r, g, b };
            }
        }
        return null;
    };

    const relativeLuminance = (r: number, g: number, b: number) => {
        const toLinear = (v: number) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        const R = toLinear(r);
        const G = toLinear(g);
        const B = toLinear(b);
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    };

    const rgbToHsl = (r: number, g: number, b: number) => {
        const rn = r / 255;
        const gn = g / 255;
        const bn = b / 255;
        const max = Math.max(rn, gn, bn);
        const min = Math.min(rn, gn, bn);
        const delta = max - min;
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (delta !== 0) {
            s = delta / (1 - Math.abs(2 * l - 1));
            switch (max) {
                case rn:
                    h = ((gn - bn) / delta) % 6;
                    break;
                case gn:
                    h = (bn - rn) / delta + 2;
                    break;
                default:
                    h = (rn - gn) / delta + 4;
                    break;
            }
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }

        return { h, s, l };
    };

    const contrastRatio = (l1: number, l2: number) => {
        const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
        return (lighter + 0.05) / (darker + 0.05);
    };

    const getContrastText = (color: string) => {
        const rgb = parseColorToRgb(color);
        if (!rgb) return '#0f172a';
        const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
        const isGreenish = hsl.h >= 60 && hsl.h <= 170;
        if (isGreenish && hsl.s >= 0.65) {
            return '#ffffff';
        }
        const lum = relativeLuminance(rgb.r, rgb.g, rgb.b);
        const whiteLum = relativeLuminance(255, 255, 255);
        const darkLum = relativeLuminance(15, 23, 42);
        const whiteContrast = contrastRatio(whiteLum, lum);
        const darkContrast = contrastRatio(darkLum, lum);
        return whiteContrast >= darkContrast ? '#ffffff' : '#0f172a';
    };

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
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>System Schedule</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Drag and drop sections to reorganize the academy routine.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {hasUnsavedChanges && (
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
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
                            style={{
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
                    gridTemplateColumns: '100px repeat(7, minmax(0, 1fr))',
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
                {timeSlots.map((time, timeIdx) => (
                    <div key={time} style={{
                        display: 'grid',
                        gridTemplateColumns: '100px repeat(7, minmax(0, 1fr))',
                        borderBottom: timeIdx === timeSlots.length - 1 ? 'none' : '1px solid var(--border-color)',
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
                            gap: '0.3rem'
                        }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{time}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                {calculateEndTime(time)}
                            </div>
                            {BLOCKED_TIMES.has(time) && (
                                <div style={{ fontSize: '0.65rem', color: '#b91c1c', fontWeight: 800, letterSpacing: '0.08em' }}>
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
                                    style={{
                                        padding: '0.5rem',
                                        borderRight: day === 'Sun' ? 'none' : '1px solid var(--border-color)',
                                        backgroundColor: isDragHighlight ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                                        transition: 'background-color 0.2s',
                                        position: 'relative',
                                        minWidth: 0,
                                        boxShadow: isDragHighlight ? 'inset 0 0 0 2px rgba(59, 130, 246, 0.25)' : 'none'
                                    }}
                                    onDragOver={(e) => handleDragOver(e, day, time)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, day, time)}
                                    onMouseEnter={(e) => {
                                        if (!isDragHighlight) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isDragHighlight) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <div
                                        style={{
                                            height: '100%',
                                            borderRadius: '0.85rem',
                                            padding: '0.35rem',
                                            boxSizing: 'border-box',
                                            display: 'flex',
                                            alignItems: 'stretch',
                                            justifyContent: 'stretch',
                                            overflow: 'hidden',
                                            backgroundColor: isBlocked ? 'rgba(185, 28, 28, 0.08)' : 'transparent',
                                            transition: 'background-color 0.15s'
                                        }}
                                    >
                                        {section && !isBlocked ? (
                                            (() => {
                                                const sectionColor = getSectionColor(section);
                                                const textColor = getContrastText(sectionColor);
                                                return (
                                                <div
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, section.id, day, time)}
                                                    onDragEnd={handleDragEnd}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        backgroundColor: sectionColor,
                                                        borderRadius: '0.7rem',
                                                        padding: '0.8rem',
                                                        border: `1px solid ${sectionColor}`,
                                                        boxShadow: 'var(--shadow-sm)',
                                                        cursor: 'grab',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.4rem',
                                                        transition: 'all 0.2s',
                                                        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)`,
                                                        zIndex: 1,
                                                        boxSizing: 'border-box',
                                                        overflow: 'hidden'
                                                    }}
                                                    aria-label={`${section.name} ${time}-${calculateEndTime(time)} on ${day}`}
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
                                                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: textColor, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                                        {getCourseName(section.courseId)}
                                                    </h3>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: textColor, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                                        {time} - {calculateEndTime(time)}
                                                    </div>
                                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: textColor, lineHeight: 1.25, wordBreak: 'break-word' }}>
                                                        {section.name}
                                                    </h4>
                                                    <div style={{ marginTop: 'auto', fontSize: '0.85rem', fontWeight: 700, color: textColor, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                                        Room {section.roomId || 'N/A'}
                                                    </div>
                                                </div>
                                                );
                                            })()
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
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
