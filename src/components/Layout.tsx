import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  onThemeToggle: () => void;
  onCompose: () => void;
}

export function Layout({ 
  children, 
  currentView, 
  onViewChange, 
  onLogout, 
  onThemeToggle,
  onCompose 
}: LayoutProps) {
  return (
    <div className="app-container">
      <Sidebar 
        currentView={currentView}
        onViewChange={onViewChange}
        onLogout={onLogout}
        onThemeToggle={onThemeToggle}
        onCompose={onCompose}
      />
      
      <main className="main-content">
        {children}
      </main>

      {/* Right Sidebar Placeholder - Future Search/Trends */}
      <aside className="right-sidebar">
         <div style={{ background: 'var(--nav-hover-bg)', borderRadius: 16, padding: 16, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-color-secondary)' }}>
            Search & Trending
         </div>
      </aside>

      <BottomNav 
        currentView={currentView} 
        onViewChange={onViewChange} 
        onCompose={onCompose}
      />
    </div>
  );
}
