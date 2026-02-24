import { useState, useEffect } from 'react';
import './App.css'; // This might be redundant if using index.css mainly, but keeping for safety
import { getBlueskyClient } from './lib/bluesky-oauth';
import { OAuthCallback } from './components/OAuthCallback';
import { PostForm } from './components/PostForm';
import { PostList } from './components/PostList';
import { ScheduleList } from './components/ScheduleList';
import { LoginView } from './components/LoginView';
import { Search } from './components/Search';
import { NotificationList } from './components/NotificationList';
import { ThreadView } from './components/ThreadView';
import { UserList } from './components/UserList';
import { ProfileView } from './components/ProfileView';
import { Layout } from './components/Layout';
import { Modal } from './components/Modal';
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
  const [isComposeOpen, setIsComposeOpen] = useState(false);
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
      const tokenInfo = await session.getTokenInfo();
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

  async function handleLogin(handle: string, chronoskyScope: 'basic' | 'withChronosky' | 'withChronoskyAud' = 'basic') {
    const client = await getBlueskyClient();
    try {
          const baseScope = [
            'atproto',
          ];

          if (chronoskyScope === 'withChronosky') {
            baseScope.push('include:app.chronosky.authClient');
          } else if (chronoskyScope === 'withChronoskyAud') {
            // baseScope.push('include:app.chronosky.authClient?aud=did:web:api.chronosky.app%23chronosky_xrpc');
            baseScope.push('include:app.chronosky.authClient?aud=*');
          }

          [
            'include:app.bsky.authFullApp?aud=did:web:api.bsky.app#bsky_appview',
            'blob:image/*',
            'blob:video/*'
          ].forEach(blobs => baseScope.push(blobs));

          await client.signIn(handle, {
            state: crypto.randomUUID(),
            scope: baseScope.join(' '),
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

  function handleOAuthError(err: unknown) {
      console.error("OAuth error:", err);
      setCurrentView('login');
  }

  const handleViewChange = (type: any) => {
      // Sidebar mostly passes strings, except if we want args
      if (type === 'profile') {
          setDashboardView({ type: 'profile', did: bskySession?.sub || '' });
      } else {
          setDashboardView({ type });
      }
      // Scroll to top
      window.scrollTo(0, 0);
  };

  const handleGoToProfile = (did: string) => {
      setDashboardView({ type: 'profile', did });
      window.scrollTo(0, 0);
  };

  const handleGoToThread = (post: any) => {
      setDashboardView({ type: 'thread', uri: post.uri });
      window.scrollTo(0, 0);
  };

  if (currentView === 'callback') {
      return <OAuthCallback onSuccess={handleOAuthSuccess} onError={handleOAuthError} />;
  }

  if (!bskySession || currentView === 'login') {
    return (
      <div className="App">
          <LoginView onLogin={handleLogin} />
          <div style={{ position: 'absolute', bottom: 20, right: 20 }}>
            <button onClick={toggleTheme} className="btn-ghost">
                {theme === 'light' ? <i className="fa-solid fa-moon"></i> : <i className="fa-solid fa-sun"></i>}
            </button>
          </div>
      </div>
    );
  }

  return (
    <>
      {agent && bskySession && (
        <Layout 
            currentView={dashboardView.type === 'profile' && dashboardView.did === bskySession.sub ? 'profile' : dashboardView.type} 
            onViewChange={handleViewChange}
            onLogout={logout}
            onThemeToggle={toggleTheme}
            onCompose={() => setIsComposeOpen(true)}
        >
            {dashboardView.type === 'timeline' && (
            <>
                <div className="feed-header" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    Home
                </div>
                {/* Inline Composer (Hidden on mobile usually, but good for desktop) */}
                <div className="desktop-only">
                    <PostForm 
                        agent={agent}
                        session={bskySession}
                        onPostCreated={() => {
                        setTimelineUpdateTrigger(prev => prev + 1);
                        }}
                    />
                </div>
                <PostList 
                    key={timelineUpdateTrigger}
                    agent={agent} 
                    did={bskySession.sub} 
                    session={bskySession} 
                    onPostClick={handleGoToThread}
                />
            </>
            )}

            {dashboardView.type === 'scheduled' && (
            <>
                <div className="feed-header">Scheduled Posts</div>
                <div className="desktop-only">
                    <PostForm 
                        agent={agent}
                        session={bskySession}
                        onPostCreated={() => setScheduleUpdateTrigger(prev => prev + 1)}
                        defaultMode="schedule"
                    />
                </div>
                {agent && (
                <ScheduleList
                    key={scheduleUpdateTrigger}
                    session={bskySession}
                    agent={agent}
                />
                )}
            </>
            )}

            {dashboardView.type === 'profile' && (
            <>
                <div className="feed-header">
                    <button className="btn-ghost" onClick={() => handleViewChange('timeline')} style={{ marginRight: 10 }}>
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    Profile
                </div>
                <ProfileView 
                    agent={agent} 
                    did={dashboardView.did} 
                    session={bskySession}
                    onViewFollowers={(did) => setDashboardView({ type: 'followers', did })}
                    onViewFollowing={(did) => setDashboardView({ type: 'following', did })}
                />
            </>
            )}

            {dashboardView.type === 'thread' && (
                <>
                    <div className="feed-header">
                        <button className="btn-ghost" onClick={() => handleViewChange('timeline')} style={{ marginRight: 10 }}>
                            <i className="fa-solid fa-arrow-left"></i>
                        </button>
                        Thread
                    </div>
                    <ThreadView 
                        agent={agent} 
                        uri={dashboardView.uri} 
                        session={bskySession}
                        onPostClick={handleGoToThread}
                    />
                </>
            )}

            {dashboardView.type === 'search' && (
                <>
                    <div className="feed-header">Search</div>
                    <Search 
                        agent={agent} 
                        onSelectActor={handleGoToProfile} 
                        onSelectPost={handleGoToThread}
                    />
                </>
            )}

            {dashboardView.type === 'notifications' && (
                <>
                    <div className="feed-header">Notifications</div>
                    <NotificationList agent={agent} />
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
                    <UserList 
                        agent={agent} 
                        did={dashboardView.did} 
                        type={dashboardView.type}
                        onSelectActor={handleGoToProfile}
                    />
                </>
            )}
        </Layout>
      )}

      {/* Global Compose Modal */}
      {agent && bskySession && (
          <Modal isOpen={isComposeOpen} onClose={() => setIsComposeOpen(false)}>
             <PostForm 
                agent={agent}
                session={bskySession}
                onPostCreated={() => {
                    setIsComposeOpen(false);
                    setTimelineUpdateTrigger(prev => prev + 1);
                }}
                onCancel={() => setIsComposeOpen(false)}
             />
          </Modal>
      )}
    </>
  );
}

export default App;
