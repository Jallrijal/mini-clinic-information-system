import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ListOrdered,
  FileText,
  LogOut,
  Menu,
  X,
  Stethoscope,
  ChevronRight,
  Bell,
} from 'lucide-react';
import './MainLayout.css';

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Data Pasien',
    path: '/patients',
    icon: Users,
  },
  {
    label: 'Pendaftaran',
    path: '/registrations',
    icon: ClipboardList,
  },
  {
    label: 'Antrean',
    path: '/queue',
    icon: ListOrdered,
  },
  {
    label: 'Rekam Medis',
    path: '/medical-records',
    icon: FileText,
  },
];

const roleLabels = {
  ADMIN: 'Administrator',
  DOCTOR: 'Dokter',
  REGISTRATION_OFFICER: 'Petugas Pendaftaran',
};

const roleColors = {
  ADMIN: 'role-admin',
  DOCTOR: 'role-doctor',
  REGISTRATION_OFFICER: 'role-officer',
};

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name = '') =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

  return (
    <div className={`layout-root ${collapsed ? 'layout-collapsed' : ''}`}>
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Stethoscope size={20} />
          </div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-name">MediCare</span>
              <span className="sidebar-logo-sub">Clinic System</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="Menu utama">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
              title={collapsed ? label : undefined}
            >
              <span className="sidebar-link-icon">
                <Icon size={19} />
              </span>
              {!collapsed && (
                <>
                  <span className="sidebar-link-label">{label}</span>
                  <ChevronRight size={14} className="sidebar-link-arrow" />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {getInitials(user?.name)}
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span className={`sidebar-user-role ${roleColors[user?.role] || ''}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="layout-main">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            {/* Mobile hamburger */}
            <button
              className="topbar-btn topbar-hamburger"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Buka menu"
            >
              <Menu size={20} />
            </button>

            {/* Desktop collapse toggle */}
            <button
              className="topbar-btn topbar-collapse"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            >
              {collapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
            </button>
          </div>

          <div className="topbar-right">
            <button className="topbar-btn topbar-notif" aria-label="Notifikasi">
              <Bell size={18} />
              <span className="notif-dot" aria-hidden="true" />
            </button>

            <div className="topbar-user">
              <div className="topbar-user-avatar">{getInitials(user?.name)}</div>
              <div className="topbar-user-info">
                <span className="topbar-user-name">{user?.name || 'User'}</span>
                <span className={`topbar-user-role ${roleColors[user?.role] || ''}`}>
                  {roleLabels[user?.role] || user?.role}
                </span>
              </div>
            </div>

            <button
              id="btn-logout"
              className="topbar-btn topbar-logout"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
