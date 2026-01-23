import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';
import { PostList } from './PostList';
import { OAuthSession } from '@atproto/oauth-client-browser';

interface ProfileViewProps {
  agent: Agent;
  did: string;
  session: OAuthSession;
  onViewFollowers: (did: string) => void;
  onViewFollowing: (did: string) => void;
}

export function ProfileView({ agent, did, session, onViewFollowers, onViewFollowing }: ProfileViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [agent, did]);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await agent.getProfile({ actor: did });
      setProfile(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleFollow() {
    if (!profile) return;
    try {
      if (profile.viewer?.following) {
        const rkey = profile.viewer.following.split('/').pop();
        await agent.com.atproto.repo.deleteRecord({
            repo: session.sub,
            collection: 'app.bsky.graph.follow',
            rkey: rkey!
        });
        setProfile((prev: any) => ({
           ...prev, 
           viewer: { ...prev.viewer, following: undefined },
           followersCount: (prev.followersCount || 0) - 1
        }));
      } else {
        const res = await agent.com.atproto.repo.createRecord({
            repo: session.sub,
            collection: 'app.bsky.graph.follow',
            record: {
                subject: profile.did,
                createdAt: new Date().toISOString()
            }
        });
        setProfile((prev: any) => ({
           ...prev, 
           viewer: { ...prev.viewer, following: res.data.uri },
           followersCount: (prev.followersCount || 0) + 1
        }));
      }
    } catch (e) {
      console.error("Follow toggle failed", e);
    }
  }

  if (loading || !profile) return <div style={{padding: 20}}>Loading profile...</div>;

  const isMe = session.sub === profile.did;

  return (
    <div>
       <div style={{ position: 'relative' }}>
          {profile.banner ? (
             <img src={profile.banner} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
          ) : (
             <div style={{ width: '100%', height: 150, background: 'var(--primary-color)' }}></div>
          )}
          <div style={{ padding: '0 20px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -40, marginBottom: 10 }}>
                <img 
                   src={profile.avatar} 
                   style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid var(--card-bg)' }} 
                />
                {!isMe && (
                   <button 
                      className="btn" 
                      onClick={toggleFollow}
                      style={{ 
                         backgroundColor: profile.viewer?.following ? 'var(--card-bg)' : 'var(--text-color)',
                         color: profile.viewer?.following ? 'var(--text-color)' : 'var(--card-bg)',
                         border: '1px solid var(--border-color-dark)'
                      }}
                   >
                      {profile.viewer?.following ? 'Following' : 'Follow'}
                   </button>
                )}
                {isMe && (
                   <button className="btn btn-secondary">Edit Profile</button>
                )}
             </div>
             
             <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{profile.displayName || profile.handle}</h2>
             <div style={{ color: 'var(--text-color-secondary)' }}>@{profile.handle}</div>
             
             <div style={{ marginTop: 10, display: 'flex', gap: 20 }}>
                <span style={{ cursor: 'pointer' }} onClick={() => onViewFollowing(profile.did)}>
                   <strong>{profile.followsCount}</strong> <span style={{ color: 'var(--text-color-secondary)' }}>Following</span>
                </span>
                <span style={{ cursor: 'pointer' }} onClick={() => onViewFollowers(profile.did)}>
                   <strong>{profile.followersCount}</strong> <span style={{ color: 'var(--text-color-secondary)' }}>Followers</span>
                </span>
             </div>

             {profile.description && <div style={{ marginTop: 10, whiteSpace: 'pre-wrap' }}>{profile.description}</div>}
          </div>
       </div>

       <div style={{ marginTop: 20, borderTop: '1px solid var(--border-color)' }}>
          <PostList agent={agent} did={did} filter="author" session={session} />
       </div>
    </div>
  );
}
