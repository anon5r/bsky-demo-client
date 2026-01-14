import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { PostCard } from './PostCard';
import { Modal } from './Modal';
import { PostForm } from './PostForm';

interface ThreadViewProps {
  agent: Agent;
  uri: string;
  session: OAuthSession;
  onPostClick?: (post: any) => void;
}

export function ThreadView({ agent, uri, session, onPostClick }: ThreadViewProps) {
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [replyPost, setReplyPost] = useState<any>(null);
  const [quotePost, setQuotePost] = useState<any>(null);

  useEffect(() => {
    loadThread();
  }, [agent, uri]);

  async function loadThread() {
    setLoading(true);
    try {
      const res = await agent.getPostThread({ uri });
      setThread(res.data.thread);
    } catch (e) {
      console.error("Failed to load thread", e);
    } finally {
      setLoading(false);
    }
  }

  // Interaction handlers (duplicated from PostList for now)
  async function deletePost(uri: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
       await agent.deletePost(uri);
       // If main post deleted, maybe go back? For now just reload
       loadThread();
    } catch (e) { console.error(e); }
  }

  async function toggleLike(post: any) {
    const cid = post.cid;
    const uri = post.uri;
    const likeUri = post.viewer?.like;
    try {
      if (likeUri) {
        await agent.deleteLike(likeUri);
      } else {
        await agent.like(uri, cid);
      }
      loadThread(); // Refresh thread to show update
    } catch (e) { console.error(e); }
  }

  async function toggleRepost(post: any) {
    const cid = post.cid;
    const uri = post.uri;
    const repostUri = post.viewer?.repost;
    try {
      if (repostUri) {
        await agent.deleteRepost(repostUri);
      } else {
        await agent.repost(uri, cid);
      }
      loadThread();
    } catch (e) { console.error(e); }
  }

  function flattenParents(node: any): any[] {
      const parents = [];
      let curr = node.parent;
      while (curr) {
          if (curr.$type === 'app.bsky.feed.defs#threadViewPost') {
              parents.unshift(curr);
              curr = curr.parent;
          } else {
              // blocked or not found, maybe show a placeholder?
              break;
          }
      }
      return parents;
  }

  if (loading || !thread) return <div style={{padding: 20}}>Loading thread...</div>;
  if (thread.$type !== 'app.bsky.feed.defs#threadViewPost') return <div style={{padding: 20}}>Post not found or blocked.</div>;

  const parents = flattenParents(thread);

  return (
    <div>
       {/* Parents */}
       {parents.map(p => (
           <PostCard 
              key={p.post.uri}
              post={p.post}
              currentDid={session.sub}
              onReply={() => setReplyPost(p.post)}
              onQuote={() => setQuotePost(p.post)}
              onDelete={deletePost}
              onToggleLike={() => toggleLike(p.post)}
              onToggleRepost={() => toggleRepost(p.post)}
              onClick={() => onPostClick && onPostClick(p.post)}
           />
       ))}

       {/* Main Post */}
       <PostCard 
          post={thread.post}
          currentDid={session.sub}
          onReply={() => setReplyPost(thread.post)}
          onQuote={() => setQuotePost(thread.post)}
          onDelete={deletePost}
          onToggleLike={() => toggleLike(thread.post)}
          onToggleRepost={() => toggleRepost(thread.post)}
          isMain={true}
       />

       {/* Replies */}
       <div style={{ marginLeft: 0 }}>
          {thread.replies?.map((r: any) => {
             if (r.$type !== 'app.bsky.feed.defs#threadViewPost') return null;
             return (
                 <PostCard 
                    key={r.post.uri}
                    post={r.post}
                    currentDid={session.sub}
                    onReply={() => setReplyPost(r.post)}
                    onQuote={() => setQuotePost(r.post)}
                    onDelete={deletePost}
                    onToggleLike={() => toggleLike(r.post)}
                    onToggleRepost={() => toggleRepost(r.post)}
                    onClick={() => onPostClick && onPostClick(r.post)}
                 />
             );
          })}
       </div>

       <Modal isOpen={!!replyPost} onClose={() => setReplyPost(null)} title="Reply">
           {replyPost && (
               <PostForm agent={agent} session={session} replyTo={replyPost} onCancel={() => setReplyPost(null)} onPostCreated={() => { setReplyPost(null); loadThread(); }} />
           )}
       </Modal>
       <Modal isOpen={!!quotePost} onClose={() => setQuotePost(null)} title="Quote">
           {quotePost && (
               <PostForm agent={agent} session={session} quotePost={quotePost} onCancel={() => setQuotePost(null)} onPostCreated={() => { setQuotePost(null); loadThread(); }} />
           )}
       </Modal>
    </div>
  );
}
