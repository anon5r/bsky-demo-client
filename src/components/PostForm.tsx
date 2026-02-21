import { Agent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { EditorContent } from '@tiptap/react';
import { usePostForm } from './post-form/usePostForm';
import { MediaUploader } from './post-form/MediaUploader';
import { PostOptions } from './post-form/PostOptions';
import { Modal } from './Modal';
import { ImageThumbnail } from './ImageThumbnail';

interface PostFormProps {
  agent: Agent;
  session: OAuthSession;
  onPostCreated?: () => void;
  defaultMode?: 'now' | 'schedule';
  replyTo?: any;
  quotePost?: any;
  onCancel?: () => void;
  initialData?: any;
  postId?: string;
}

export function PostForm({
  agent,
  session,
  onPostCreated,
  defaultMode = 'now',
  replyTo,
  quotePost,
  onCancel,
  initialData,
  postId,
}: PostFormProps) {
  const {
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
    previewAlt,
    setPreviewImage,
    handleImageSelect,
    removeImage,
    removeExistingImage,
    updateAltText,
    handleSubmit,
  } = usePostForm({
    agent,
    session,
    onPostCreated,
    defaultMode,
    replyTo,
    quotePost,
    initialData,
    postId,
  });

  const getBlobUrl = (cid: string) => {
    return `https://api.chronosky.app/blob/${session.sub}/${cid}`;
  };

  const getSubmitIcon = () => {
    if (status === 'loading') return <i className="fa-solid fa-spinner fa-spin"></i>;
    if (mode === 'schedule') return null; // Use text for schedule
    if (replyTo) return <i className="fa-solid fa-reply"></i>;
    if (postId) return <i className="fa-solid fa-check"></i>;
    return <i className="fa-solid fa-paper-plane"></i>;
  };

  const getSubmitText = () => {
    if (mode === 'schedule') {
        if (status === 'loading') return postId ? 'Updating...' : 'Scheduling...';
        return postId ? 'Update' : 'Schedule';
    }
    return '';
  };

  return (
    <div className="post-form-container" style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', position: 'relative' }}>
      
      {replyTo && (
        <div style={{ padding: '8px 16px', color: 'var(--text-color-secondary)', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)' }}>
          <i className="fa-solid fa-reply"></i> Replying to <strong>@{replyTo.author?.handle}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="compose-wrapper" style={{ padding: '12px 16px' }}>
          <img src={avatar || 'https://via.placeholder.com/48'} className="avatar" alt="Me" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          
          <div className="compose-content" style={{ flex: 1, marginLeft: 12 }}>
            <div className="editor-container" style={{ minHeight: 80, fontSize: '1.1rem' }}>
              <EditorContent editor={editor} />
            </div>
            
            <MediaUploader 
              images={images}
              existingImages={existingImages}
              onRemoveNew={removeImage}
              onRemoveExisting={removeExistingImage}
              onEditAlt={(type, index) => setEditingAlt({ type, index })}
              onPreview={(url, alt) => setPreviewImage(url, alt)}
              getBlobUrl={getBlobUrl}
              fetchHandler={(url, init) => session.fetchHandler(url, init)}
            />

            {quotePost && (
              <div className="quote-preview" style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 10, margin: '10px 0', opacity: 0.8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <img src={quotePost.author?.avatar} style={{ width: 20, height: 20, borderRadius: '50%' }} alt="" />
                  <strong style={{ fontSize: '0.9rem' }}>{quotePost.author?.displayName}</strong>
                  <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>@{quotePost.author?.handle}</span>
                </div>
                <div style={{ fontSize: '0.9rem' }}>{quotePost.record?.text}</div>
              </div>
            )}

            <div className="compose-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
              <div className="compose-tools" style={{ display: 'flex', gap: 15 }}>
                <label className="tool-btn" title="Media" style={{ cursor: 'pointer', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                  <i className="fa-regular fa-image"></i>
                  <input type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} disabled={images.length + existingImages.length >= 4} />
                </label>

                {!replyTo && !quotePost && !postId && (
                  <label className="tool-btn" title="Schedule" style={{ cursor: 'pointer', color: 'var(--primary-color)', fontSize: '1.2rem' }}>
                    <i className={`fa-regular ${mode === 'schedule' ? 'fa-clock' : 'fa-calendar'}`}></i>
                    <input type="checkbox" checked={mode === 'schedule'} onChange={(e) => setMode(e.target.checked ? 'schedule' : 'now')} style={{ display: 'none' }} />
                  </label>
                )}

                <button type="button" className="tool-btn" onClick={() => setShowOptions(!showOptions)} title="Settings" style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '1.2rem', padding: 0, cursor: 'pointer' }}>
                  <i className="fa-solid fa-gear"></i>
                </button>
              </div>
              
              <div className="compose-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {onCancel && (
                  <button type="button" onClick={onCancel} className="btn-ghost" title="Cancel" style={{ fontSize: '1.1rem', padding: '5px 10px' }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
                 
                {mode === 'schedule' && (
                  <input 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                    required
                    style={{ 
                      padding: '6px 10px', 
                      fontSize: '0.9rem', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 8,
                      background: 'var(--bg-color)',
                      color: 'var(--text-color)'
                    }}
                  />
                )}

                <button 
                  type="submit" 
                  disabled={status === 'loading'} 
                  className={`btn ${mode === 'schedule' ? 'btn-primary' : 'btn-icon-primary'}`}
                  title={mode === 'schedule' ? 'Schedule' : (replyTo ? 'Reply' : 'Post')}
                  style={{ 
                    minWidth: mode === 'schedule' ? 100 : 40,
                    height: 40,
                    borderRadius: mode === 'schedule' ? 20 : '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: mode === 'schedule' ? '0 20px' : 0
                  }}
                >
                  {getSubmitIcon()}
                  {getSubmitText()}
                </button>
              </div>
            </div>

            {showOptions && (
              <PostOptions 
                languages={languages}
                setLanguages={setLanguages}
                labels={labels}
                setLabels={setLabels}
                threadgate={threadgate}
                setThreadgate={setThreadgate}
              />
            )}
          </div>
        </div>
      </form>

      {/* ALT Text Editor Modal */}
      {editingAlt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg)', padding: 20, borderRadius: 16, width: '90%', maxWidth: 400, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 15 }}>Description</h3>
            <textarea 
              autoFocus
              value={editingAlt.type === 'new' ? images[editingAlt.index].alt : existingImages[editingAlt.index].alt}
              onChange={(e) => updateAltText(editingAlt.type, editingAlt.index, e.target.value)}
              style={{ width: '100%', height: 120, marginBottom: 15, padding: 12, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-color)', resize: 'none' }}
              placeholder="Describe this image for visually impaired users..."
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-primary" onClick={() => setEditingAlt(null)} style={{ borderRadius: 20, padding: '8px 20px' }}>
                <i className="fa-solid fa-check" style={{ marginRight: 8 }}></i> Done
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="status-msg success" style={{ position: 'absolute', bottom: -40, left: 0, right: 0, textAlign: 'center', color: 'var(--success-color)', padding: 10, background: 'var(--card-bg)', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <i className="fa-solid fa-circle-check"></i> Posted successfully!
        </div>
      )}
      {status === 'error' && (
        <div className="status-msg error" style={{ padding: '10px 16px', color: 'var(--error-color)', fontSize: '0.9rem', borderTop: '1px solid var(--border-color)' }}>
          <i className="fa-solid fa-circle-exclamation"></i> {errorMsg}
        </div>
      )}

      {previewImage && (
        <Modal isOpen={true} onClose={() => setPreviewImage(null, '')} title="Image Preview">
          <div style={{ textAlign: 'center', background: '#000', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
            <ImageThumbnail 
              url={previewImage} 
              alt={previewAlt || 'Preview'} 
              fetchHandler={(url, init) => session.fetchHandler(url, init)}
              style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block' }} 
            />
            {previewAlt && (
              <div style={{ 
                width: '100%', 
                padding: '16px', 
                background: 'rgba(255,255,255,0.05)', 
                color: 'white', 
                fontSize: '0.9rem', 
                textAlign: 'left',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                lineHeight: 1.5,
                maxHeight: '15vh',
                overflowY: 'auto'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase' }}>Alternative Text</div>
                {previewAlt}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
