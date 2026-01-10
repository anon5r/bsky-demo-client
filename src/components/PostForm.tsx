import React, { useState } from 'react';
import { createScheduledPost } from '../lib/chronosky-xrpc-client';
import { Agent } from '@atproto/api';

interface PostFormProps {
  agent: Agent;
  isChronoskyAuthenticated: boolean;
  onPostCreated?: () => void;
}

export function PostForm({ agent, isChronoskyAuthenticated, onPostCreated }: PostFormProps) {
  const [text, setText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      if (mode === 'schedule') {
        if (!isChronoskyAuthenticated) {
            throw new Error("You must connect to Chronosky to schedule posts.");
        }
        await createScheduledPost({
          text: text,
          scheduledAt: new Date(scheduledAt).toISOString(),
        });
        setStatus('success');
        setText('');
        setScheduledAt('');
      } else {
        // Post Now
        await agent.post({
            text: text,
            createdAt: new Date().toISOString()
        });
        setStatus('success');
        setText('');
        if (onPostCreated) onPostCreated();
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return (
    <div className="card">
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '10px' }}>
            <input 
                type="radio" 
                name="mode" 
                value="now" 
                checked={mode === 'now'} 
                onChange={() => setMode('now')} 
            /> Post Now
        </label>
        <label>
            <input 
                type="radio" 
                name="mode" 
                value="schedule" 
                checked={mode === 'schedule'} 
                onChange={() => setMode('schedule')}
                disabled={!isChronoskyAuthenticated}
            /> Schedule (Chronosky)
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
          rows={3}
          required
        />
        
        {mode === 'schedule' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required={mode === 'schedule'}
            />
        )}
        
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Posting...' : (mode === 'schedule' ? 'Schedule Post' : 'Post Now')}
        </button>
      </form>
      {status === 'success' && <p style={{ color: 'green' }}>{mode === 'schedule' ? 'Post scheduled!' : 'Posted successfully!'}</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Error: {errorMsg}</p>}
    </div>
  );
}
