'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface EventPhotoGalleryProps {
  photos: string[];
  title: string;
}

export function EventPhotoGallery({ photos, title }: EventPhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const isOpen = lightboxIndex !== null;

  useEffect(() => setMounted(true), []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % photos.length : null));
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + photos.length) % photos.length : null,
    );
  }, [photos.length]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') setLightboxIndex(null);
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, goNext, goPrev]);

  if (!photos.length) return null;

  const secondaryPhotos = photos.slice(1);

  const lightbox =
    isOpen && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
            onClick={() => setLightboxIndex(null)}
            role="dialog"
            aria-label="Photo gallery"
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Prev arrow — fixed left column */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Image — centered, with margins for arrows */}
            <div
              className="flex items-center justify-center px-20 py-16"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photos[lightboxIndex!]}
                alt={`${title} — photo ${lightboxIndex! + 1}`}
                className="max-h-[90vh] max-w-[calc(100vw-10rem)] object-contain"
              />
            </div>

            {/* Next arrow — fixed right column */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white">
                {lightboxIndex! + 1} / {photos.length}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="space-y-3">
        {/* Cover photo */}
        <button
          type="button"
          className="group relative w-full cursor-pointer overflow-hidden rounded-3xl shadow-sm"
          onClick={() => setLightboxIndex(0)}
        >
          <img
            src={photos[0]}
            alt={title}
            className="h-64 w-full object-contain bg-muted/50 transition-transform duration-500 group-hover:scale-[1.03] sm:h-96 md:h-[450px]"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
        </button>

        {/* Secondary photos */}
        {secondaryPhotos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {secondaryPhotos.map((photo, i) => (
              <button
                key={i}
                type="button"
                className="bg-muted group cursor-pointer overflow-hidden rounded-xl border-border/50 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => setLightboxIndex(i + 1)}
              >
                <img
                  src={photo}
                  alt=""
                  className="block h-24 w-32 object-cover transition-transform duration-500 group-hover:scale-[1.05] sm:h-32 sm:w-48"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox}
    </>
  );
}
