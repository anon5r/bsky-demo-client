import { useState, useRef, useEffect } from 'react';
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setShowMenu(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      <div className="desktop-only" style={{ marginTop: 20, borderTop: '1px solid var(--border-color-dark)', paddingTop: 10, position: 'relative' }} ref={menuRef}>
         <div onClick={() => setShowMenu(!showMenu)} style={{ cursor: 'pointer' }}>
            <UserProfile agent={agent} did={did} />
         </div>
         
         {showMenu && (
             <div style={{
                 position: 'absolute',
                 bottom: '100%',
                 left: 0,
                 width: '100%',
                 background: 'var(--card-bg)',
                 border: '1px solid var(--border-color)',
                 borderRadius: 12,
                 boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                 padding: 8,
                 marginBottom: 10,
                 zIndex: 100
             }}>
                <button 
                    className="btn-ghost" 
                    onClick={() => { onThemeToggle(); setShowMenu(false); }} 
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', borderRadius: 8, padding: '10px' }}
                >
                   <i className="fa-solid fa-moon"></i> Theme
                </button>
                <button 
                    className="btn-ghost" 
                    onClick={() => { onLogout(); setShowMenu(false); }} 
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', borderRadius: 8, padding: '10px', color: 'var(--error-color)' }}
                >
                   <i className="fa-solid fa-right-from-bracket"></i> Logout
                </button>
             </div>
         )}
      </div>
    </div>
  );
}