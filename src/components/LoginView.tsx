import React, { useState, useEffect, useRef } from 'react';

interface LoginViewProps {
  onLogin: (handle: string) => void;
}

const HISTORY_KEY = 'bsky_login_history';
const MAX_HISTORY = 15;

export function LoginView({ onLogin }: LoginViewProps) {
  const [handle, setHandle] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load login history', e);
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveHandleToHistory = (newHandle: string) => {
    // Remove duplicates of the new handle, add to front
    const filtered = history.filter(h => h.toLowerCase() !== newHandle.toLowerCase());
    const newHistory = [newHandle, ...filtered].slice(0, MAX_HISTORY);
    
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;
    
    saveHandleToHistory(handle.trim());
    onLogin(handle.trim());
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing immediately or input blur issues
    if (confirm('Clear login history?')) {
        setHistory([]);
        localStorage.removeItem(HISTORY_KEY);
        setHandle('');
    }
  };

  const handleHistorySelect = (selectedHandle: string) => {
    setHandle(selectedHandle);
    setIsDropdownOpen(false);
  };

  // Filter history based on input
  const filteredHistory = history.filter(h => 
    h.toLowerCase().includes(handle.toLowerCase())
  );

  return (
    <div className="card login-card">
      <h2>Sign in to Bluesky</h2>
      <p>Enter your handle (e.g., alice.bsky.social)</p>
      
      <form onSubmit={handleSubmit} className="login-form">
        <div className="input-group" ref={wrapperRef}>
          <input
            type="text"
            value={handle}
            onChange={(e) => {
                setHandle(e.target.value);
                setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="User Handle"
            className="handle-input"
            required
          />
          
          {isDropdownOpen && (history.length > 0) && (
            <div className="history-dropdown">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <div 
                    key={item} 
                    className="history-item"
                    onClick={() => handleHistorySelect(item)}
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className="history-empty">No matches</div>
              )}
              
              {history.length > 0 && (
                  <div className="history-footer">
                    <button 
                        type="button" 
                        className="clear-history-btn"
                        onClick={handleClearHistory}
                    >
                        Clear History
                    </button>
                  </div>
              )}
            </div>
          )}
        </div>

        <button type="submit" className="login-btn">
          Sign In
        </button>
      </form>
    </div>
  );
}
