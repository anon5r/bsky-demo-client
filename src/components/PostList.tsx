import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { Modal } from './Modal';
import { PostForm } from './PostForm';
import { PostCard } from './PostCard';

interface PostListProps {
  agent: Agent;
  did: string;
  filter?: 'timeline' | 'author';
  session: OAuthSession;
  onPostClick?: (post: any) => void;
}

export function PostList({ agent, did, filter = 'timeline', session, onPostClick }: PostListProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [replyPost, setReplyPost] = useState<any>(null);
  const [quotePost, setQuotePost] = useState<any>(null);

  async function loadPosts() {
    setLoading(true);
    try {
      let feed: any[] = [];
      if (filter === 'author') {
          const response = await agent.getAuthorFeed({ actor: did, limit: 50 });
          feed = response.data.feed;
      } else {
          const response = await agent.getTimeline({ limit: 50 });
          feed = response.data.feed;
      }
      setPosts(feed);
    } catch (e) {
      console.error("Failed to load posts", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (did) {
        loadPosts();
    }
  }, [agent, did, filter]);

  async function deletePost(uri: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
       await agent.deletePost(uri);
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
      if (likeUri) {
        await agent.deleteLike(likeUri);
        item.post.viewer.like = undefined;
        item.post.likeCount = (item.post.likeCount || 0) - 1;
      } else {
        const res = await agent.like(uri, cid);
        item.post.viewer.like = res.uri;
        item.post.likeCount = (item.post.likeCount || 0) + 1;
      }
      setPosts([...posts]);
    } catch (e) {
      console.error("Like failed", e);
    }
  }

  async function toggleRepost(item: any) {
    const cid = item.post.cid;
    const uri = item.post.uri;
    const repostUri = item.post.viewer?.repost;

    try {
      if (repostUri) {
        await agent.deleteRepost(repostUri);
        item.post.viewer.repost = undefined;
        item.post.repostCount = (item.post.repostCount || 0) - 1;
      } else {
        const res = await agent.repost(uri, cid);
        item.post.viewer.repost = res.uri;
        item.post.repostCount = (item.post.repostCount || 0) + 1;
      }
      setPosts([...posts]);
    } catch (e) {
      console.error("Repost failed", e);
    }
  }

  if (loading && posts.length === 0) {
      return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>Loading...</div>;
  }

  if (posts.length === 0 && !loading) {
      return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>No posts found.</div>;
  }

  return (
    <div>
        {posts.map((item) => (
            <PostCard 
               key={item.post.uri}
               post={item.post}
               reply={item.reply}
               currentDid={session.sub}
               onReply={() => setReplyPost(item.post)}
               onQuote={() => setQuotePost(item.post)}
               onDelete={deletePost}
               onToggleLike={() => toggleLike(item)}
               onToggleRepost={() => toggleRepost(item)}
               onClick={onPostClick}
            />
        ))}

        {/* Reply Modal */}
        <Modal isOpen={!!replyPost} onClose={() => setReplyPost(null)} title="Reply">
           {replyPost && (
               <PostForm 
                   agent={agent} 
                   session={session} 
                   replyTo={replyPost} 
                   onCancel={() => setReplyPost(null)}
                   onPostCreated={() => { setReplyPost(null); loadPosts(); }}
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
                   onPostCreated={() => { setQuotePost(null); loadPosts(); }}
               />
           )}
        </Modal>
    </div>
  );
}
