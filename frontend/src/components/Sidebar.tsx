import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { auth } from '../config/firebase';

export const Sidebar: React.FC = () => {
  const { dbUser } = useAuthStore();
  const { activeTab, setActiveTab, unreadAlertsCount, theme, toggleTheme } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const adminLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'teams', label: 'Manage Teams' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'invitations', label: 'Guest Invites' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'profile', label: 'My Profile' },
    { id: 'settings', label: 'Settings' },
  ];

  const userLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'My Tasks' },
    { id: 'teams', label: 'My Teams' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'profile', label: 'My Profile' }
  ];

  const guestLinks = [
    { id: 'alerts', label: 'Alerts' },
    { id: 'profile', label: 'My Profile' }
  ];

  let links = guestLinks;
  if (dbUser?.role === 'admin') {
    links = adminLinks;
  } else if (dbUser?.orgId) {
    links = userLinks;
  }

  return (
    <div className="sidebar glass-panel">
      <h2 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>Sanoft Task</h2>
      
      <div className="sidebar-user">
        <strong>{dbUser?.name}</strong>
        <span className="role-badge">{dbUser?.role}</span>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <button 
            key={link.id} 
            className={`sidebar-link ${activeTab === link.id ? 'active' : ''}`}
            onClick={() => handleTabClick(link.id)}
          >
            <span>{link.label}</span>
            {link.id === 'alerts' && unreadAlertsCount > 0 && (
              <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {unreadAlertsCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <button className="btn-secondary" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button className="btn-secondary" style={{ width: '100%', borderColor: 'var(--error-color)', color: 'var(--error-color)' }} onClick={() => auth.signOut()}>
          Log Out
        </button>
      </div>
    </div>
  );
};
