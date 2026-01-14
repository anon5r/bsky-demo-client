import { useState, useEffect } from 'react';
import './App.css';
import { getBlueskyClient } from './lib/bluesky-oauth';
import { OAuthCallback } from './components/OAuthCallback';
import { PostForm } from './components/PostForm';
import { PostList } from './components/PostList';
import { ScheduleList } from './components/ScheduleList';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { UserProfile } from './components/UserProfile';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';

type DashboardView = 'timeline' | 'scheduled' | 'profile';

function App() {
  const [bskySession, setBskySession] = useState<OAuthSession | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'callback'>('login');
  const [dashboardView, setDashboardView] = useState<DashboardView>('timeline');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [scheduleUpdateTrigger, setScheduleUpdateTrigger] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const isCallback = window.location.pathname === '/oauth/callback';

    if (isCallback) {
      setCurrentView('callback');
      return;
    }

    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const client = await getBlueskyClient();
      const result = await client.init();
      if (result) {
        setBskySession(result.session);
        await initAgent(result.session);
        setCurrentView('dashboard');
      }
    } catch (e) {
      console.error("Auth check failed", e);
    }
  }

  async function initAgent(session: OAuthSession) {
    try {
      const tokenInfo = await session.getTokenInfo();
      const sessionManager = {
        service: tokenInfo.aud,
        fetch: (url: string, init?: RequestInit) => session.fetchHandler(url, init),
        did: session.sub
      };
      // @ts-ignore
      const agent = new Agent(sessionManager);
      setAgent(agent);
    } catch (e) {
      console.error("Failed to init agent", e);
    }
  }

  async function handleLogin(handle: string) {
    const client = await getBlueskyClient();
    try {
      await client.signIn(handle, {
        state: crypto.randomUUID(),
        prompt: 'login',
      });
    } catch (e) {
      console.error("Login failed", e);
      alert("Login failed: " + e);
    }
  }

  async function logout() {
      if (bskySession) {
          try {
              await bskySession.signOut();
          } catch (e) {
              console.error("Sign out failed", e);
          }
      }
      setBskySession(null);
      setAgent(null);
      setCurrentView('login');
  }

  async function handleOAuthSuccess(session?: OAuthSession) {
      if (!session) {
          console.error("No session returned from callback");
          setCurrentView('login');
          return;
      }
      setBskySession(session);
      await initAgent(session);
      setCurrentView('dashboard');
  }

  if (currentView === 'callback') {
      return <OAuthCallback onSuccess={handleOAuthSuccess} />;
  }

  if (!bskySession || currentView === 'login') {
    return (
      <div className="App">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
          <h1 style={{ marginBottom: 40 }}>Bluesky Demo Client</h1>
          <LoginView onLogin={handleLogin} />
          <button onClick={toggleTheme} className="btn-ghost" style={{ marginTop: 20 }}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {agent && bskySession && (
        <Sidebar 
          agent={agent} 
          did={bskySession.sub} 
          currentView={dashboardView}
          onViewChange={setDashboardView}
          onLogout={logout}
          onThemeToggle={toggleTheme}
        />
      )}

      <main className="main-content">
        {dashboardView === 'timeline' && (
          <>
            <div className="feed-header">Home</div>
            {agent && bskySession && (
                <PostForm 
                    agent={agent}
                    session={bskySession}
                    onPostCreated={() => {
                      setScheduleUpdateTrigger(prev => prev + 1);
                      // Refresh timeline if needed (PostList handles its own fetch, might need a trigger)
                      // Ideally we pass a key or a callback to PostList to refresh.
                      // For now, simple re-mount or relying on internal state updates.
                    }}
                />
            )}
            {agent && bskySession && <PostList agent={agent} did={bskySession.sub} />}
          </>
        )}

        {dashboardView === 'scheduled' && (
          <>
             <div className="feed-header">Scheduled Posts</div>
             {agent && bskySession && (
                <PostForm 
                    agent={agent}
                    session={bskySession}
                    onPostCreated={() => setScheduleUpdateTrigger(prev => prev + 1)}
                    defaultMode="schedule"
                />
             )}
             {bskySession && (
                <ScheduleList 
                    key={scheduleUpdateTrigger}
                    session={bskySession}
                />
             )}
          </>
        )}

        {dashboardView === 'profile' && (
           <>
             <div className="feed-header">Profile</div>
             <div style={{ padding: 20 }}>
                {agent && bskySession && <UserProfile agent={agent} did={bskySession.sub} />}
             </div>
             {agent && bskySession && <PostList agent={agent} did={bskySession.sub} filter="author" />}
           </>
        )}
      </main>

      {/* Right sidebar could go here */}
    </div>
  );
}

export default App;
