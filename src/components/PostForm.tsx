import React, { useState } from 'react';
import { ChronoskyClient, type BlobRef } from '../lib/chronosky-xrpc-client';
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
}

export function PostForm({ agent, session, onPostCreated }: PostFormProps) {
  const [posts, setPosts] = useState<PostDraft[]>([{ text: '', images: [] }]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');

  const addPost = () => setPosts([...posts, { text: '', images: [] }]);
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
      maxSizeMB: 0.9, // Slightly under 1MB to be safe
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
        if (posts.length > 1) {
            alert("Note: Only the first post will be scheduled. Thread scheduling is not yet supported.");
        }
        
        const draft = posts[0];
        const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));
        
        // Handle images for schedule
        const uploadedImages: { blob: BlobRef; alt?: string }[] = [];
        
        if (draft.images.length > 0) {
          for (const img of draft.images) {
             const compressed = await compressImage(img);
             const uploadRes = await client.uploadBlob(compressed);
             uploadedImages.push({
               blob: uploadRes.blob,
               alt: "Image" // TODO: Add alt text support
             });
          }
        }

        await client.createPost({
          text: draft.text,
          scheduledAt: new Date(scheduledAt).toISOString(),
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
        });
        
        setStatus('success');
        setPosts([{ text: '', images: [] }]);
        setScheduledAt('');
        if (onPostCreated) onPostCreated();

      } else {
        // Post Now (Sequentially for threads)
        let root: { uri: string; cid: string } | undefined = undefined;
        let parent: { uri: string; cid: string } | undefined = undefined;
        
        for (const draft of posts) {
          if (!draft.text.trim() && draft.images.length === 0) continue;
          
          // Handle images for immediate post
          let embed: any = undefined;
          if (draft.images.length > 0) {
             const uploaded = [];
             for (const img of draft.images) {
                const compressed = await compressImage(img);
                // Convert Blob to Uint8Array for agent.uploadBlob if needed?
                // Agent.uploadBlob takes Blob or Uint8Array.
                // However, agent.uploadBlob returns { data: { blob: ... } }
                const { data } = await agent.uploadBlob(compressed, { encoding: compressed.type });
                uploaded.push({
                    image: data.blob,
                    alt: "Image" // TODO: Add alt text support
                });
             }
             embed = {
                 $type: 'app.bsky.embed.images',
                 images: uploaded
             };
          }

          const res: any = await agent.post({
            text: draft.text,
            embed,
            reply: root && parent ? { root, parent } : undefined,
            createdAt: new Date().toISOString()
          });
          
          if (!root) {
            root = { uri: res.uri, cid: res.cid };
          }
          parent = { uri: res.uri, cid: res.cid };
        }
        
        setStatus('success');
        setPosts([{ text: '', images: [] }]);
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
            <div key={index} style={{ position: 'relative', border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
              <textarea
                value={draft.text}
                onChange={(e) => updateText(index, e.target.value)}
                placeholder={index === 0 ? "What's happening?" : "Add another post..."}
                rows={3}
                required={index === 0 && draft.images.length === 0} // Text required if no images (for first post)
                style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '10px' }}
              />
              
              <div style={{ marginBottom: '10px' }}>
                <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={(e) => handleImageSelect(index, e)}
                    disabled={draft.images.length >= 4}
                />
              </div>

              {draft.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
            disabled={mode === 'schedule'} 
            style={{ background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', padding: '5px 10px', cursor: mode === 'schedule' ? 'not-allowed' : 'pointer', opacity: mode === 'schedule' ? 0.5 : 1 }}
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
          {status === 'loading' ? 'Processing...' : (mode === 'schedule' ? 'Schedule Post' : 'Post Now')}
        </button>
      </form>
      {status === 'success' && <p style={{ color: 'green', marginTop: '10px' }}>{mode === 'schedule' ? 'Post scheduled!' : 'Thread posted successfully!'}</p>}
      {status === 'error' && <p style={{ color: 'red', marginTop: '10px' }}>Error: {errorMsg}</p>}
    </div>
  );
}