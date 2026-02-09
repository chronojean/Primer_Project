import { useEffect, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, DollarSign, Home, Users, UserCheck, CheckSquare, Calendar, Sun, Moon } from 'lucide-react';
import { Button } from './ui/Button';
import { useBackButtonHandler } from '../context/BackButtonContext';

const NavItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
    <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            color: active ? 'var(--text-sidebar-active)' : 'var(--text-sidebar)',
            backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            marginBottom: '0.25rem',
            transition: 'all 0.2s',
            fontWeight: 500
        }}
    >
        <Icon size={18} style={{ marginRight: '0.75rem', opacity: active ? 1 : 0.7 }} />
        <span style={{ fontSize: '0.95rem' }}>{label}</span>
    </Link>
);

export const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const backHandler = useBackButtonHandler();
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [hasUserPreference, setHasUserPreference] = useState(false);

    const applyTheme = (nextTheme: 'light' | 'dark', persist: boolean) => {
        setTheme(nextTheme);
        document.documentElement.dataset.theme = nextTheme;
        if (persist) {
            localStorage.setItem('theme', nextTheme);
            setHasUserPreference(true);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') {
            applyTheme(saved, false);
            setHasUserPreference(true);
            return;
        }
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        applyTheme(media.matches ? 'dark' : 'light', false);
        const handleChange = (e: MediaQueryListEvent) => {
            if (!hasUserPreference) {
                applyTheme(e.matches ? 'dark' : 'light', false);
            }
        };
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, [hasUserPreference]);

    useEffect(() => {
        const handleMouseUp = async (e: MouseEvent) => {
            if (e.button !== 3) return;
            const onDashboard = location.pathname === '/';

            if (backHandler) {
                e.preventDefault();
                const handled = await backHandler();
                if (handled) return;
                if (!onDashboard) {
                    navigate('/', { replace: true });
                }
                return;
            }

            if (!onDashboard) {
                e.preventDefault();
                navigate('/', { replace: true });
            }
        };

        window.addEventListener('mouseup', handleMouseUp, { passive: false });
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [backHandler, location.pathname, navigate]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', backgroundColor: 'var(--bg-main)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                backgroundColor: 'var(--bg-sidebar)',
                borderRight: '1px solid var(--bg-sidebar)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
                zIndex: 10
            }}>
                <h2 style={{ color: '#fff', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
                    <div style={{ padding: '0.4rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', display: 'flex' }}>
                        <BookOpen color="#fff" size={24} />
                    </div>
                    Academy
                </h2>

                <nav style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '1rem' }}>Menu</div>
                    <NavItem to="/" icon={Home} label="Dashboard" active={location.pathname === '/'} />
                    <NavItem to="/schedule" icon={Calendar} label="Schedule" active={location.pathname.startsWith('/schedule')} />
                    <NavItem to="/attendance" icon={CheckSquare} label="Attendance" active={location.pathname.startsWith('/attendance')} />
                    <NavItem to="/courses" icon={BookOpen} label="Courses" active={location.pathname.startsWith('/courses')} />
                    <NavItem to="/students" icon={Users} label="Students" active={location.pathname.startsWith('/students')} />
                    <NavItem to="/professors" icon={UserCheck} label="Professors" active={location.pathname.startsWith('/professors')} />
                    <NavItem to="/payments" icon={DollarSign} label="Payments" active={location.pathname.startsWith('/payments')} />
                </nav>

                <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', marginTop: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Logged in as</div>
                    <div style={{ color: '#fff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                        Admin User
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, backgroundColor: 'var(--bg-main)', overflowY: 'auto' }}>
                <header style={{
                    padding: '1rem 2rem',
                    backgroundColor: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>Overview</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => applyTheme(theme === 'light' ? 'dark' : 'light', true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                        >
                            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                            {theme === 'light' ? 'Dark' : 'Light'}
                        </Button>
                        <Button type="button" variant="ghost" size="sm">Help</Button>
                        <Button type="button" variant="ghost" size="sm">Settings</Button>
                    </div>
                </header>
                <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
