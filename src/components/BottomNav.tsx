interface BottomNavProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onCompose: () => void;
}

export function BottomNav({ currentView, onViewChange, onCompose }: BottomNavProps) {
  const navItems = [
    { id: 'timeline', icon: 'fa-solid fa-house', label: 'Home' },
    { id: 'search', icon: 'fa-solid fa-magnifying-glass', label: 'Search' },
    { id: 'notifications', icon: 'fa-solid fa-bell', label: 'Notifications' },
    { id: 'profile', icon: 'fa-solid fa-user', label: 'Profile' },
  ];

  return (
    <>
      <div className="bottom-nav">
        {navItems.map((item) => (
          <div 
            key={item.id} 
            className="nav-item" 
            style={{ 
              color: currentView === item.id ? 'var(--text-color)' : 'var(--text-color-secondary)',
              fontWeight: currentView === item.id ? 'bold' : 'normal',
              padding: 0, 
              background: 'none'
            }}
            onClick={() => onViewChange(item.id)}
          >
            <i className={item.icon} style={{ fontSize: '1.5rem', width: 'auto' }}></i>
          </div>
        ))}
      </div>
      
      {/* Floating Action Button for Compose on Mobile */}
      <div className="fab" onClick={onCompose}>
        <i className="fa-solid fa-feather-pointed"></i>
      </div>
    </>
  );
}
