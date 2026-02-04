interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  onThemeToggle: () => void;
  onCompose: () => void;
}

export function Sidebar({ currentView, onViewChange, onLogout, onThemeToggle, onCompose }: SidebarProps) {
  const navItems = [
    { id: 'timeline', icon: 'fa-solid fa-house', label: 'Home' },
    { id: 'search', icon: 'fa-solid fa-magnifying-glass', label: 'Search' },
    { id: 'notifications', icon: 'fa-solid fa-bell', label: 'Notifications' },
    { id: 'scheduled', icon: 'fa-solid fa-calendar', label: 'Scheduled' },
    { id: 'profile', icon: 'fa-solid fa-user', label: 'Profile' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => onViewChange('timeline')}>
        <i className="fa-brands fa-bluesky" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </div>
        ))}
        
        <div className="nav-item" onClick={onThemeToggle}>
             <i className="fa-solid fa-circle-half-stroke"></i>
             <span>Theme</span>
        </div>

        <button className="btn btn-primary" onClick={onCompose}>
          Post
        </button>
      </nav>

      <div style={{ padding: '20px 0' }}>
         <div 
            className="nav-item" 
            onClick={onLogout} 
            style={{ color: 'var(--error-color)', marginTop: 'auto' }}
         >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Log out</span>
         </div>
      </div>
    </aside>
  );
}