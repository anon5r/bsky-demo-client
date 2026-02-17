import { useState } from 'react';
import { Agent } from '@atproto/api';
import { PostCard } from './PostCard';
import { Modal } from './Modal';
import { PostForm } from './PostForm';

interface SearchProps {
  agent: Agent;
  onSelectActor: (did: string) => void;
  onSelectPost: (post: any) => void;
}

export function Search({ agent, onSelectActor, onSelectPost }: SearchProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [actors, setActors] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states for PostCard actions
  const [replyPost, setReplyPost] = useState<any>(null);
  const [quotePost, setQuotePost] = useState<any>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      if (activeTab === 'users') {
          const res = await agent.searchActors({ term: query, limit: 25 });
          setActors(res.data.actors);
          setPosts([]);
      } else {
          const res = await agent.app.bsky.feed.searchPosts({ q: query, limit: 25 });
          setPosts(res.data.posts);
          setActors([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Dummy or real implementations for PostCard actions in Search context
  // Since we don't have session passed here easily (though agent has session), we might need to extract session from agent if possible or pass it down.
  // Agent in App.tsx has (agent as any).session attached.
  const session = (agent as any).session; 

  async function deletePost(uri: string) {
      // Search results might not be own posts, but if they are...
      if (!confirm("Are you sure you want to delete this post?")) return;
      try {
         const rkey = uri.split('/').pop();
         await agent.com.atproto.repo.deleteRecord({
             repo: session.did,
             collection: 'app.bsky.feed.post',
             rkey: rkey!
         });
         setPosts(posts.filter(p => p.uri !== uri));
      } catch (e) {
          console.error("Failed to delete post", e);
          alert("Failed to delete post");
      }
  }

  async function toggleLike(post: any) {
      // Basic implementation without optimistic update on list for now
      // Search results don't always have full viewer context updated in real-time
      const cid = post.cid;
      const uri = post.uri;
      const likeUri = post.viewer?.like;

      try {
        if (likeUri) {
          const rkey = likeUri.split('/').pop();
          await agent.com.atproto.repo.deleteRecord({
              repo: session.did,
              collection: 'app.bsky.feed.like',
              rkey: rkey!
          });
          post.viewer.like = undefined;
          post.likeCount = (post.likeCount || 0) - 1;
        } else {
          const res = await agent.com.atproto.repo.createRecord({
              repo: session.did,
              collection: 'app.bsky.feed.like',
              record: {
                  subject: { uri, cid },
                  createdAt: new Date().toISOString()
              }
          });
          post.viewer.like = res.data.uri;
          post.likeCount = (post.likeCount || 0) + 1;
        }
        setPosts([...posts]);
      } catch (e) {
        console.error("Like failed", e);
      }
  }

  async function toggleRepost(post: any) {
      const cid = post.cid;
      const uri = post.uri;
      const repostUri = post.viewer?.repost;

      try {
        if (repostUri) {
          const rkey = repostUri.split('/').pop();
          await agent.com.atproto.repo.deleteRecord({
              repo: session.did,
              collection: 'app.bsky.feed.repost',
              rkey: rkey!
          });
          post.viewer.repost = undefined;
          post.repostCount = (post.repostCount || 0) - 1;
        } else {
          const res = await agent.com.atproto.repo.createRecord({
              repo: session.did,
              collection: 'app.bsky.feed.repost',
              record: {
                  subject: { uri, cid },
                  createdAt: new Date().toISOString()
              }
          });
          post.viewer.repost = res.data.uri;
          post.repostCount = (post.repostCount || 0) + 1;
        }
        setPosts([...posts]);
      } catch (e) {
        console.error("Repost failed", e);
      }
  }

  return (
    <div>
      <div style={{ padding: 20, borderBottom: '1px solid var(--border-color)' }}>
         <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
            <input 
               type="text" 
               value={query} 
               onChange={e => setQuery(e.target.value)} 
               placeholder={activeTab === 'users' ? "Search users..." : "Search posts..."}
               style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary" disabled={loading} style={{ width: 'auto' }}>
               {loading ? 'Searching...' : 'Search'}
            </button>
         </form>
         
         <div style={{ display: 'flex', marginTop: 16, gap: 20 }}>
             <button 
                className={`btn-ghost ${activeTab === 'users' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('users'); setActors([]); setPosts([]); }}
                style={{ fontWeight: activeTab === 'users' ? 'bold' : 'normal', borderBottom: activeTab === 'users' ? '2px solid var(--primary-color)' : 'none' }}
             >
                Users
             </button>
             <button 
                className={`btn-ghost ${activeTab === 'posts' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('posts'); setActors([]); setPosts([]); }}
                style={{ fontWeight: activeTab === 'posts' ? 'bold' : 'normal', borderBottom: activeTab === 'posts' ? '2px solid var(--primary-color)' : 'none' }}
             >
                Posts
             </button>
         </div>
      </div>

      <div>
         {activeTab === 'users' && actors.map(actor => (
            <div 
               key={actor.did} 
               className="post-card" 
               style={{ alignItems: 'center', cursor: 'pointer' }} 
               onClick={() => onSelectActor(actor.did)}
            >
               <img src={actor.avatar} className="avatar" style={{width: 48, height: 48}} />
               <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{actor.displayName || actor.handle}</div>
                  <div style={{ color: 'var(--text-color-secondary)' }}>@{actor.handle}</div>
                  {actor.description && <div style={{ fontSize: '0.9rem', marginTop: 5, color: 'var(--text-color)' }}>{actor.description}</div>}
               </div>
            </div>
         ))}

         {activeTab === 'posts' && posts.map(post => (
             <PostCard 
                 key={post.uri}
                 post={post}
                 currentDid={session?.did || ''}
                 onReply={() => setReplyPost(post)}
                 onQuote={() => setQuotePost(post)}
                 onDelete={deletePost}
                 onToggleLike={() => toggleLike(post)}
                 onToggleRepost={() => toggleRepost(post)}
                 onClick={onSelectPost}
             />
         ))}
      </div>

      {/* Modals for Post Actions */}
      <Modal isOpen={!!replyPost} onClose={() => setReplyPost(null)} title="Reply">
           {replyPost && (
               <PostForm 
                   agent={agent} 
                   session={session} 
                   replyTo={replyPost} 
                   onCancel={() => setReplyPost(null)}
                   onPostCreated={() => { setReplyPost(null); /* Could reload search but complex */ }}
               />
           )}
      </Modal>

      <Modal isOpen={!!quotePost} onClose={() => setQuotePost(null)} title="Quote Post">
           {quotePost && (
               <PostForm 
                   agent={agent} 
                   session={session} 
                   quotePost={quotePost} 
                   onCancel={() => setQuotePost(null)}
                   onPostCreated={() => { setQuotePost(null); /* Could reload */ }}
               />
           )}
      </Modal>
    </div>
  );
}
