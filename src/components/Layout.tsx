import { Link, useLocation, Outlet } from 'react-router-dom';
import { BookOpen, DollarSign, Home, Users, UserCheck, CheckSquare, Calendar } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
    <Link
        to={to}
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
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>Help</button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}>Settings</button>
                    </div>
                </header>
                <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
