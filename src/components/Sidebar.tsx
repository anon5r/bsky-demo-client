import { Agent } from '@atproto/api';
import { UserProfile } from './UserProfile';

interface SidebarProps {
  agent: Agent;
  did: string;
  currentView: string;
  onViewChange: (view: 'timeline' | 'scheduled' | 'profile') => void;
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
          <span>🏠 Home</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'scheduled' ? 'active' : ''}`}
          onClick={() => onViewChange('scheduled')}
          data-icon="⏳"
        >
          <span>⏳ Scheduled</span>
        </div>
        <div 
          className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
          onClick={() => onViewChange('profile')}
          data-icon="👤"
        >
          <span>👤 Profile</span>
        </div>
      </nav>

      <div className="desktop-only" style={{ marginTop: 'auto' }}>
        {/* Post button could go here or floating */}
      </div>

      <div className="desktop-only" style={{ marginTop: 20, borderTop: '1px solid var(--border-color-dark)', paddingTop: 10 }}>
         <UserProfile agent={agent} did={did} />
         <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: 10 }}>
            <button className="btn-ghost" onClick={onThemeToggle} style={{ fontSize: '0.9rem' }}>🌗 Theme</button>
            <button className="btn-ghost" onClick={onLogout} style={{ color: 'var(--error-color)', fontSize: '0.9rem' }}>Logout</button>
         </div>
      </div>
    </div>
  );
}
