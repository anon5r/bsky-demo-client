import { useState, useEffect } from 'react';
import './App.css';
import { getBlueskyClient } from './lib/bluesky-oauth';
import { getChronoskyAuthState } from './lib/chronosky-xrpc-client';
import { OAuthCallback } from './components/OAuthCallback';
import { ChronoskyAuth } from './components/ChronoskyAuth';
import { PostForm } from './components/PostForm';
import { PostList } from './components/PostList';
import { LoginView } from './components/LoginView';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';

function App() {
  const [bskySession, setBskySession] = useState<OAuthSession | null>(null);
  const [isChronoskyAuthenticated, setIsChronoskyAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'callback'>('login');
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const isCallback = 
        window.location.pathname === '/oauth/callback' || 
        window.location.pathname === '/oauth/chronosky/callback';

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

      const chronoskyAuth = getChronoskyAuthState();
      setIsChronoskyAuthenticated(!!chronoskyAuth.tokens);

    } catch (e) {
      console.error("Auth check failed", e);
    }
  }

  async function initAgent(session: OAuthSession) {
    try {
        const tokenInfo = await session.getTokenInfo();
        const agent = new Agent({
            service: tokenInfo.aud,
            fetch: (url, init) => session.fetchHandler(url.toString(), init)
        });
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
        // Chronosky or other callback that didn't return a main session
        checkAuth();
    }
  }
  
  async function logout() {
      if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('chronosky_tokens');
        localStorage.removeItem('chronosky_dpop_keypair');
        localStorage.removeItem('chronosky_user_did');
        
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
            {!isChronoskyAuthenticated ? (
                agent && bskySession ? (
                    <UserProfile agent={agent} did={bskySession.sub} isChronoskyAuth={isChronoskyAuthenticated} />
                ) : <div>Initializing...</div>
            ) : (
                <div className="card" style={{ borderColor: 'green' }}>
                    <p>✅ Connected to Chronosky</p>
                </div>
            )}
            
            {agent && (
                <PostForm 
                    agent={agent} 
                    isChronoskyAuthenticated={isChronoskyAuthenticated} 
                    // onPostCreated={() => { /* Trigger refresh in PostList? Needs state lift or context */ }} 
                />
            )}
            
            {agent && bskySession && <PostList agent={agent} did={bskySession.sub} />}
          </div>
          
        </div>
      )}
    </div>
  );
}

function UserProfile({ agent, did, isChronoskyAuth }: { agent: Agent, did: string, isChronoskyAuth: boolean }) {
    const [handle, setHandle] = useState<string>('');

    useEffect(() => {
        if (did) {
            agent.getProfile({ actor: did }).then(res => {
                setHandle(res.data.handle);
            }).catch(console.error);
        }
    }, [agent, did]);

    if (!handle) return <div>Loading profile...</div>;

    return (
        <div className="card">
            <p>Welcome, @{handle}!</p>
            {!isChronoskyAuth && <ChronoskyAuth handle={handle} />}
        </div>
    );
}

export default App;