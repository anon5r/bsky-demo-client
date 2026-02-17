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
  const [showMenu, setShowMenu] = useState(false);

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

  async function toggleMute() {
      try {
          if (profile.viewer?.muted) {
              await agent.app.bsky.graph.unmuteActor({ actor: profile.did });
              setProfile((prev: any) => ({ ...prev, viewer: { ...prev.viewer, muted: false } }));
          } else {
              await agent.app.bsky.graph.muteActor({ actor: profile.did });
              setProfile((prev: any) => ({ ...prev, viewer: { ...prev.viewer, muted: true } }));
          }
          setShowMenu(false);
      } catch (e) {
          console.error("Mute toggle failed", e);
      }
  }

  async function toggleBlock() {
      try {
          if (profile.viewer?.blocking) {
              const rkey = profile.viewer.blocking.split('/').pop();
              await agent.com.atproto.repo.deleteRecord({
                  repo: session.sub,
                  collection: 'app.bsky.graph.block',
                  rkey: rkey!
              });
              setProfile((prev: any) => ({ ...prev, viewer: { ...prev.viewer, blocking: undefined } }));
          } else {
              const res = await agent.com.atproto.repo.createRecord({
                  repo: session.sub,
                  collection: 'app.bsky.graph.block',
                  record: {
                      subject: profile.did,
                      createdAt: new Date().toISOString()
                  }
              });
              setProfile((prev: any) => ({ ...prev, viewer: { ...prev.viewer, blocking: res.data.uri } }));
          }
          setShowMenu(false);
      } catch (e) {
          console.error("Block toggle failed", e);
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
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                    {!isMe ? (
                    <>
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
                        
                        <div style={{ position: 'relative' }}>
                            <button className="btn-ghost" onClick={() => setShowMenu(!showMenu)} style={{ height: 36, width: 36, borderRadius: '50%', border: '1px solid var(--border-color)' }}>
                                <i className="fa-solid fa-ellipsis"></i>
                            </button>
                            {showMenu && (
                                <div style={{ position: 'absolute', right: 0, top: 40, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 5, minWidth: 150, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                    <button className="btn-ghost" onClick={toggleMute} style={{ width: '100%', textAlign: 'left', padding: '8px 12px' }}>
                                        {profile.viewer?.muted ? 'Unmute' : 'Mute'} @{profile.handle}
                                    </button>
                                    <button className="btn-ghost" onClick={toggleBlock} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', color: 'var(--error-color)' }}>
                                        {profile.viewer?.blocking ? 'Unblock' : 'Block'} @{profile.handle}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                    ) : (
                    <button className="btn btn-secondary" style={{ height: 36, padding: '0 16px' }}>Edit Profile</button>
                    )}
                </div>
             </div>
             
             <div style={{ marginTop: 8 }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-color)' }}>{profile.displayName || profile.handle}</h2>
                <div style={{ color: 'var(--text-color-secondary)' }}>@{profile.handle}</div>
             </div>
             
             {profile.description && (
                 <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.4, color: 'var(--text-color)' }}>
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
                     className={`tab-item ${isActive ? 'active' : ''}`}
                   >
                       {tab}
                   </div>
               );
           })}
       </div>

       <div>
          {activeTab === 'posts' && (
              <PostList 
                  agent={agent} 
                  did={session.sub} 
                  id={did} 
                  filter="author" 
                  session={session} 
              />
          )}
          {activeTab !== 'posts' && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-color-secondary)' }}>
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab is coming soon.
              </div>
          )}
       </div>
    </div>
  );
}

