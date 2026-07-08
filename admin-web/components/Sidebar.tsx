'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', icon: '📊', label: 'Dashboard' },
  { section: 'Research Data' },
  { href: '/users', icon: '👤', label: 'Users' },
  { href: '/rides', icon: '🛵', label: 'Rides' },
  { href: '/study', icon: '🔬', label: 'Study Participants' },
  { href: '/claims', icon: '💰', label: 'Compensation Claims' },
  { section: 'Support' },
  { href: '/tickets', icon: '🎫', label: 'Support Tickets' },
  { href: '/notifications', icon: '🔔', label: 'Notifications' },
  { section: 'Content' },
  { href: '/events', icon: '📅', label: 'Events' },
];

export default function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛵</div>
        <div>
          <div className="sidebar-logo-text">Devia</div>
          <div className="sidebar-logo-sub">Admin Panel</div>
        </div>
      </div>

      <div className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) => {
          if ('section' in item) {
            return (
              <div key={idx} className="nav-section-label">{item.section}</div>
            );
          }
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href!);

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-link-icon">{item.icon}</span>
              {item.label}
              {item.href === '/notifications' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button
          id="logout-btn"
          className="nav-link w-full"
          style={{ border: '1px solid transparent', background: 'none', width: '100%', cursor: 'pointer' }}
          onClick={handleLogout}
        >
          <span className="nav-link-icon">🚪</span>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
