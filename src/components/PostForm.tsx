import React, { useState } from 'react';
import { ChronoskyClient } from '../lib/chronosky-xrpc-client';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import imageCompression from 'browser-image-compression';

interface PostFormProps {
  agent: Agent;
  session: OAuthSession;
  onPostCreated?: () => void;
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

export function PostForm({ agent, session, onPostCreated }: PostFormProps) {
  const [posts, setPosts] = useState<PostDraft[]>([{ text: '', images: [], labels: [], languages: ['ja'] }]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [threadgate, setThreadgate] = useState<string[]>([]);
  const [disableQuotes, setDisableQuotes] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');

  const addPost = () => setPosts([...posts, { text: '', images: [], labels: [], languages: ['ja'] }]);
  const removePost = (index: number) => setPosts(posts.filter((_, i) => i !== index));
  
  const updateText = (index: number, text: string) => {
    const newPosts = [...posts];
    newPosts[index].text = text;
    setPosts(newPosts);
  };

  const updateLabels = (index: number, labelVal: string, checked: boolean) => {
    const newPosts = [...posts];
    if (checked) {
      newPosts[index].labels = [...newPosts[index].labels, labelVal];
    } else {
      newPosts[index].labels = newPosts[index].labels.filter(l => l !== labelVal);
    }
    setPosts(newPosts);
  };

  const updateLanguages = (index: number, langCode: string, checked: boolean) => {
    const newPosts = [...posts];
    if (checked) {
      if (!newPosts[index].languages.includes(langCode)) {
        newPosts[index].languages = [...newPosts[index].languages, langCode];
      }
    } else {
      newPosts[index].languages = newPosts[index].languages.filter(l => l !== langCode);
    }
    setPosts(newPosts);
  };

  const handleImageSelect = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      const currentImages = posts[index].images;
      
      if (currentImages.length + newImages.length > 4) {
        alert("You can only upload up to 4 images per post.");
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
    const options = {
      maxSizeMB: 0.9, 
      maxWidthOrHeight: 2000,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Image compression failed", error);
      throw error;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      if (mode === 'schedule') {
        // Chronosky Schedule
        const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));
        
        const threadPosts: any[] = [];
        
        for (const draft of posts) {
          if (!draft.text.trim() && draft.images.length === 0) continue;

          // Handle images for schedule
          let embed: any = undefined;
          if (draft.images.length > 0) {
            const uploaded: { alt: string; image: any }[] = [];
            for (const img of draft.images) {
              console.log(`Compressing image: ${img.name}`);
              const compressed = await compressImage(img);
              console.log(`Uploading blob, size: ${compressed.size}, type: ${compressed.type}`);
              
              if (!compressed.type) {
                  // Fallback or warning if type is missing
              }

              const uploadRes = await client.uploadBlob(compressed as Blob);
              console.log('Upload response:', uploadRes);

              if (!uploadRes || !uploadRes.blob) {
                  throw new Error("Failed to upload image: No blob returned");
              }

              uploaded.push({
                alt: "Image", 
                image: uploadRes.blob,
              });
            }
            embed = {
              $type: 'app.bsky.embed.images',
              images: uploaded
            };
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

        if (threadPosts.length === 0) {
            throw new Error("Cannot create empty post");
        }

        await client.createPost({
          posts: threadPosts,
          scheduledAt: new Date(scheduledAt).toISOString(),
          threadgateRules: threadgate.length > 0 ? threadgate as any : undefined,
          disableQuotePosts: disableQuotes
        });
        
        setStatus('success');
        setPosts([{ text: '', images: [], labels: [], languages: ['ja'] }]);
        setScheduledAt('');
        setThreadgate([]);
        setDisableQuotes(false);
        if (onPostCreated) onPostCreated();

      } else {
        // Post Now (Sequentially for threads)
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
                uploaded.push({
                    image: data.blob,
                    alt: "Image"
                });
             }
             embed = {
                 $type: 'app.bsky.embed.images',
                 images: uploaded
             };
          }

          const record: any = {
            text: draft.text,
            embed,
            reply: root && parent ? { root, parent } : undefined,
            createdAt: new Date().toISOString(),
            langs: draft.languages.length > 0 ? draft.languages : undefined,
          };

          if (draft.labels.length > 0) {
            record.labels = {
              $type: 'com.atproto.label.defs#selfLabels',
              values: draft.labels.map(val => ({ val }))
            };
          }

          const res: any = await agent.post(record);
          
          if (!root) {
            root = { uri: res.uri, cid: res.cid };
            
            // Apply Threadgate (Reply Control) to Root Post
            if (threadgate.length > 0) {
                const allow = threadgate.map(rule => ({
                    $type: `app.bsky.feed.threadgate#${rule}`
                }));
                // Use generic createRecord to ensure compatibility
                await agent.com.atproto.repo.createRecord({
                    repo: session.did,
                    collection: 'app.bsky.feed.threadgate',
                    record: {
                        post: root.uri,
                        createdAt: new Date().toISOString(),
                        allow
                    }
                });
            }

            // Apply Postgate (Disable Quotes) to Root Post
            if (disableQuotes) {
                await agent.com.atproto.repo.createRecord({
                    repo: session.did,
                    collection: 'app.bsky.feed.postgate',
                    record: {
                        post: root.uri,
                        createdAt: new Date().toISOString(),
                        detachedEmbeddingInputs: ['app.bsky.embed.record']
                    }
                });
            }
          }
          parent = { uri: res.uri, cid: res.cid };
        }
        
        setStatus('success');
        setPosts([{ text: '', images: [], labels: [], languages: ['ja'] }]);
        setThreadgate([]);
        setDisableQuotes(false);
        if (onPostCreated) onPostCreated();
      }
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      
      if (error.error === 'USER_NOT_REGISTERED') {
        setErrorMsg(
          <span>
            User is not registered in Chronosky. Please <a href="https://chronosky.app" target="_blank" rel="noopener noreferrer">sign up first</a>.
          </span>
        );
      } else {
        setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  return (
    <div className="card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input 
                type="radio" 
                name="mode" 
                value="schedule" 
                checked={mode === 'schedule'} 
                onChange={() => setMode('schedule')}
            /> Schedule (Chronosky)
        </label>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map((draft, index) => (
            <div key={index} style={{ position: 'relative', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px', background: 'var(--card-bg)' }}>
              <textarea
                value={draft.text}
                onChange={(e) => updateText(index, e.target.value)}
                placeholder={index === 0 ? "What's happening?" : "Add another post..."}
                rows={3}
                required={index === 0 && draft.images.length === 0} 
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '10px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
              />
              
              <div style={{ marginBottom: '10px' }}>
                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={(e) => handleImageSelect(index, e)}
                    disabled={draft.images.length >= 4}
                    style={{ background: 'var(--input-bg)', color: 'var(--text-color)' }}
                />
              </div>

              {draft.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {draft.images.map((img, imgIdx) => (
                          <div key={imgIdx} style={{ position: 'relative', width: '100px', height: '100px' }}>
                              <img 
                                  src={URL.createObjectURL(img)} 
                                  alt="Preview" 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} 
                              />
                              <button
                                  type="button"
                                  onClick={() => removeImage(index, imgIdx)}
                                  style={{
                                      position: 'absolute', top: 0, right: 0,
                                      background: 'rgba(0,0,0,0.5)', color: 'white',
                                      border: 'none', borderRadius: '50%',
                                      width: '20px', height: '20px', cursor: 'pointer',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '12px'
                                  }}
                              >
                                  ✕
                              </button>
                          </div>
                      ))}
                  </div>
              )}

              {/* Labels (Content Warning) */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <div style={{ fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-color-secondary)' }}>Content Warnings:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {LABELS.map(label => (
                    <label key={label.val} style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <input 
                        type="checkbox" 
                        checked={draft.labels.includes(label.val)}
                        onChange={(e) => updateLabels(index, label.val, e.target.checked)}
                      />
                      {label.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div style={{ paddingTop: '10px' }}>
                <div style={{ fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-color-secondary)' }}>Languages:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {LANGUAGES.map(lang => (
                    <label key={lang.code} style={{ fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <input 
                        type="checkbox" 
                        checked={draft.languages.includes(lang.code)}
                        onChange={(e) => updateLanguages(index, lang.code, e.target.checked)}
                      />
                      {lang.label}
                    </label>
                  ))}
                </div>
              </div>

              {posts.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removePost(index)}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: 'var(--error-bg)', border: '1px solid var(--error-color)', color: 'var(--error-color)', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '12px', padding: 0 }}
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
            style={{ background: 'var(--button-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '5px 10px', color: 'var(--button-text)' }}
          >
            + Add to Thread
          </button>
        </div>

        {/* Post Options (Shared) */}
        <div style={{ background: 'var(--card-bg-secondary)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--border-color-light)' }}>
            {mode === 'schedule' && (
                <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', fontWeight: 'bold' }}>Schedule Date:</label>
                <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    style={{ padding: '5px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                />
                </div>
            )}

            <div>
              <div style={{ fontSize: '0.9em', fontWeight: 'bold', marginBottom: '5px' }}>Reply Control (Threadgate):</div>
              <div style={{ display: 'flex', gap: '15px' }}>
                {['mention', 'follower', 'following'].map(rule => (
                  <label key={rule} style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
              {threadgate.length === 0 && <small style={{ color: 'var(--text-color-secondary)' }}>Everyone can reply</small>}
            </div>

            <div>
              <label style={{ fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                <input 
                  type="checkbox" 
                  checked={disableQuotes}
                  onChange={(e) => setDisableQuotes(e.target.checked)}
                />
                Disable Quote Posts
              </label>
            </div>
        </div>
        
        <button 
          type="submit" 
          disabled={status === 'loading'}
          className="login-btn"
          style={{ width: '100%', backgroundColor: 'var(--primary-color)', color: '#fff' }}
        >
          {status === 'loading' ? 'Processing...' : (mode === 'schedule' ? 'Schedule Post' : 'Post Now')}
        </button>
      </form>
      {status === 'success' && <p style={{ color: 'var(--success-color)', marginTop: '10px' }}>{mode === 'schedule' ? 'Post scheduled!' : 'Thread posted successfully!'}</p>}
      {status === 'error' && <p style={{ color: 'var(--error-color)', marginTop: '10px' }}>Error: {errorMsg}</p>}
    </div>
  );
}
