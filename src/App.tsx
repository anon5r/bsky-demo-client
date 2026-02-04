import { useState, useEffect } from 'react';
import './App.css';
import { getBlueskyClient } from './lib/bluesky-oauth';
import { OAuthCallback } from './components/OAuthCallback';
import { PostForm } from './components/PostForm';
import { PostList } from './components/PostList';
import { ScheduleList } from './components/ScheduleList';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { Search } from './components/Search';
import { NotificationList } from './components/NotificationList';
import { ThreadView } from './components/ThreadView';
import { UserList } from './components/UserList';
import { ProfileView } from './components/ProfileView';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';

type ViewState = 
  | { type: 'timeline' }
  | { type: 'scheduled' }
  | { type: 'profile'; did: string }
  | { type: 'notifications' }
  | { type: 'search' }
  | { type: 'thread'; uri: string }
  | { type: 'followers'; did: string }
  | { type: 'following'; did: string };

function App() {
  const [bskySession, setBskySession] = useState<OAuthSession | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'callback'>('login');
  const [dashboardView, setDashboardView] = useState<ViewState>({ type: 'timeline' });
  const [agent, setAgent] = useState<Agent | null>(null);
  const [scheduleUpdateTrigger, setScheduleUpdateTrigger] = useState(0);
  const [timelineUpdateTrigger, setTimelineUpdateTrigger] = useState(0);
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

  async function initAgent(session: OAuthSession) {
    try {
      console.log('App: Full Session Object:', session);
      // @ts-ignore
      if (session.tokenSet) {
         // @ts-ignore
         console.log('App: TokenSet:', session.tokenSet);
      }
      
      const tokenInfo = await session.getTokenInfo();
      console.log('App: Token Info (Default):', tokenInfo);

      const agent = new Agent({
        service: tokenInfo.aud,
        // @ts-expect-error fetch signature mismatch
        fetch: (url: string, init?: RequestInit) => session.fetchHandler(url.toString(), init),
      });
        (agent as any).session = {
        did: tokenInfo.sub,
        handle: '',
        accessJwt: 'dummy',
        refreshJwt: 'dummy',
        email: '',
        emailConfirmed: true,
      };
      setAgent(agent);
    } catch (e) {
      console.error("Failed to init agent", e);
    }
  }

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

  useEffect(() => {
    const isCallback = window.location.pathname === '/oauth/callback';

    if (isCallback) {
      setCurrentView('callback');
      return;
    }

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(handle: string) {
    const client = await getBlueskyClient();
    try {
          await client.signIn(handle, {
            state: crypto.randomUUID(),
            prompt: 'login',
            scope: "atproto include:app.bsky.authFullApp?aud=%2A include:app.chronosky.authClient?aud=did:web:api.chronosky.app",
          });    } catch (e) {
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

  function handleOAuthError(err: unknown) {
      console.error("OAuth error:", err);
      // alert("Login failed or cancelled."); // Optional: show error
      setCurrentView('login');
  }

  const handleViewChange = (type: any) => {
      // Sidebar mostly passes strings, except if we want args
      if (type === 'profile') {
          setDashboardView({ type: 'profile', did: bskySession?.sub || '' });
      } else {
          setDashboardView({ type });
      }
  };

  const handleGoToProfile = (did: string) => {
      setDashboardView({ type: 'profile', did });
  };

  const handleGoToThread = (post: any) => {
      setDashboardView({ type: 'thread', uri: post.uri });
  };

  if (currentView === 'callback') {
      return <OAuthCallback onSuccess={handleOAuthSuccess} onError={handleOAuthError} />;
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
          currentView={dashboardView.type}
          onViewChange={handleViewChange}
          onLogout={logout}
          onThemeToggle={toggleTheme}
        />
      )}

      <main className="main-content">
        {dashboardView.type === 'timeline' && (
          <>
            <div className="feed-header">Home</div>
            {agent && bskySession && (
                <PostForm 
                    agent={agent}
                    session={bskySession}
                    onPostCreated={() => {
                      setTimelineUpdateTrigger(prev => prev + 1);
                    }}
                />
            )}
            {agent && bskySession && (
                <PostList 
                    key={timelineUpdateTrigger}
                    agent={agent} 
                    did={bskySession.sub} 
                    session={bskySession} 
                    onPostClick={handleGoToThread}
                />
            )}
          </>
        )}

        {dashboardView.type === 'scheduled' && (
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
                    agent={agent || undefined}
                />
             )}
          </>
        )}

        {dashboardView.type === 'profile' && (
           <>
             <div className="feed-header">Profile</div>
             {agent && bskySession && (
                 <ProfileView 
                    agent={agent} 
                    did={dashboardView.did} 
                    session={bskySession}
                    onViewFollowers={(did) => setDashboardView({ type: 'followers', did })}
                    onViewFollowing={(did) => setDashboardView({ type: 'following', did })}
                 />
             )}
           </>
        )}

        {dashboardView.type === 'thread' && (
            <>
                <div className="feed-header">
                    <button className="btn-ghost" onClick={() => setDashboardView({ type: 'timeline' })} style={{ marginRight: 10 }}>
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    Thread
                </div>
                {agent && bskySession && (
                    <ThreadView 
                        agent={agent} 
                        uri={dashboardView.uri} 
                        session={bskySession}
                        onPostClick={handleGoToThread}
                    />
                )}
            </>
        )}

        {dashboardView.type === 'search' && (
            <>
                <div className="feed-header">Search</div>
                {agent && (
                    <Search 
                        agent={agent} 
                        onSelectActor={handleGoToProfile} 
                    />
                )}
            </>
        )}

        {dashboardView.type === 'notifications' && (
            <>
                <div className="feed-header">Notifications</div>
                {agent && <NotificationList agent={agent} />}
            </>
        )}

        {(dashboardView.type === 'followers' || dashboardView.type === 'following') && (
            <>
                <div className="feed-header">
                    <button 
                        className="btn-ghost" 
                        onClick={() => setDashboardView({ type: 'profile', did: dashboardView.did })} 
                        style={{ marginRight: 10 }}
                    >
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    {dashboardView.type === 'followers' ? 'Followers' : 'Following'}
                </div>
                {agent && (
                    <UserList 
                        agent={agent} 
                        did={dashboardView.did} 
                        type={dashboardView.type}
                        onSelectActor={handleGoToProfile}
                    />
                )}
            </>
        )}
      </main>
    </div>
  );
}

export default App;
