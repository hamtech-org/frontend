import React, { useState } from 'react';
import { MediaLightbox } from './MediaLightbox';

interface Props {
  mediaUrls: string[];
}

const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);

const MediaItem = ({
  url,
  onClick,
  className = '',
  overlay,
}: {
  url: string;
  onClick: () => void;
  className?: string;
  overlay?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative block w-full h-full overflow-hidden group cursor-pointer min-h-0 min-w-0 ${className}`}
  >
    {isVideo(url) ? (
      <video
        src={url}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
      />
    ) : (
      <img
        src={url}
        alt="Post media"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        referrerPolicy="no-referrer"
        draggable={false}
      />
    )}
    {overlay}
  </button>
);

export const MediaGallery: React.FC<Props> = ({ mediaUrls }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const count = mediaUrls.length;
  const remaining = count > 4 ? count - 4 : 0;

  return (
    <>
      {count === 1 && (
        <div className="relative overflow-hidden w-full bg-muted/20 rounded-xl max-h-[600px] flex items-center justify-center">
          <MediaItem
            url={mediaUrls[0]}
            onClick={() => setLightboxIndex(0)}
            className="w-full h-auto max-h-[600px]"
          />
        </div>
      )}

      {count === 2 && (
        <div className="grid grid-cols-2 gap-0.5 w-full aspect-[4/3] sm:aspect-[3/2] overflow-hidden rounded-xl">
          <MediaItem url={mediaUrls[0]} onClick={() => setLightboxIndex(0)} />
          <MediaItem url={mediaUrls[1]} onClick={() => setLightboxIndex(1)} />
        </div>
      )}

      {count === 3 && (
        <div className="grid grid-cols-2 gap-0.5 w-full aspect-[4/3] sm:aspect-[3/2] overflow-hidden rounded-xl">
          <MediaItem url={mediaUrls[0]} onClick={() => setLightboxIndex(0)} />
          <div className="grid grid-rows-2 gap-0.5 h-full min-h-0 min-w-0">
            <MediaItem url={mediaUrls[1]} onClick={() => setLightboxIndex(1)} />
            <MediaItem url={mediaUrls[2]} onClick={() => setLightboxIndex(2)} />
          </div>
        </div>
      )}

      {count >= 4 && (
        <div className="grid grid-cols-2 gap-0.5 w-full aspect-[4/3] sm:aspect-[3/2] overflow-hidden rounded-xl">
          <MediaItem url={mediaUrls[0]} onClick={() => setLightboxIndex(0)} />
          <div className="grid grid-rows-3 gap-0.5 h-full min-h-0 min-w-0">
            <MediaItem url={mediaUrls[1]} onClick={() => setLightboxIndex(1)} />
            <MediaItem url={mediaUrls[2]} onClick={() => setLightboxIndex(2)} />
            <MediaItem
              url={mediaUrls[3]}
              onClick={() => setLightboxIndex(3)}
              overlay={
                remaining > 0 ? (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center group-hover:bg-black/60 transition-colors">
                    <span className="text-white text-2xl font-bold">+{remaining}</span>
                  </div>
                ) : undefined
              }
            />
          </div>
        </div>
      )}

      {lightboxIndex !== null && (
        <MediaLightbox
          mediaUrls={mediaUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
