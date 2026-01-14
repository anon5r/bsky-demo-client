import React, { useState } from 'react';
import { ChronoskyClient } from '../lib/chronosky-xrpc-client';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import imageCompression from 'browser-image-compression';

interface PostFormProps {
  agent: Agent;
  session: OAuthSession;
  onPostCreated?: () => void;
  defaultMode?: 'now' | 'schedule';
}

interface PostDraft {
  text: string;
  images: File[];
  labels: string[];
  languages: string[];
}

const LABELS = [
  { val: 'sexual', label: 'Sexual' },
  { val: 'nudity', label: 'Nudity' },
  { val: 'porn', label: 'Porn' },
  { val: 'graphic-media', label: 'Graphic Media' },
  { val: 'violence', label: 'Violence' },
];

const LANGUAGES = [
  { code: 'ja', label: 'Japanese' },
  { code: 'en', label: 'English' },
];

export function PostForm({ agent, session, onPostCreated, defaultMode = 'now' }: PostFormProps) {
  const [posts, setPosts] = useState<PostDraft[]>([{ text: '', images: [], labels: [], languages: ['ja'] }]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [threadgate, setThreadgate] = useState<string[]>([]);
  const [disableQuotes, setDisableQuotes] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [mode, setMode] = useState<'now' | 'schedule'>(defaultMode);
  const [showOptions, setShowOptions] = useState(false);

  // Profile data for avatar (optional optimization: pass from parent)
  const [avatar, setAvatar] = useState<string | null>(null);
  React.useEffect(() => {
      agent.getProfile({ actor: session.did }).then(res => setAvatar(res.data.avatar || null)).catch(() => {});
  }, [agent, session.did]);

  const addPost = () => setPosts([...posts, { text: '', images: [], labels: [], languages: ['ja'] }]);
  const removePost = (index: number) => setPosts(posts.filter((_, i) => i !== index));
  
  const updateText = (index: number, text: string) => {
    const newPosts = [...posts];
    newPosts[index].text = text;
    setPosts(newPosts);
  };

  const handleImageSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      const currentImages = posts[index].images;
      if (currentImages.length + newImages.length > 4) {
        alert("Max 4 images per post.");
        return;
      }
      const updatedPosts = [...posts];
      updatedPosts[index].images = [...currentImages, ...newImages];
      setPosts(updatedPosts);
    }
  };

  const removeImage = (postIndex: number, imgIndex: number) => {
    const updatedPosts = [...posts];
    updatedPosts[postIndex].images = updatedPosts[postIndex].images.filter((_, i) => i !== imgIndex);
    setPosts(updatedPosts);
  };

  async function compressImage(file: File): Promise<Blob> {
    const options = { maxSizeMB: 0.9, maxWidthOrHeight: 2000, useWebWorker: true };
    return await imageCompression(file, options);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      if (mode === 'schedule') {
        const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));
        const threadPosts: any[] = [];
        
        for (const draft of posts) {
          if (!draft.text.trim() && draft.images.length === 0) continue;
          let embed: any = undefined;
          if (draft.images.length > 0) {
            const uploaded: { alt: string; image: any }[] = [];
            for (const img of draft.images) {
              const compressed = await compressImage(img);
              const uploadRes = await client.uploadBlob(compressed as Blob);
              if (!uploadRes || !uploadRes.blob) throw new Error("Failed to upload image");
              uploaded.push({ alt: "Image", image: uploadRes.blob });
            }
            embed = { $type: 'app.bsky.embed.images', images: uploaded };
          }
          const labels = draft.labels.length > 0 ? {
            $type: 'com.atproto.label.defs#selfLabels',
            values: draft.labels.map(val => ({ val }))
          } : undefined;
          threadPosts.push({
            text: draft.text,
            embed: embed,
            labels: labels,
            langs: draft.languages.length > 0 ? draft.languages : undefined,
          });
        }

        if (threadPosts.length === 0) throw new Error("Cannot create empty post");
        if (!scheduledAt) throw new Error("Please select a date/time.");

        await client.createPost({
          posts: threadPosts,
          scheduledAt: new Date(scheduledAt).toISOString(),
          threadgateRules: threadgate.length > 0 ? threadgate as any : undefined,
          disableQuotePosts: disableQuotes
        });
        
        setStatus('success');
        setPosts([{ text: '', images: [], labels: [], languages: ['ja'] }]);
        setScheduledAt('');
        if (onPostCreated) onPostCreated();

      } else {
        // Post Now
        let root: { uri: string; cid: string } | undefined = undefined;
        let parent: { uri: string; cid: string } | undefined = undefined;
        
        for (const draft of posts) {
          if (!draft.text.trim() && draft.images.length === 0) continue;
          let embed: any = undefined;
          if (draft.images.length > 0) {
             const uploaded = [];
             for (const img of draft.images) {
                const compressed = await compressImage(img);
                const { data } = await agent.uploadBlob(compressed, { encoding: compressed.type });
                uploaded.push({ image: data.blob, alt: "Image" });
             }
             embed = { $type: 'app.bsky.embed.images', images: uploaded };
          }

          const record: any = {
            text: draft.text,
            embed,
            reply: root && parent ? { root, parent } : undefined,
            createdAt: new Date().toISOString(),
            langs: draft.languages.length > 0 ? draft.languages : undefined,
          };

          if (draft.labels.length > 0) {
            record.labels = { $type: 'com.atproto.label.defs#selfLabels', values: draft.labels.map(val => ({ val })) };
          }

          const res: any = await agent.post(record);
          
          if (!root) {
            root = { uri: res.uri, cid: res.cid };
            if (threadgate.length > 0) {
                const allow = threadgate.map(rule => ({ $type: `app.bsky.feed.threadgate#${rule}` }));
                await agent.com.atproto.repo.createRecord({
                    repo: session.did, collection: 'app.bsky.feed.threadgate',
                    record: { post: root.uri, createdAt: new Date().toISOString(), allow }
                });
            }
            if (disableQuotes) {
                await agent.com.atproto.repo.createRecord({
                    repo: session.did, collection: 'app.bsky.feed.postgate',
                    record: { post: root.uri, createdAt: new Date().toISOString(), detachedEmbeddingInputs: ['app.bsky.embed.record'] }
                });
            }
          }
          parent = { uri: res.uri, cid: res.cid };
        }
        setStatus('success');
        setPosts([{ text: '', images: [], labels: [], languages: ['ja'] }]);
        if (onPostCreated) onPostCreated();
      }
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border-color-dark)', background: 'var(--card-bg)' }}>
      <form onSubmit={handleSubmit}>
        {posts.map((draft, index) => (
          <div key={index} className="compose-box" style={{ borderBottom: index < posts.length - 1 ? '1px dashed var(--border-color)' : 'none', paddingBottom: 0 }}>
            <img src={avatar || 'https://via.placeholder.com/48'} className="avatar" alt="Me" style={{ width: 40, height: 40 }} />
            <div style={{ flex: 1 }}>
              <textarea
                value={draft.text}
                onChange={(e) => updateText(index, e.target.value)}
                placeholder={index === 0 ? "What's happening?" : "Add to thread..."}
                className="compose-input"
                style={{ minHeight: '80px', fontSize: '1.1rem' }}
              />
              
              {draft.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      {draft.images.map((img, imgIdx) => (
                          <div key={imgIdx} style={{ position: 'relative', height: 80, width: 80 }}>
                              <img src={URL.createObjectURL(img)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                              <button type="button" onClick={() => removeImage(index, imgIdx)} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          </div>
                      ))}
                  </div>
              )}
            </div>
            {posts.length > 1 && <button type="button" onClick={() => removePost(index)} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: 'var(--text-color-secondary)', cursor: 'pointer' }}>✕</button>}
          </div>
        ))}

        {/* Tools and Actions Bar */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
             {/* Image Upload Button */}
             <label style={{ cursor: 'pointer', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                📷
                <input type="file" accept="image/*" multiple onChange={(e) => handleImageSelect(posts.length - 1, e)} style={{ display: 'none' }} disabled={posts[posts.length - 1].images.length >= 4} />
             </label>

             {/* Mode Switcher */}
             <label style={{ cursor: 'pointer', color: mode === 'schedule' ? 'var(--primary-color)' : 'var(--text-color-secondary)', fontSize: '1.2rem' }} title="Schedule">
                ⏳
                <input type="checkbox" checked={mode === 'schedule'} onChange={(e) => setMode(e.target.checked ? 'schedule' : 'now')} style={{ display: 'none' }} />
             </label>

             <button type="button" onClick={addPost} style={{ border: 'none', background: 'none', color: 'var(--primary-color)', fontSize: '1.2rem', cursor: 'pointer' }} title="Add to thread">
                ➕
             </button>

             <button type="button" onClick={() => setShowOptions(!showOptions)} style={{ border: 'none', background: 'none', color: 'var(--text-color-secondary)', fontSize: '1rem', cursor: 'pointer' }}>
                ⚙️
             </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             {mode === 'schedule' && (
                 <input 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                    style={{ padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)', borderRadius: 4 }}
                 />
             )}
             <button type="submit" disabled={status === 'loading'} className="btn" style={{ backgroundColor: 'var(--primary-color)', color: '#fff', borderRadius: 9999, padding: '8px 20px', fontSize: '0.95rem' }}>
                {status === 'loading' ? 'Posting...' : (mode === 'schedule' ? 'Schedule' : 'Post')}
             </button>
          </div>
        </div>

        {/* Extended Options */}
        {showOptions && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--card-bg-secondary)', fontSize: '0.9rem' }}>
             <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Languages</div>
             <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                {LANGUAGES.map(lang => (
                   <label key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input type="checkbox" checked={posts[0].languages.includes(lang.code)} onChange={(e) => {
                          const newPosts = [...posts];
                          if (e.target.checked) newPosts.forEach(p => { if (!p.languages.includes(lang.code)) p.languages.push(lang.code) });
                          else newPosts.forEach(p => { p.languages = p.languages.filter(l => l !== lang.code) });
                          setPosts(newPosts);
                      }} />
                      {lang.label}
                   </label>
                ))}
             </div>
             
             <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Content Warnings</div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                {LABELS.map(lbl => (
                   <label key={lbl.val} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <input type="checkbox" checked={posts[0].labels.includes(lbl.val)} onChange={(e) => {
                          const newPosts = [...posts];
                          if (e.target.checked) newPosts.forEach(p => { if (!p.labels.includes(lbl.val)) p.labels.push(lbl.val) });
                          else newPosts.forEach(p => { p.labels = p.labels.filter(l => l !== lbl.val) });
                          setPosts(newPosts);
                      }} />
                      {lbl.label}
                   </label>
                ))}
             </div>

             <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Advanced</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', gap: 15 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>Who can reply?</span>
                    {['mention', 'follower', 'following'].map(rule => (
                      <label key={rule} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <input 
                          type="checkbox" 
                          value={rule}
                          checked={threadgate.includes(rule)}
                          onChange={(e) => {
                            if (e.target.checked) setThreadgate([...threadgate, rule]);
                            else setThreadgate(threadgate.filter(r => r !== rule));
                          }}
                        />
                        {rule.charAt(0).toUpperCase() + rule.slice(1)}s
                      </label>
                    ))}
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input 
                      type="checkbox" 
                      checked={disableQuotes}
                      onChange={(e) => setDisableQuotes(e.target.checked)}
                    />
                    Disable Quote Posts
                  </label>
                </div>
             </div>
          </div>
        )}
      </form>
      {status === 'success' && <div style={{ padding: '10px 20px', color: 'var(--success-color)' }}>Posted successfully!</div>}
      {errorMsg && <div style={{ padding: '10px 20px', color: 'var(--error-color)' }}>{errorMsg}</div>}
    </div>
  );
}