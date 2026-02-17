import { useState, useEffect, useRef, useCallback } from 'react';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { Modal } from './Modal';
import { PostForm } from './PostForm';
import { PostCard } from './PostCard';

interface PostListProps {
  agent: Agent;
  did: string; // Current user DID
  filter?: 'timeline' | 'author' | 'feed' | 'list';
  id?: string; // Target ID (DID for author, URI for feed/list)
  session: OAuthSession;
  onPostClick?: (post: any) => void;
}

export function PostList({ agent, did, filter = 'timeline', id, session, onPostClick }: PostListProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  
  // Language Filter State (Default: all)
  const [filterLangs, setFilterLangs] = useState<string[]>([]); // Empty means all

  // Modal states
  const [replyPost, setReplyPost] = useState<any>(null);
  const [quotePost, setQuotePost] = useState<any>(null);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadPosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  async function loadPosts(reset = false) {
    if (loading) return;
    setLoading(true);
    try {
      const currentCursor = reset ? undefined : cursor;
      let res;
      
      if (filter === 'author') {
          res = await agent.getAuthorFeed({ actor: id || did, limit: 30, cursor: currentCursor });
      } else if (filter === 'feed') {
          if (!id) throw new Error("Feed URI required");
          res = await agent.app.bsky.feed.getFeed({ feed: id, limit: 30, cursor: currentCursor });
      } else if (filter === 'list') {
          if (!id) throw new Error("List URI required");
          res = await agent.app.bsky.feed.getListFeed({ list: id, limit: 30, cursor: currentCursor });
      } else {
          res = await agent.getTimeline({ limit: 30, cursor: currentCursor });
      }
      
      const newPosts = res.data.feed;
      
      if (reset) {
          setPosts(newPosts);
      } else {
          setPosts(prev => [...prev, ...newPosts]);
      }
      
      setCursor(res.data.cursor);
      if (!res.data.cursor || newPosts.length === 0) {
          setHasMore(false);
      } else {
          setHasMore(true);
      }
    } catch (e) {
      console.error("Failed to load posts", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Reset and load when filter or id changes
    setCursor(undefined);
    setHasMore(true);
    loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filter]); // Intentionally excluding 'agent' to avoid re-renders if instance changes

  async function deletePost(uri: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
       const rkey = uri.split('/').pop();
       await agent.com.atproto.repo.deleteRecord({
           repo: session.sub,
           collection: 'app.bsky.feed.post',
           rkey: rkey!
       });
       setPosts(posts.filter(p => p.post.uri !== uri));
    } catch (e) {
        console.error("Failed to delete post", e);
        alert("Failed to delete post");
    }
  }

  async function toggleLike(item: any) {
    const cid = item.post.cid;
    const uri = item.post.uri;
    const likeUri = item.post.viewer?.like;

    try {
      // Optimistic update
      const newPosts = [...posts];
      const idx = newPosts.findIndex(p => p.post.uri === uri);
      if (idx === -1) return;

      if (likeUri) {
        newPosts[idx].post.viewer.like = undefined;
        newPosts[idx].post.likeCount = (newPosts[idx].post.likeCount || 0) - 1;
        setPosts(newPosts);

        const rkey = likeUri.split('/').pop();
        await agent.com.atproto.repo.deleteRecord({
            repo: session.sub,
            collection: 'app.bsky.feed.like',
            rkey: rkey!
        });
      } else {
        newPosts[idx].post.viewer.like = 'pending'; // Temporary
        newPosts[idx].post.likeCount = (newPosts[idx].post.likeCount || 0) + 1;
        setPosts(newPosts);

        const res = await agent.com.atproto.repo.createRecord({
            repo: session.sub,
            collection: 'app.bsky.feed.like',
            record: {
                subject: { uri, cid },
                createdAt: new Date().toISOString()
            }
        });
        
        // Update with real URI
        setPosts(prev => {
            const updateIdx = prev.findIndex(p => p.post.uri === uri);
            if (updateIdx === -1) return prev;
            const updated = [...prev];
            updated[updateIdx].post.viewer.like = res.data.uri;
            return updated;
        });
      }
    } catch (e) {
      console.error("Like failed", e);
      // Revert on error would be ideal here
      loadPosts(true); // Brute force sync
    }
  }

  async function toggleRepost(item: any) {
    const cid = item.post.cid;
    const uri = item.post.uri;
    const repostUri = item.post.viewer?.repost;

    try {
      // Optimistic update
      const newPosts = [...posts];
      const idx = newPosts.findIndex(p => p.post.uri === uri);
      if (idx === -1) return;

      if (repostUri) {
        newPosts[idx].post.viewer.repost = undefined;
        newPosts[idx].post.repostCount = (newPosts[idx].post.repostCount || 0) - 1;
        setPosts(newPosts);

        const rkey = repostUri.split('/').pop();
        await agent.com.atproto.repo.deleteRecord({
            repo: session.sub,
            collection: 'app.bsky.feed.repost',
            rkey: rkey!
        });
      } else {
        newPosts[idx].post.viewer.repost = 'pending';
        newPosts[idx].post.repostCount = (newPosts[idx].post.repostCount || 0) + 1;
        setPosts(newPosts);

        const res = await agent.com.atproto.repo.createRecord({
            repo: session.sub,
            collection: 'app.bsky.feed.repost',
            record: {
                subject: { uri, cid },
                createdAt: new Date().toISOString()
            }
        });

        setPosts(prev => {
            const updateIdx = prev.findIndex(p => p.post.uri === uri);
            if (updateIdx === -1) return prev;
            const updated = [...prev];
            updated[updateIdx].post.viewer.repost = res.data.uri;
            return updated;
        });
      }
    } catch (e) {
      console.error("Repost failed", e);
      loadPosts(true);
    }
  }

  // Filter posts client-side if langs are set
  // This is a naive implementation; ideal is server-side custom feed
  const visiblePosts = filterLangs.length > 0 
    ? posts.filter(p => {
        const langs = p.post.record?.langs;
        if (!langs) return true; // Show posts with no lang info
        return langs.some((l: string) => filterLangs.includes(l));
    }) 
    : posts;

  if (posts.length === 0 && loading) {
      return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>Loading...</div>;
  }

  if (posts.length === 0 && !loading) {
      return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>No posts found.</div>;
  }

  return (
    <div>
        {/* Simple Lang Filter Toggle for Demo */}
        <div style={{ padding: '0 16px', marginBottom: 10, display: 'flex', gap: 10, fontSize: '0.8rem' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <input 
                    type="checkbox" 
                    checked={filterLangs.includes('ja')} 
                    onChange={(e) => {
                        if (e.target.checked) setFilterLangs([...filterLangs, 'ja']);
                        else setFilterLangs(filterLangs.filter(l => l !== 'ja'));
                    }} 
                />
                Japanese Only
             </label>
             <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <input 
                    type="checkbox" 
                    checked={filterLangs.includes('en')} 
                    onChange={(e) => {
                        if (e.target.checked) setFilterLangs([...filterLangs, 'en']);
                        else setFilterLangs(filterLangs.filter(l => l !== 'en'));
                    }} 
                />
                English Only
             </label>
        </div>

        {visiblePosts.map((item, index) => {
            if (visiblePosts.length === index + 1) {
                return (
                    <div ref={lastPostElementRef} key={`${item.post.uri}-${index}`}>
                        <PostCard 
                            post={item.post}
                            reply={item.reply}
                            reason={item.reason}
                            currentDid={session.sub}
                            onReply={() => setReplyPost(item.post)}
                            onQuote={() => setQuotePost(item.post)}
                            onDelete={deletePost}
                            onToggleLike={() => toggleLike(item)}
                            onToggleRepost={() => toggleRepost(item)}
                            onClick={onPostClick}
                        />
                    </div>
                );
            } else {
                return (
                    <PostCard 
                       key={`${item.post.uri}-${index}`}
                       post={item.post}
                       reply={item.reply}
                       reason={item.reason}
                       currentDid={session.sub}
                       onReply={() => setReplyPost(item.post)}
                       onQuote={() => setQuotePost(item.post)}
                       onDelete={deletePost}
                       onToggleLike={() => toggleLike(item)}
                       onToggleRepost={() => toggleRepost(item)}
                       onClick={onPostClick}
                    />
                );
            }
        })}

        {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>Loading more...</div>}
        {!hasMore && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-tertiary)', fontSize: '0.9rem' }}>You've reached the end!</div>}

        {/* Reply Modal */}
        <Modal isOpen={!!replyPost} onClose={() => setReplyPost(null)} title="Reply">
           {replyPost && (
               <PostForm 
                   agent={agent} 
                   session={session} 
                   replyTo={replyPost} 
                   onCancel={() => setReplyPost(null)}
                   onPostCreated={() => { setReplyPost(null); loadPosts(true); }} // Reload to see reply
               />
           )}
        </Modal>

        {/* Quote Modal */}
        <Modal isOpen={!!quotePost} onClose={() => setQuotePost(null)} title="Quote Post">
           {quotePost && (
               <PostForm 
                   agent={agent} 
                   session={session} 
                   quotePost={quotePost} 
                   onCancel={() => setQuotePost(null)}
                   onPostCreated={() => { setQuotePost(null); loadPosts(true); }}
               />
           )}
        </Modal>
    </div>
  );
}
