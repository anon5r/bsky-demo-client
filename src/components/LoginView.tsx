import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: (handle: string) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle) return;
    
    setLoading(true);
    // Basic normalization of handle
    let cleanHandle = handle.replace('@', '').trim();
    if (!cleanHandle.includes('.')) {
        cleanHandle += '.bsky.social'; // Default domain convenience
    }
    
    await onLogin(cleanHandle);
    setLoading(false);
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
            
            <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !handle}
                style={{ borderRadius: 999, fontSize: '1.1rem', fontWeight: 700 }}
            >
              {loading ? 'Connecting...' : 'Next'}
            </button>
          </form>

          <div style={{ marginTop: 24, fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
             Don't have an account? <a href="https://bsky.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Sign up</a>
          </div>
       </div>
    </div>
  );
}