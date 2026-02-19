import { useState, useEffect } from 'react';

interface ImageThumbnailProps {
  url: string;
  alt?: string;
  onClick?: () => void;
  fetchHandler?: (url: string, init?: RequestInit) => Promise<Response>;
  className?: string;
  style?: React.CSSProperties;
}

export function ImageThumbnail({ url, alt, onClick, fetchHandler, className, style }: ImageThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // blob: URL や通常のパブリックURLの場合はそのまま使用
    if (url.startsWith('blob:') || url.startsWith('data:') || !url.includes('api.chronosky.app')) {
      setSrc(url);
      setLoading(false);
      return;
    }

    // Chronosky API の blob エンドポイントの場合は認証付き fetch が必要
    if (!fetchHandler) {
      setError(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setLoading(true);
        const response = await fetchHandler(url);
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        
        if (isMounted) {
          setSrc(objectUrl);
          setError(false);
        }
      } catch (err) {
        console.error('Image fetch error:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, fetchHandler]);

  if (loading) {
    return (
      <div className={className} style={{ ...style, background: 'var(--bg-color-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--text-color-tertiary)' }}></i>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ ...style, background: 'var(--bg-color-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-image-slash" style={{ color: 'var(--text-color-tertiary)' }}></i>
      </div>
    );
  }

  return (
    <img 
      src={src || ''} 
      alt={alt} 
      onClick={onClick} 
      className={className} 
      style={{ ...style, objectFit: 'cover' }} 
    />
  );
}
