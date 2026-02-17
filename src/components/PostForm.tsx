import React, { useState, useEffect } from 'react';
import { ChronoskyClient } from '../lib/chronosky-xrpc-client';
import { Agent, RichText } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import imageCompression from 'browser-image-compression';
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import Link from '@tiptap/extension-link'
import { getMentionSuggestion } from '../lib/tiptap-extensions'

interface PostFormProps {
  agent: Agent;
  session: OAuthSession;
  onPostCreated?: () => void;
  defaultMode?: 'now' | 'schedule';
  replyTo?: any;
  quotePost?: any;
  onCancel?: () => void;
  initialData?: {
    text: string;
    scheduledAt?: string;
    images?: any[]; // existing blobs
    langs?: string[];
    labels?: string[];
    threadgate?: string[];
    disableQuotes?: boolean;
  };
  postId?: string; // If present, it's an update
}

const LABELS = [
  { val: 'sexual', label: 'Sexual' },
  { val: 'nudity', label: 'Nudity' },
  { val: 'porn', label: 'Porn' },
  { val: 'graphic-media', label: 'Graphic Media' },
];

const LANGUAGES = [
  { code: 'ja', label: 'Japanese' },
  { code: 'en', label: 'English' },
];

export function PostForm({ agent, session, onPostCreated, defaultMode = 'now', replyTo, quotePost, onCancel, initialData, postId }: PostFormProps) {
  const [images, setImages] = useState<{ file: File; alt: string }[]>([]);
  const [existingImages, setExistingImages] = useState<{ image: any; alt: string }[]>(initialData?.images?.map(img => ({ image: img.image || img, alt: img.alt || '' })) || []);
  const [labels, setLabels] = useState<string[]>(initialData?.labels || []);
  const [languages, setLanguages] = useState<string[]>(initialData?.langs || ['ja']);
  const [scheduledAt, setScheduledAt] = useState(initialData?.scheduledAt || '');
  const [threadgate, setThreadgate] = useState<string[]>(initialData?.threadgate || []);
  const [disableQuotes] = useState(initialData?.disableQuotes || false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [mode, setMode] = useState<'now' | 'schedule'>(defaultMode);
  const [showOptions, setShowOptions] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<{ type: 'new' | 'existing', index: number } | null>(null);

  useEffect(() => {
      agent.getProfile({ actor: session.did }).then(res => setAvatar(res.data.avatar || null)).catch(() => {});
  }, [agent, session.did]);

  const getBlobUrl = (cid: string) => {
      return `https://api.chronosky.app/blob/${session.sub}/${cid}`;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: replyTo ? 'Post your reply' : "What's happening?",
      }),
      Link.configure({
        openOnClick: false,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: getMentionSuggestion(agent),
      }),
    ],
    content: initialData?.text || '',
  })

  // Cleanup editor on unmount is handled by useEditor

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files).map(file => ({ file, alt: '' }));
      if (images.length + existingImages.length + newImages.length > 4) {
        alert("Max 4 images per post.");
        return;
      }
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (imgIndex: number) => {
    setImages(images.filter((_, i) => i !== imgIndex));
  };
  
  const removeExistingImage = (imgIndex: number) => {
      setExistingImages(existingImages.filter((_, i) => i !== imgIndex));
  };

  const updateAltText = (type: 'new' | 'existing', index: number, text: string) => {
      if (type === 'new') {
          const newImages = [...images];
          newImages[index].alt = text;
          setImages(newImages);
      } else {
          const newExisting = [...existingImages];
          newExisting[index].alt = text;
          setExistingImages(newExisting);
      }
  };

  async function compressImage(file: File): Promise<Blob> {
    const options = { maxSizeMB: 0.9, maxWidthOrHeight: 2000, useWebWorker: true };
    return await imageCompression(file, options);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editor) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const text = editor.getText(); // Get plain text (mentions will be @handle)
      
      if (!text.trim() && images.length === 0 && existingImages.length === 0 && !quotePost) {
          setStatus('idle');
          return;
      }

      // RichText Processing
      const rt = new RichText({ text });
      await rt.detectFacets(agent); // Detect mentions, links, tags

      let embed: any = undefined;
      const uploadedImages: any[] = [];

      if (images.length > 0 || existingImages.length > 0) {
         if (mode === 'schedule') {
             // Handled below
         } else {
             // Normal post
             for (const img of existingImages) {
                 uploadedImages.push({ image: img.image, alt: img.alt });
             }

             for (const img of images) {
                const compressed = await compressImage(img.file);
                const { data } = await agent.uploadBlob(compressed, { encoding: compressed.type });
                uploadedImages.push({ image: data.blob, alt: img.alt });
             }
             embed = { $type: 'app.bsky.embed.images', images: uploadedImages };
         }
      }

      // Handle Quote Embed
      if (quotePost) {
         const quoteEmbed = {
            $type: 'app.bsky.embed.record',
            record: {
               uri: quotePost.uri,
               cid: quotePost.cid
            }
         };

         if (embed) {
             embed = {
                 $type: 'app.bsky.embed.recordWithMedia',
                 media: embed,
                 record: quoteEmbed
             };
         } else {
             embed = quoteEmbed;
         }
      }

      if (mode === 'schedule') {
        const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));
        
        let scheduleEmbed: any = undefined;
        if (images.length > 0 || existingImages.length > 0) {
            const uploaded: { alt: string; image: any }[] = existingImages.map(img => ({ alt: img.alt, image: img.image }));
            
            for (const img of images) {
              const compressed = await compressImage(img.file);
              const uploadRes = await client.uploadBlob(compressed as Blob);
              if (!uploadRes || !uploadRes.blob) throw new Error("Failed to upload image");
              uploaded.push({ alt: img.alt, image: uploadRes.blob });
            }
            scheduleEmbed = { $type: 'app.bsky.embed.images', images: uploaded };
        }
        
        if (quotePost) {
             const quoteEmbed = {
                $type: 'app.bsky.embed.record',
                record: { uri: quotePost.uri, cid: quotePost.cid }
             };
             if (scheduleEmbed) {
                 scheduleEmbed = {
                     $type: 'app.bsky.embed.recordWithMedia',
                     media: scheduleEmbed,
                     record: quoteEmbed
                 };
             } else {
                 scheduleEmbed = quoteEmbed;
             }
        }

        const formattedLabels = labels.length > 0 ? {
            $type: 'com.atproto.label.defs#selfLabels' as const,
            values: labels.map(val => ({ val }))
        } : undefined;

        if (!scheduledAt) throw new Error("Please select a date/time.");

        let replyRef: any = undefined;
        if (replyTo) {
             const root = replyTo.record?.reply?.root || { uri: replyTo.uri, cid: replyTo.cid };
             const parent = { uri: replyTo.uri, cid: replyTo.cid };
             replyRef = { root, parent };
        }

        const threadgateRules = threadgate.length > 0 
            ? threadgate.map(rule => ({ $type: `app.bsky.feed.threadgate#${rule}Rule` as any })) 
            : undefined;

        if (postId) {
            // Update existing scheduled post
            await client.updatePost({
                id: postId,
                text: rt.text,
                facets: rt.facets,
                embed: scheduleEmbed,
                labels: formattedLabels,
                langs: languages.length > 0 ? languages : undefined,
                scheduledAt: new Date(scheduledAt).toISOString(),
            });
        } else {
            // Create new
            await client.createPost({
              posts: [{
                text: rt.text,
                facets: rt.facets,
                embed: scheduleEmbed,
                labels: formattedLabels,
                langs: languages.length > 0 ? languages : undefined,
                reply: replyRef
              }],
              scheduledAt: new Date(scheduledAt).toISOString(),
              threadgateRules: threadgateRules as any,
              disableQuotePosts: disableQuotes
            });
        }

      } else {
        // Post Now
        let root: { uri: string; cid: string } | undefined = undefined;
        let parent: { uri: string; cid: string } | undefined = undefined;
        
        if (replyTo) {
           const replyRoot = replyTo.record?.reply?.root || { uri: replyTo.uri, cid: replyTo.cid };
           root = replyRoot;
           parent = { uri: replyTo.uri, cid: replyTo.cid };
        }

        const record: any = {
            text: rt.text,
            facets: rt.facets,
            embed,
            reply: root && parent ? { root, parent } : undefined,
            createdAt: new Date().toISOString(),
            langs: languages.length > 0 ? languages : undefined,
        };

        if (labels.length > 0) {
           record.labels = { $type: 'com.atproto.label.defs#selfLabels' as const, values: labels.map(val => ({ val })) };
        }
        
        const res = await agent.com.atproto.repo.createRecord({
            repo: session.did,
            collection: 'app.bsky.feed.post',
            record
        });
        
        if (!replyTo) {
            const rootRef = { uri: res.data.uri, cid: res.data.cid };
            if (threadgate.length > 0) {
                const allow = threadgate.map(rule => ({ $type: `app.bsky.feed.threadgate#${rule}` }));
                await agent.com.atproto.repo.createRecord({
                    repo: session.did, collection: 'app.bsky.feed.threadgate',
                    record: { post: rootRef.uri, createdAt: new Date().toISOString(), allow }
                });
            }
            if (disableQuotes) {
                await agent.com.atproto.repo.createRecord({
                    repo: session.did, collection: 'app.bsky.feed.postgate',
                    record: { post: rootRef.uri, createdAt: new Date().toISOString(), detachedEmbeddingInputs: ['app.bsky.embed.record'] }
                });
            }
        }
      }

      setStatus('success');
      editor.commands.clearContent();
      setImages([]);
      setScheduledAt('');
      if (onPostCreated) onPostCreated();
      
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return (
    <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
      {replyTo && (
         <div style={{ padding: '8px 16px', color: 'var(--text-color-secondary)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
            <i className="fa-solid fa-reply"></i> Replying to <strong>@{replyTo.author?.handle}</strong>
         </div>
      )}

      <form onSubmit={handleSubmit}>
          <div className="compose-wrapper">
            <img src={avatar || 'https://via.placeholder.com/48'} className="avatar" alt="Me" style={{ width: 40, height: 40 }} />
            
            <div className="compose-content">
                <EditorContent editor={editor} />
                
                {/* Image Previews */}
                {(images.length > 0 || existingImages.length > 0) && (
                    <div className="image-preview-grid">
                        {existingImages.map((img, imgIdx) => {
                            const cid = img.image?.ref?.$link || img.image?.cid;
                            const url = cid ? getBlobUrl(cid) : null;
                            return (
                                <div key={`existing-${imgIdx}`} className="image-preview-item">
                                    {url ? (
                                        <img src={url} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-color-tertiary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
                                           Existing
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 4, background: 'rgba(0,0,0,0.5)' }}>
                                         <button type="button" className="btn-ghost" style={{ width: '100%', color: 'white', fontSize: '0.7rem', padding: 2 }} onClick={() => setEditingAlt({ type: 'existing', index: imgIdx })}>
                                            {img.alt ? 'Edit ALT' : '+ ALT'}
                                         </button>
                                    </div>
                                    <button type="button" onClick={() => removeExistingImage(imgIdx)} className="remove-image-btn">
                                      <i className="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            );
                        })}
                        {images.map((img, imgIdx) => (
                            <div key={`new-${imgIdx}`} className="image-preview-item">
                                <img src={URL.createObjectURL(img.file)} />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 4, background: 'rgba(0,0,0,0.5)' }}>
                                     <button type="button" className="btn-ghost" style={{ width: '100%', color: 'white', fontSize: '0.7rem', padding: 2 }} onClick={() => setEditingAlt({ type: 'new', index: imgIdx })}>
                                        {img.alt ? 'Edit ALT' : '+ ALT'}
                                     </button>
                                </div>
                                <button type="button" onClick={() => removeImage(imgIdx)} className="remove-image-btn">
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {/* ... (rest of the component) */}
                
                {/* ALT Text Editor Modal/Overlay */}
                {editingAlt && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'var(--card-bg)', padding: 20, borderRadius: 12, width: '90%', maxWidth: 400 }}>
                            <h3 style={{ marginTop: 0 }}>Description</h3>
                            <textarea 
                                autoFocus
                                value={editingAlt.type === 'new' ? images[editingAlt.index].alt : existingImages[editingAlt.index].alt}
                                onChange={(e) => updateAltText(editingAlt.type, editingAlt.index, e.target.value)}
                                style={{ width: '100%', height: 100, marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                                placeholder="Describe this image for visually impaired users..."
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button type="button" className="btn-primary" onClick={() => setEditingAlt(null)}>Done</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quote Preview */}
                {quotePost && (
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 10, margin: '10px 0', pointerEvents: 'none', opacity: 0.8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                            <img src={quotePost.author?.avatar} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                            <strong>{quotePost.author?.displayName}</strong>
                            <span style={{ color: 'var(--text-color-secondary)' }}>@{quotePost.author?.handle}</span>
                        </div>
                        <div>{quotePost.record?.text}</div>
                    </div>
                )}

                <div className="compose-footer">
                   <div className="compose-tools">
                        <label className="tool-btn" title="Media">
                            <i className="fa-regular fa-image"></i>
                            <input type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} disabled={images.length + existingImages.length >= 4} />
                        </label>

                        {!replyTo && !quotePost && !postId && (
                            <label className="tool-btn" style={{ color: mode === 'schedule' ? 'var(--primary-color)' : 'var(--primary-color)' }} title="Schedule">
                                <i className={`fa-regular ${mode === 'schedule' ? 'fa-clock' : 'fa-calendar'}`}></i>
                                <input type="checkbox" checked={mode === 'schedule'} onChange={(e) => setMode(e.target.checked ? 'schedule' : 'now')} style={{ display: 'none' }} />
                            </label>
                        )}

                        <button type="button" className="tool-btn" onClick={() => setShowOptions(!showOptions)} title="Settings">
                            <i className="fa-solid fa-gear"></i>
                        </button>
                   </div>
                   
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {onCancel && (
                             <button type="button" onClick={onCancel} className="btn-ghost" style={{ fontSize: '0.9rem', width: 'auto' }}>Cancel</button>
                        )}
                         
                        {mode === 'schedule' && (
                             <input 
                                type="datetime-local" 
                                value={scheduledAt} 
                                onChange={(e) => setScheduledAt(e.target.value)} 
                                style={{ 
                                    padding: '6px', 
                                    fontSize: '0.8rem', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: 4,
                                    background: 'var(--bg-color)',
                                    color: 'var(--text-color)'
                                }}
                             />
                        )}

                        <button 
                            type="submit" 
                            disabled={status === 'loading'} 
                            className="btn btn-primary" 
                            style={{ width: 'auto', height: 36, padding: '0 20px', fontSize: '0.95rem', margin: 0 }}
                        >
                            {status === 'loading' ? (postId ? 'Updating...' : 'Posting...') : (mode === 'schedule' ? (postId ? 'Update' : 'Schedule') : (replyTo ? 'Reply' : 'Post'))}
                        </button>
                   </div>
                </div>

                {/* Extended Options */}
                {showOptions && (
                  <div style={{ padding: '10px 0', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                     <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Languages</div>
                     <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        {LANGUAGES.map(lang => (
                           <label key={lang.code} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <input type="checkbox" checked={languages.includes(lang.code)} onChange={(e) => {
                                  if (e.target.checked) setLanguages([...languages, lang.code]);
                                  else setLanguages(languages.filter(l => l !== lang.code));
                              }} />
                              {lang.label}
                           </label>
                        ))}
                     </div>
                     
                     <div style={{ marginBottom: 5, fontWeight: 'bold' }}>Content Warnings</div>
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                        {LABELS.map(lbl => (
                           <label key={lbl.val} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <input type="checkbox" checked={labels.includes(lbl.val)} onChange={(e) => {
                                  if (e.target.checked) setLabels([...labels, lbl.val]);
                                  else setLabels(labels.filter(l => l !== lbl.val));
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
                     </div>
                  </div>
                )}
            </div>
          </div>
      </form>
      {status === 'success' && <div style={{ padding: '10px 20px', color: 'var(--success-color)' }}>Posted successfully!</div>}
      {errorMsg && <div style={{ padding: '10px 20px', color: 'var(--error-color)' }}>{errorMsg}</div>}
    </div>
  );
}