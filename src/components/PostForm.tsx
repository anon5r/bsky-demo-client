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

export function PostForm({ agent, session, onPostCreated, defaultMode = 'now', replyTo, quotePost, onCancel }: PostFormProps) {
  const [images, setImages] = useState<File[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['ja']);
  const [scheduledAt, setScheduledAt] = useState('');
  const [threadgate, setThreadgate] = useState<string[]>([]);
  const [disableQuotes, setDisableQuotes] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [mode, setMode] = useState<'now' | 'schedule'>(defaultMode);
  const [showOptions, setShowOptions] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
      agent.getProfile({ actor: session.did }).then(res => setAvatar(res.data.avatar || null)).catch(() => {});
  }, [agent, session.did]);

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
    content: '',
  })

  // Cleanup editor on unmount is handled by useEditor

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      if (images.length + newImages.length > 4) {
        alert("Max 4 images per post.");
        return;
      }
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (imgIndex: number) => {
    setImages(images.filter((_, i) => i !== imgIndex));
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
      
      if (!text.trim() && images.length === 0 && !quotePost) {
          setStatus('idle');
          return;
      }

      // RichText Processing
      const rt = new RichText({ text });
      await rt.detectFacets(agent); // Detect mentions, links, tags

      let embed: any = undefined;
      let uploadedImages: any[] = [];

      if (images.length > 0) {
         // Upload images
         if (mode === 'schedule') {
             // For schedule, we use Chronosky's uploadBlob (via client later)
             // But the logic is slightly different.
             // We'll handle it inside the block below.
         } else {
             // Normal post
             for (const img of images) {
                const compressed = await compressImage(img);
                const { data } = await agent.uploadBlob(compressed, { encoding: compressed.type });
                uploadedImages.push({ image: data.blob, alt: "Image" });
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
        
        // Handle images for schedule (Chronosky upload)
        let scheduleEmbed: any = undefined;
        if (images.length > 0) {
            const uploaded: { alt: string; image: any }[] = [];
            for (const img of images) {
              const compressed = await compressImage(img);
              const uploadRes = await client.uploadBlob(compressed as Blob);
              if (!uploadRes || !uploadRes.blob) throw new Error("Failed to upload image");
              uploaded.push({ alt: "Image", image: uploadRes.blob });
            }
            scheduleEmbed = { $type: 'app.bsky.embed.images', images: uploaded };
        }
        // Quote in schedule? API might not support recordWithMedia fully yet or needs special structure.
        // For simplicity, if quotePost exists, we might skip or try to add it if API supports.
        // Guide says 'embed' field. So we can pass the same structure if compatible.
        // If we have both images and quote, we need recordWithMedia.
        // Let's assume Chronosky handles it if we pass the correct object.
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

        await client.createPost({
          posts: [{
            text: rt.text,
            facets: rt.facets,
            embed: scheduleEmbed,
            labels: formattedLabels,
            langs: languages.length > 0 ? languages : undefined,
          }],
          scheduledAt: new Date(scheduledAt).toISOString(),
          threadgateRules: threadgate.length > 0 ? threadgate as any : undefined,
          disableQuotePosts: disableQuotes
        });

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
        const res: any = await agent.post(record);
        
        // Threadgate / Postgate logic
        if (!replyTo) { // Only for root posts
            const rootRef = { uri: res.uri, cid: res.cid };
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
    <div style={{ borderBottom: '1px solid var(--border-color-dark)', background: 'var(--card-bg)' }}>
      {replyTo && (
         <div style={{ padding: '10px 20px', color: 'var(--text-color-secondary)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
            <i className="fa-solid fa-reply"></i> Replying to <strong>@{replyTo.author?.handle}</strong>
         </div>
      )}

      <form onSubmit={handleSubmit}>
          <div className="compose-box" style={{ flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 12 }}>
                <img src={avatar || 'https://via.placeholder.com/48'} className="avatar" alt="Me" style={{ width: 40, height: 40 }} />
                <div style={{ flex: 1, border: '1px solid transparent' }}>
                    <EditorContent editor={editor} />
                </div>
            </div>
            
            {/* Image Previews */}
            {images.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingLeft: 52 }}>
                    {images.map((img, imgIdx) => (
                        <div key={imgIdx} style={{ position: 'relative', height: 80, width: 80 }}>
                            <img src={URL.createObjectURL(img)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                            <button type="button" onClick={() => removeImage(imgIdx)} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Quote Preview */}
            {quotePost && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 10, margin: '10px 0 0 52px', pointerEvents: 'none', opacity: 0.8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                        <img src={quotePost.author?.avatar} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                        <strong>{quotePost.author?.displayName}</strong>
                        <span style={{ color: 'var(--text-color-secondary)' }}>@{quotePost.author?.handle}</span>
                    </div>
                    <div>{quotePost.record?.text}</div>
                </div>
            )}
          </div>

        {/* Tools and Actions Bar */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
             {/* Image Upload Button */}
             <label style={{ cursor: 'pointer', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                <i className="fa-regular fa-image"></i>
                <input type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} disabled={images.length >= 4} />
             </label>

             {/* Mode Switcher */}
             {!replyTo && !quotePost && (
                <label style={{ cursor: 'pointer', color: mode === 'schedule' ? 'var(--primary-color)' : 'var(--text-color-secondary)', fontSize: '1.2rem' }} title="Schedule">
                    <i className="fa-regular fa-clock"></i>
                    <input type="checkbox" checked={mode === 'schedule'} onChange={(e) => setMode(e.target.checked ? 'schedule' : 'now')} style={{ display: 'none' }} />
                </label>
             )}

             <button type="button" onClick={() => setShowOptions(!showOptions)} style={{ border: 'none', background: 'none', color: 'var(--text-color-secondary)', fontSize: '1rem', cursor: 'pointer' }}>
                <i className="fa-solid fa-gear"></i>
             </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             {onCancel && (
                 <button type="button" onClick={onCancel} className="btn-ghost" style={{ fontSize: '0.9rem' }}>Cancel</button>
             )}
             
             {mode === 'schedule' && (
                 <input 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                    style={{ padding: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)', borderRadius: 4 }}
                 />
             )}
             <button type="submit" disabled={status === 'loading'} className="btn" style={{ backgroundColor: 'var(--primary-color)', color: '#fff', borderRadius: 9999, padding: '8px 20px', fontSize: '0.95rem' }}>
                {status === 'loading' ? 'Posting...' : (mode === 'schedule' ? 'Schedule' : (replyTo ? 'Reply' : 'Post'))}
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