import { useState, useEffect, useCallback } from 'react';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import imageCompression from 'browser-image-compression';
import { ChronoskyClient } from '../../lib/chronosky-xrpc-client';
import { CustomLink, CustomMention, Hashtag, Cashtag } from '../../lib/tiptap-extensions';
import { tiptapToRichText } from '../../lib/bluesky-richtext';

interface UsePostFormProps {
  agent: Agent;
  session: OAuthSession;
  onPostCreated?: () => void;
  defaultMode: 'now' | 'schedule';
  replyTo?: any;
  quotePost?: any;
  initialData?: any;
  postId?: string;
}

export function usePostForm({
  agent,
  session,
  onPostCreated,
  defaultMode,
  replyTo,
  quotePost,
  initialData,
  postId,
}: UsePostFormProps) {
  const [images, setImages] = useState<{ file: File; alt: string }[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>(
    initialData?.images?.map((img: any) => ({ 
      ...img,
      image: img.image || img, 
      alt: img.alt || '' 
    })) || []
  );
  const [labels, setLabels] = useState<string[]>(initialData?.labels || []);
  const [languages, setLanguages] = useState<string[]>(initialData?.langs || ['ja']);
  const [scheduledAt, setScheduledAt] = useState(initialData?.scheduledAt || '');
  const [threadgate, setThreadgate] = useState<string[]>(initialData?.threadgate || []);
  const [disableQuotes] = useState(initialData?.disableQuotes || false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [mode, setMode] = useState<'now' | 'schedule'>(defaultMode);
  const [showOptions, setShowOptions] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<{ type: 'new' | 'existing'; index: number } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    agent.getProfile({ actor: session.did }).then((res) => setAvatar(res.data.avatar || null)).catch(() => {});
  }, [agent, session.did]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: replyTo ? 'Post your reply' : "What's happening?",
      }),
      CustomLink,
      CustomMention(agent),
      Hashtag,
      Cashtag,
    ],
    content: initialData?.text || '',
  });

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files).map((file) => ({ file, alt: '' }));
      if (images.length + existingImages.length + newImages.length > 4) {
        alert('Max 4 images per post.');
        return;
      }
      setImages((prev) => [...prev, ...newImages]);
    }
  }, [images.length, existingImages.length]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingImage = useCallback((index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateAltText = useCallback((type: 'new' | 'existing', index: number, text: string) => {
    if (type === 'new') {
      setImages((prev) => {
        const next = [...prev];
        next[index].alt = text;
        return next;
      });
    } else {
      setExistingImages((prev) => {
        const next = [...prev];
        next[index].alt = text;
        return next;
      });
    }
  }, []);

  async function compressImage(file: File): Promise<Blob> {
    const options = { maxSizeMB: 0.9, maxWidthOrHeight: 2000, useWebWorker: true };
    return await imageCompression(file, options);
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editor) return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const rt = await tiptapToRichText(editor, agent);

      if (!rt.text.trim() && images.length === 0 && existingImages.length === 0 && !quotePost) {
        setStatus('idle');
        return;
      }

      // Validation for scheduling
      if (mode === 'schedule' && !scheduledAt) {
        throw new Error('Please select a date and time for scheduling.');
      }

      let embed: any = undefined;
      const uploadedImages: any[] = [];

      if (images.length > 0 || existingImages.length > 0) {
        if (mode !== 'schedule') {
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

      if (quotePost) {
        const quoteEmbed = {
          $type: 'app.bsky.embed.record',
          record: { uri: quotePost.uri, cid: quotePost.cid },
        };
        if (embed) {
          embed = { $type: 'app.bsky.embed.recordWithMedia', media: embed, record: quoteEmbed };
        } else {
          embed = quoteEmbed;
        }
      }

      if (mode === 'schedule') {
        const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));
        let scheduleEmbed: any = undefined;

        if (images.length > 0 || existingImages.length > 0) {
          const uploaded: { alt: string; image: any }[] = existingImages.map((img) => ({
            alt: img.alt,
            image: img.image,
          }));
          for (const img of images) {
            const compressed = await compressImage(img.file);
            const uploadRes = await client.uploadBlob(compressed as Blob);
            if (!uploadRes || !uploadRes.blob) throw new Error('Failed to upload image');
            uploaded.push({ alt: img.alt, image: uploadRes.blob });
          }
          scheduleEmbed = { $type: 'app.bsky.embed.images', images: uploaded };
        } else {
          scheduleEmbed = null; // Explicitly indicate no images
        }

        if (quotePost) {
          const quoteEmbed = {
            $type: 'app.bsky.embed.record',
            record: { uri: quotePost.uri, cid: quotePost.cid },
          };
          if (scheduleEmbed) {
            scheduleEmbed = {
              $type: 'app.bsky.embed.recordWithMedia',
              media: scheduleEmbed,
              record: quoteEmbed,
            };
          } else {
            scheduleEmbed = quoteEmbed;
          }
        }

        const formattedLabels =
          labels.length > 0
            ? {
                $type: 'com.atproto.label.defs#selfLabels' as const,
                values: labels.map((val) => ({ val })),
              }
            : undefined;

        let replyRef: any = undefined;
        if (replyTo) {
          const root = replyTo.record?.reply?.root || { uri: replyTo.uri, cid: replyTo.cid };
          const parent = { uri: replyTo.uri, cid: replyTo.cid };
          replyRef = { root, parent };
        }

        const threadgateRules =
          threadgate.length > 0
            ? threadgate.map((rule) => ({ $type: `app.bsky.feed.threadgate#${rule}Rule` as any }))
            : undefined;

        if (postId) {
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
          await client.createPost({
            posts: [
              {
                text: rt.text,
                facets: rt.facets,
                embed: scheduleEmbed,
                labels: formattedLabels,
                langs: languages.length > 0 ? languages : undefined,
                reply: replyRef,
              },
            ],
            scheduledAt: new Date(scheduledAt).toISOString(),
            threadgateRules: threadgateRules as any,
            disableQuotePosts: disableQuotes,
          });
        }
      } else {
        // Immediate post
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
          record.labels = {
            $type: 'com.atproto.label.defs#selfLabels' as const,
            values: labels.map((val) => ({ val })),
          };
        }

        const res = await agent.com.atproto.repo.createRecord({
          repo: session.did,
          collection: 'app.bsky.feed.post',
          record,
        });

        if (!replyTo) {
          const rootRef = { uri: res.data.uri, cid: res.data.cid };
          if (threadgate.length > 0) {
            const allow = threadgate.map((rule) => ({ $type: `app.bsky.feed.threadgate#${rule}` }));
            await agent.com.atproto.repo.createRecord({
              repo: session.did,
              collection: 'app.bsky.feed.threadgate',
              record: { post: rootRef.uri, createdAt: new Date().toISOString(), allow },
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
  };

  return {
    editor,
    images,
    existingImages,
    labels,
    setLabels,
    languages,
    setLanguages,
    scheduledAt,
    setScheduledAt,
    threadgate,
    setThreadgate,
    status,
    errorMsg,
    mode,
    setMode,
    showOptions,
    setShowOptions,
    avatar,
    editingAlt,
    setEditingAlt,
    previewImage,
    setPreviewImage,
    handleImageSelect,
    removeImage,
    removeExistingImage,
    updateAltText,
    handleSubmit,
  };
}
