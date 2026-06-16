import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
  resident: [
    { icon: 'dashboard', label: 'Home', to: '/dashboard' },
    { icon: 'calendar_today', label: 'Bookings', to: '/amenities' },
    { icon: 'smart_toy', label: 'Complaints', to: '/complaints' },
    { icon: 'payments', label: 'Payments', to: '/payments' },
    { icon: 'campaign', label: 'Announcements', to: '/announcements' },
    { icon: 'help_outline', label: 'Help Center', to: '/help' },
  ],
  society_admin: [
    { icon: 'dashboard', label: 'Home', to: '/dashboard' },
    { icon: 'analytics', label: 'Analytics', to: '/analytics' },
    { icon: 'calendar_today', label: 'Bookings', to: '/amenities' },
    { icon: 'smart_toy', label: 'Complaints', to: '/complaints' },
    { icon: 'payments', label: 'Payments', to: '/payments' },
    { icon: 'campaign', label: 'Announcements', to: '/announcements' },
    { icon: 'group', label: 'Members', to: '/members' },
    { icon: 'help_outline', label: 'Help Center', to: '/help' },
  ],
  platform_admin: [
    { icon: 'dashboard', label: 'Platform', to: '/dashboard' },
    { icon: 'analytics', label: 'Analytics', to: '/analytics' },
    { icon: 'calendar_today', label: 'Bookings', to: '/amenities' },
    { icon: 'smart_toy', label: 'Complaints', to: '/complaints' },
    { icon: 'payments', label: 'Payments', to: '/payments' },
    { icon: 'campaign', label: 'Announcements', to: '/announcements' },
    { icon: 'group', label: 'Members', to: '/members' },
    { icon: 'help_outline', label: 'Help Center', to: '/help' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'resident';
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.resident;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const portalLabel =
    role === 'platform_admin' ? 'Platform Admin' : role === 'society_admin' ? 'Admin Portal' : 'Resident Portal';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-surface-container-low border-r border-outline-variant p-md gap-xs overflow-y-auto">
        <div className="mb-lg px-xs">
          <h3 className="text-h3 text-primary font-semibold">{user?.tenantName || 'SocietyPro AI'}</h3>
          <p className="text-body-sm text-on-surface-variant">{portalLabel}</p>
        </div>

        <nav className="flex-1 flex flex-col gap-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-body-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-md border-t border-outline-variant space-y-xs">
          <NavLink to="/complaints" className="w-full btn-primary text-center mb-sm block">
            New Request
          </NavLink>
          <NavLink to="/help" className="nav-item w-full">
            <span className="material-symbols-outlined">help_outline</span>
            <span className="text-body-sm">Help Center</span>
          </NavLink>
          <button onClick={handleLogout} className="nav-item w-full">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-body-sm">Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="sticky top-0 z-30 flex justify-between items-center px-lg py-sm bg-surface shadow-sm border-b border-outline-variant/50">
          <div className="flex items-center gap-md">
            <span className="text-h2 text-primary font-bold">SocietyPro AI</span>
            <nav className="hidden md:flex gap-lg ml-xl">
              {navItems.slice(0, 4).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'text-primary border-b-2 border-primary pb-1 text-body-lg'
                      : 'text-on-surface-variant hover:text-secondary transition-colors text-body-lg'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-md">
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="flex items-center gap-sm pl-md border-l border-outline-variant">
              <div className="text-right hidden sm:block">
                <p className="text-body-sm font-semibold text-primary">{user?.displayName || 'User'}</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                  {(user?.role || 'user').replace('_', ' ')}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center border-2 border-secondary-container overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
