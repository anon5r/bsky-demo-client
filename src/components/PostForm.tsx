import React, { useState } from 'react';
import { createScheduledPost, createScheduledThread } from '../lib/chronosky-xrpc-client';
import { Agent } from '@atproto/api';

interface PostFormProps {
  agent: Agent;
  isChronoskyAuthenticated: boolean;
  onPostCreated?: () => void;
}

export function PostForm({ agent, isChronoskyAuthenticated, onPostCreated }: PostFormProps) {
  const [posts, setPosts] = useState<string[]>(['']);
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');

  const addPost = () => setPosts([...posts, '']);
  const removePost = (index: number) => setPosts(posts.filter((_, i) => i !== index));
  const updatePost = (index: number, text: string) => {
    const newPosts = [...posts];
    newPosts[index] = text;
    setPosts(newPosts);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      if (mode === 'schedule') {
        if (!isChronoskyAuthenticated) {
            throw new Error("You must connect to Chronosky to schedule posts.");
        }
        
        if (posts.length === 1) {
          await createScheduledPost({
            text: posts[0],
            scheduledAt: new Date(scheduledAt).toISOString(),
          });
        } else {
          await createScheduledThread({
            posts: posts.map(text => ({ text })),
            scheduledAt: new Date(scheduledAt).toISOString(),
          });
        }
        
        setStatus('success');
        setPosts(['']);
        setScheduledAt('');
      } else {
        // Post Now (Sequentially for threads)
        let root: { uri: string; cid: string } | undefined = undefined;
        let parent: { uri: string; cid: string } | undefined = undefined;
        
        for (const text of posts) {
          if (!text.trim()) continue;
          
          const res: any = await agent.post({
            text,
            reply: root && parent ? { root, parent } : undefined,
            createdAt: new Date().toISOString()
          });
          
          if (!root) {
            root = { uri: res.uri, cid: res.cid };
          }
          parent = { uri: res.uri, cid: res.cid };
        }
        
        setStatus('success');
        setPosts(['']);
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
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input 
                type="radio" 
                name="mode" 
                value="now" 
                checked={mode === 'now'} 
                onChange={() => setMode('now')} 
            /> Post Now
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: isChronoskyAuthenticated ? 'pointer' : 'not-allowed', color: isChronoskyAuthenticated ? 'inherit' : '#999' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {posts.map((text, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <textarea
                value={text}
                onChange={(e) => updatePost(index, e.target.value)}
                placeholder={index === 0 ? "What's happening?" : "Add another post..."}
                rows={3}
                required
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              {posts.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removePost(index)}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: '#fee', border: '1px solid #fcc', color: '#d00', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            type="button" 
            onClick={addPost}
            style={{ background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}
          >
            + Add to Thread
          </button>
          
          {mode === 'schedule' && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required={mode === 'schedule'}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="login-btn"
          style={{ width: '100%' }}
        >
          {status === 'loading' ? 'Processing...' : (mode === 'schedule' ? 'Schedule Thread' : 'Post Now')}
        </button>
      </form>
      {status === 'success' && <p style={{ color: 'green', marginTop: '10px' }}>{mode === 'schedule' ? 'Thread scheduled!' : 'Thread posted successfully!'}</p>}
      {status === 'error' && <p style={{ color: 'red', marginTop: '10px' }}>Error: {errorMsg}</p>}
    </div>
  );
}
