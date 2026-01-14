import { Agent } from '@atproto/api';
import { UserProfile } from './UserProfile';

interface SidebarProps {
  agent: Agent;
  did: string;
  currentView: string;
  onViewChange: (view: 'timeline' | 'scheduled' | 'profile' | 'search' | 'notifications') => void;
  onLogout: () => void;
  onThemeToggle: () => void;
}

export function Sidebar({ agent, did, currentView, onViewChange, onLogout, onThemeToggle }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="desktop-only" style={{ marginBottom: 20, padding: '10px 20px' }}>
         <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Bluesky</h2>
      </div>

      <nav style={{ flex: 1 }}>
        <div 
          className={`nav-item ${currentView === 'timeline' ? 'active' : ''}`}
          onClick={() => onViewChange('timeline')}
          data-icon="🏠"
        >
          <i className="fa-solid fa-house"></i> <span>Home</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
          onClick={() => onViewChange('search')}
          data-icon="🔍"
        >
          <i className="fa-solid fa-magnifying-glass"></i> <span>Search</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'notifications' ? 'active' : ''}`}
          onClick={() => onViewChange('notifications')}
          data-icon="🔔"
        >
          <i className="fa-solid fa-bell"></i> <span>Notifications</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'scheduled' ? 'active' : ''}`}
          onClick={() => onViewChange('scheduled')}
          data-icon="⏳"
        >
          <i className="fa-solid fa-clock"></i> <span>Scheduled</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
          onClick={() => onViewChange('profile')}
          data-icon="👤"
        >
          <i className="fa-solid fa-user"></i> <span>Profile</span>
        </div>
      </nav>

      <div className="desktop-only" style={{ marginTop: 20, borderTop: '1px solid var(--border-color-dark)', paddingTop: 10 }}>
         <UserProfile agent={agent} did={did} />
         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: 10 }}>
            <button className="btn-ghost" onClick={onThemeToggle} style={{ fontSize: '0.9rem' }}>
               <i className="fa-solid fa-moon"></i> Theme
            </button>
            <button className="btn-ghost" onClick={onLogout} style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>
               <i className="fa-solid fa-right-from-bracket"></i> Logout
            </button>
         </div>
      </div>
    </div>
  );
}