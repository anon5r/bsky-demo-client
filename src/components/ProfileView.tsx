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
  const [activeTab, setActiveTab] = useState('posts');

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

  if (loading || !profile) return <div style={{padding: 20, textAlign: 'center'}}>Loading profile...</div>;

  const isMe = session.sub === profile.did;

  return (
    <div>
       <div style={{ position: 'relative' }}>
          {/* Banner */}
          <div style={{ height: 150, overflow: 'hidden', background: 'var(--border-color-dark)' }}>
             {profile.banner && (
                <img src={profile.banner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             )}
          </div>
          
          <div style={{ padding: '0 16px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ marginTop: -40 }}>
                    <img 
                    src={profile.avatar} 
                    style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: '50%', 
                        border: '4px solid var(--bg-color)',
                        backgroundColor: 'var(--bg-color)'
                    }} 
                    />
                </div>
                
                {/* Action Button */}
                <div style={{ marginTop: 12 }}>
                    {!isMe ? (
                    <button 
                        className="btn" 
                        onClick={toggleFollow}
                        style={{ 
                            backgroundColor: profile.viewer?.following ? 'transparent' : 'var(--text-color)',
                            color: profile.viewer?.following ? 'var(--text-color)' : 'var(--bg-color)',
                            border: `1px solid ${profile.viewer?.following ? 'var(--border-color-dark)' : 'transparent'}`,
                            height: 36,
                            padding: '0 16px'
                        }}
                    >
                        {profile.viewer?.following ? 'Following' : 'Follow'}
                    </button>
                    ) : (
                    <button className="btn btn-secondary" style={{ height: 36, padding: '0 16px' }}>Edit Profile</button>
                    )}
                </div>
             </div>
             
             <div style={{ marginTop: 8 }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{profile.displayName || profile.handle}</h2>
                <div style={{ color: 'var(--text-color-secondary)' }}>@{profile.handle}</div>
             </div>
             
             {profile.description && (
                 <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                    {profile.description}
                 </div>
             )}

             <div style={{ marginTop: 12, display: 'flex', gap: 20, fontSize: '0.95rem' }}>
                <span style={{ cursor: 'pointer' }} onClick={() => onViewFollowing(profile.did)}>
                   <strong style={{ color: 'var(--text-color)' }}>{profile.followsCount}</strong> <span style={{ color: 'var(--text-color-secondary)' }}>Following</span>
                </span>
                <span style={{ cursor: 'pointer' }} onClick={() => onViewFollowers(profile.did)}>
                   <strong style={{ color: 'var(--text-color)' }}>{profile.followersCount}</strong> <span style={{ color: 'var(--text-color-secondary)' }}>Followers</span>
                </span>
             </div>
          </div>
       </div>

       {/* Tabs */}
       <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginTop: 16 }}>
           {['Posts', 'Replies', 'Media', 'Likes'].map(tab => {
               const key = tab.toLowerCase();
               const isActive = activeTab === key;
               return (
                   <div 
                     key={key}
                     onClick={() => setActiveTab(key)}
                     style={{ 
                         flex: 1, 
                         textAlign: 'center', 
                         padding: '16px 0', 
                         cursor: 'pointer',
                         fontWeight: isActive ? 700 : 500,
                         color: isActive ? 'var(--text-color)' : 'var(--text-color-secondary)',
                         borderBottom: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                         transition: 'background-color 0.2s'
                     }}
                     className="hover-bg"
                   >
                       {tab}
                   </div>
               );
           })}
       </div>

       <div>
          {activeTab === 'posts' && <PostList agent={agent} did={did} filter="author" session={session} />}
          {activeTab !== 'posts' && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-color-secondary)' }}>
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab is coming soon.
              </div>
          )}
       </div>
    </div>
  );
}

