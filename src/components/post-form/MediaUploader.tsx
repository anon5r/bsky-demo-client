interface MediaUploaderProps {
  images: { file: File; alt: string }[];
  existingImages: { image: any; alt: string }[];
  onRemoveNew: (index: number) => void;
  onRemoveExisting: (index: number) => void;
  onEditAlt: (type: 'new' | 'existing', index: number) => void;
  onPreview: (url: string) => void;
  getBlobUrl: (cid: string) => string;
}

export function MediaUploader({
  images,
  existingImages,
  onRemoveNew,
  onRemoveExisting,
  onEditAlt,
  onPreview,
  getBlobUrl,
}: MediaUploaderProps) {
  if (images.length === 0 && existingImages.length === 0) return null;

  return (
    <div className="image-preview-grid" style={{ marginTop: 12 }}>
      {existingImages.map((img, imgIdx) => {
        const cid = img.image?.ref?.$link || img.image?.cid;
        const url = cid ? getBlobUrl(cid) : null;
        return (
          <div key={`existing-${imgIdx}`} className="image-preview-item" style={{ cursor: 'zoom-in' }}>
            {url ? (
              <img src={url} alt={img.alt} onClick={() => onPreview(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--bg-color-tertiary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
                Existing
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 4, background: 'rgba(0,0,0,0.5)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <button type="button" className="btn-ghost" style={{ width: '100%', color: 'white', fontSize: '0.7rem', padding: 2 }} onClick={(e) => { e.stopPropagation(); onEditAlt('existing', imgIdx); }}>
                {img.alt ? 'Edit ALT' : '+ ALT'}
              </button>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveExisting(imgIdx); }} className="remove-image-btn">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        );
      })}
      {images.map((img, imgIdx) => {
        const url = URL.createObjectURL(img.file);
        return (
          <div key={`new-${imgIdx}`} className="image-preview-item" style={{ cursor: 'zoom-in' }}>
            <img src={url} alt={img.alt} onClick={() => onPreview(url)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 4, background: 'rgba(0,0,0,0.5)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <button type="button" className="btn-ghost" style={{ width: '100%', color: 'white', fontSize: '0.7rem', padding: 2 }} onClick={(e) => { e.stopPropagation(); onEditAlt('new', imgIdx); }}>
                {img.alt ? 'Edit ALT' : '+ ALT'}
              </button>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveNew(imgIdx); }} className="remove-image-btn">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}
