import { useState, useEffect } from 'react';
import './App.css';
import { getBlueskyClient } from './lib/bluesky-oauth';
import { OAuthCallback } from './components/OAuthCallback';
import { PostForm } from './components/PostForm';
import { PostList } from './components/PostList';
import { ScheduleList } from './components/ScheduleList';
import { LoginView } from './components/LoginView';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';

function App() {
  const [bskySession, setBskySession] = useState<OAuthSession | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'callback'>('login');
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
      // Assuming client has no explicit signOut that clears local state other than just dropping it? 
      // OAuthClient usually manages storage.
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

  return (
    <div className="App">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Bluesky + Chronosky Demo</h1>
        <button onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
      
      {!bskySession ? (
        <LoginView onLogin={handleLogin} />
      ) : (
        <div className="dashboard">
          <div className="header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span>Logged in as: <strong>{bskySession.sub}</strong></span>
             <button onClick={logout}>Logout</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {agent && bskySession && (
                <UserProfile agent={agent} did={bskySession.sub} />
            )}
            
            {agent && bskySession && (
                <PostForm 
                    agent={agent}
                    session={bskySession}
                    onPostCreated={() => setScheduleUpdateTrigger(prev => prev + 1)}
                />
            )}
            
            {bskySession && (
                <ScheduleList 
                    key={scheduleUpdateTrigger}
                    session={bskySession}
                />
            )}
            
            {agent && bskySession && <PostList agent={agent} did={bskySession.sub} />}
          </div>
          
        </div>
      )}
    </div>
  );
}

function UserProfile({ agent, did }: { agent: Agent, did: string }) {
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (did) {
            agent.getProfile({ actor: did }).then(res => {
                setProfile(res.data);
            }).catch(console.error);
        }
    }, [agent, did]);

    if (!profile) return <div>Loading profile...</div>;

    return (
        <div className="card" style={{ textAlign: 'left', display: 'flex', gap: '15px', alignItems: 'center' }}>
            {profile.avatar && (
                <img 
                    src={profile.avatar} 
                    alt={profile.handle} 
                    style={{ width: 60, height: 60, borderRadius: '50%' }} 
                />
            )}
            <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{profile.displayName || profile.handle}</h3>
                <p style={{ margin: 0, color: '#666' }}>@{profile.handle}</p>
            </div>
        </div>
    );
}

export default App;