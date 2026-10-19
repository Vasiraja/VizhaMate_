import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    ArrowLeftRight, BadgeIndianRupee, BookUser, ChevronDown,
    ClipboardList, ContactRound, LayoutDashboard, Menu, Settings, ShieldCheck,
    UsersRound, X,
} from 'lucide-react';
import useAppData from '../hooks/useAppData.js';

const navigation = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/entry', label: 'Add gift', icon: BadgeIndianRupee },
    { to: '/transactions', label: 'Transactions', icon: ClipboardList },
    { to: '/guests', label: 'Guests', icon: ContactRound },
    { to: '/functions', label: 'Functions', icon: BookUser, admin: true },
    { to: '/reviews', label: 'Reviews & audit', icon: ShieldCheck, admin: true },
    { to: '/transfer', label: 'Import / export', icon: ArrowLeftRight },
    { to: '/settings', label: 'Settings & backup', icon: Settings },
];

function AdminOnly({ children }) {
    const { activeUser } = useAppData();
    return activeUser?.role === 'admin' ? children : null;
}

export default function AppLayout() {
    const { activeUser, functions, activeFunction, chooseFunction, chooseUser, users } = useAppData();
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    function switchProfile(event) {
        const id = event.target.value;
        if (id === 'switch') {
            chooseUser('');
            localStorage.removeItem('vizha-user-id');
            navigate('/profile');
        } else chooseUser(id);
    }

    return (
        <div className="app-frame">
            <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
                <div className="brand-lockup">
                    <div className="brand-mark"><BadgeIndianRupee size={21} strokeWidth={1.8} /></div>
                    <div><strong>VizhaMate</strong><span>Gift register</span></div>
                    <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={18} /></button>
                </div>
                <div className="side-section-label">WORKSPACE</div>
                <nav className="primary-nav" aria-label="Main navigation">
                    {navigation.map(({ to, label, icon: Icon, admin }) => (
                        admin ? (
                            <AdminOnly key={to}><NavLink to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}><Icon size={18} /><span>{label}</span></NavLink></AdminOnly>
                        ) : (
                            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMenuOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>
                        )
                    ))}
                </nav>
                <div className="sidebar-footer"><span className="offline-dot" /> Offline storage on this device</div>
            </aside>
            {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

            <main className="main-area">
                <header className="topbar">
                    <button className="icon-button menu-toggle" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
                    <label className="function-switcher">
                        <span>FUNCTION</span>
                        <select value={activeFunction?.function_id || ''} onChange={(event) => chooseFunction(event.target.value)} disabled={!functions.length}>
                            {!functions.length && <option value="">No functions yet</option>}
                            {functions.map((item) => <option key={item.function_id} value={item.function_id}>{item.function_name}</option>)}
                        </select>
                        <ChevronDown size={14} />
                    </label>
                    <div className="profile-control">
                        <span className="profile-initial">{activeUser?.display_name?.[0]?.toUpperCase() || '?'}</span>
                        <div className="profile-name"><strong>{activeUser?.display_name || 'Profile'}</strong><span>{activeUser?.role === 'admin' ? 'Administrator' : 'Recorder'}</span></div>
                        <select aria-label="Switch profile" value={activeUser?.user_id || ''} onChange={switchProfile}>
                            {users.map((user) => <option key={user.user_id} value={user.user_id}>{user.display_name}</option>)}
                            <option value="switch">Switch profile...</option>
                        </select>
                        <UsersRound size={15} className="profile-switch-icon" />
                    </div>
                </header>
                <div className="page-content"><Outlet /></div>
            </main>
        </div>
    );
}