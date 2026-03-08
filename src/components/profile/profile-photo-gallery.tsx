'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserPhoto } from '@/lib/actions/user-photos';

interface ProfilePhotoGalleryProps {
  photos: UserPhoto[];
  avatarUrl: string | null;
  displayName: string;
  isAvailable: boolean;
  availableLabel: string;
}

export function ProfilePhotoGallery({
  photos,
  avatarUrl,
  displayName,
  isAvailable,
  availableLabel,
}: ProfilePhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(() => {
    if (!avatarUrl) return 0;
    const idx = photos.findIndex((p) => p.url === avatarUrl);
    return idx >= 0 ? idx : 0;
  });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mainPhoto = photos[activeIndex];

  return (
    <>
      <div className="relative">
        {/* Main photo */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLightboxIndex(activeIndex)}
            className="group relative block h-40 w-40 overflow-hidden rounded-2xl border-4 border-background shadow-xl ring-1 ring-border/30 sm:h-48 sm:w-48"
          >
            <img
              src={mainPhoto.url}
              alt={displayName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {avatarUrl === mainPhoto.url && (
              <span className="absolute top-2 left-2 flex items-center gap-0.5 rounded-full bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-sm">
                <Star className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
          {isAvailable && (
            <span className="pointer-events-none absolute bottom-1 left-1/2 z-10 max-w-[calc(100%-12px)] -translate-x-1/2 truncate rounded-full bg-success px-2 py-0.5 text-[9px] font-semibold text-success-foreground shadow-md">
              {availableLabel}
            </span>
          )}
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'h-8 w-8 overflow-hidden rounded-lg border-2 transition-all',
                  idx === activeIndex
                    ? 'border-primary ring-1 ring-primary/30'
                    : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
                }}
                className="absolute left-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % photos.length);
                }}
                className="absolute right-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <img
            src={photos[lightboxIndex].url}
            alt={displayName}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {photos.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    idx === lightboxIndex ? 'w-6 bg-white' : 'bg-white/40 hover:bg-white/60',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
