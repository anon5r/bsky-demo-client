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
  // Trigger to reload schedules after a new one is created
  const [scheduleUpdateTrigger, setScheduleUpdateTrigger] = useState(0);

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
        
        // Agent expects a session object to be authenticated.
        // We use the OAuth session's fetch handler for requests.
        const agent = new Agent({
            service: tokenInfo.aud,
            fetch: (url: URL | RequestInfo, init?: RequestInit) => {
                const urlStr = url instanceof URL ? url.toString() : typeof url === 'string' ? url : url.url;
                return session.fetchHandler(urlStr, init);
            },
        });

        // Hack: Manually set session data to satisfy Agent's assertAuthenticated checks
        // @ts-ignore
        agent.session = {
            did: session.sub,
            handle: (session as any).handle || session.sub,
            accessJwt: 'dummy', // Not used because we override fetch, but needed for checks
            refreshJwt: 'dummy',
            email: 'dummy',
            emailConfirmed: true,
        };
        
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

  async function handleCallbackSuccess(session?: OAuthSession) {
    if (session) {
       setBskySession(session);
       await initAgent(session);
       setCurrentView('dashboard');
    } else {
        checkAuth();
    }
  }
  
  async function logout() {
      if (confirm("Are you sure you want to logout?")) {
        // Chronosky auth is now integrated, so no separate tokens to clear
        if (bskySession) {
            try {
                await bskySession.signOut();
            } catch (e) {
                console.error("Sign out error", e);
            }
        }
        
        window.location.href = '/';
      }
  }

  if (currentView === 'callback') {
    return <OAuthCallback onSuccess={handleCallbackSuccess} />;
  }

  return (
    <div className="App">
      <h1>Bluesky + Chronosky Demo</h1>
      
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
