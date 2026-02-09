import { useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { BookOpen, DollarSign, Home, Users, UserCheck, CheckSquare, Calendar, Sun, Moon } from 'lucide-react';
import { Button } from './Button';

const NavItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
    <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`nav-item${active ? ' active' : ''}`}
        aria-label={label}
        title={label}
    >
        <Icon size={18} className="nav-item-icon" />
        <span className="nav-item-label">{label}</span>
    </Link>
);

export const Layout = () => {
    const location = useLocation();
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
        // No custom mouse-back handling.
    }, [location.pathname]);

    return (
        <div className="app-shell">
            {/* Sidebar */}
            <aside className="sidebar">
                <h2 className="sidebar-title">
                    <div className="sidebar-title-badge">
                        <BookOpen size={24} />
                    </div>
                    Academy
                </h2>

                <nav className="sidebar-nav">
                    <div className="sidebar-menu-label">Menu</div>
                    <NavItem to="/" icon={Home} label="Dashboard" active={location.pathname === '/'} />
                    <NavItem to="/schedule" icon={Calendar} label="Schedule" active={location.pathname.startsWith('/schedule')} />
                    <NavItem to="/attendance" icon={CheckSquare} label="Attendance" active={location.pathname.startsWith('/attendance')} />
                    <NavItem to="/courses" icon={BookOpen} label="Courses" active={location.pathname.startsWith('/courses')} />
                    <NavItem to="/students" icon={Users} label="Students" active={location.pathname.startsWith('/students')} />
                    <NavItem to="/professors" icon={UserCheck} label="Professors" active={location.pathname.startsWith('/professors')} />
                    <NavItem to="/payments" icon={DollarSign} label="Payments" active={location.pathname.startsWith('/payments')} />
                </nav>

                <div className="sidebar-footer">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => applyTheme(theme === 'light' ? 'dark' : 'light', true)}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
                    >
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" aria-label="Help" title="Help">
                        <BookOpen size={16} />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" aria-label="Settings" title="Settings">
                        <Users size={16} />
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="app-main">
                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
