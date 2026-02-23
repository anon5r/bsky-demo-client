import React, { useState, useEffect } from 'react';

interface LoginViewProps {
  onLogin: (handle: string, chronoskyScope: 'none' | 'basic' | 'full') => void;
}

const HISTORY_KEY = 'bsky_login_history';

export function LoginView({ onLogin }: LoginViewProps) {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [chronoskyScope, setChronoskyScope] = useState<'none' | 'basic' | 'full'>('none');

  useEffect(() => {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTimeout(() => setHistory(parsed), 0);
      } catch (e) {
        console.error("Failed to parse login history", e);
      }
    }
  }, []);

  const saveToHistory = (newHandle: string) => {
    const newHistory = [newHandle, ...history.filter(h => h !== newHandle)].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const removeFromHistory = (e: React.MouseEvent, target: string) => {
    e.stopPropagation();
    const newHistory = history.filter(h => h !== target);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const executeLogin = async (loginHandle: string) => {
    if (!loginHandle) return;
    setLoading(true);
    
    let cleanHandle = loginHandle.replace('@', '').trim();
    if (!cleanHandle.includes('.')) {
        cleanHandle += '.bsky.social';
    }
    
    saveToHistory(cleanHandle);
    await onLogin(cleanHandle, chronoskyScope);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeLogin(handle);
  };

  return (
    <div className="auth-container">
       <div className="auth-card">
          <div style={{ marginBottom: 30 }}>
             <i className="fa-brands fa-bluesky" style={{ fontSize: '4rem', color: 'var(--primary-color)' }}></i>
          </div>
          <h1 className="auth-title">Sign in to Bluesky</h1>
          
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="auth-input"
              placeholder="Username or email (e.g. alice.bsky.social)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={loading}
              autoFocus
            />

            <div style={{ margin: '20px 0', textAlign: 'left', background: 'var(--bg-color-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-color-secondary)' }}>
                Chronosky Scope Level (Testing)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="radio" name="scope" value="none" checked={chronoskyScope === 'none'} onChange={() => setChronoskyScope('none')} />
                  <span style={{color: 'var(--text-color)'}}>None (atproto only)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="radio" name="scope" value="basic" checked={chronoskyScope === 'basic'} onChange={() => setChronoskyScope('basic')} />
                  <span style={{color: 'var(--text-color)'}}>Basic (include:app.chronosky.authClient)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input type="radio" name="scope" value="full" checked={chronoskyScope === 'full'} onChange={() => setChronoskyScope('full')} />
                  <span style={{color: 'var(--text-color)'}}>Full (with Audience)</span>
                </label>
              </div>
            </div>
            
            <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !handle}
                style={{ borderRadius: 999, fontSize: '1.1rem', fontWeight: 700 }}
            >
              {loading ? 'Connecting...' : 'Next'}
            </button>
          </form>

          {history.length > 0 && (
            <div style={{ marginTop: 30, textAlign: 'left' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', marginBottom: 10, fontWeight: 600 }}>Recent logins</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map(h => (
                  <div 
                    key={h} 
                    onClick={() => executeLogin(h)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 16px', 
                      background: 'var(--bg-color-secondary)', 
                      borderRadius: 12, 
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      transition: 'background-color 0.2s'
                    }}
                    className="history-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-color-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-color-secondary)' }}>
                            <i className="fa-solid fa-user"></i>
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--text-color)' }}>{h}</span>
                    </div>
                    <button 
                      onClick={(e) => removeFromHistory(e, h)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-color-secondary)', cursor: 'pointer', padding: 4 }}
                      title="Remove"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
             Don't have an account? <a href="https://bsky.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Sign up</a>
          </div>
       </div>
    </div>
  );
}