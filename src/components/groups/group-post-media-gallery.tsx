'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GroupPostMediaGalleryProps {
  images: { id: string; url: string }[];
  title: string;
}

export function GroupPostMediaGallery({ images, title }: GroupPostMediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isOpen = lightboxIndex !== null;

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') goNext();
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'Escape') setLightboxIndex(null);
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [goNext, goPrev, isOpen]);

  if (!images.length) return null;

  const gridClassName = images.length === 1
    ? 'grid-cols-1'
    : images.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-2 md:grid-cols-3';

  const lightbox = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-label="Post gallery"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <div className="flex items-center justify-center px-20 py-16" onClick={(event) => event.stopPropagation()}>
            <img
              src={images[lightboxIndex!].url}
              alt={`${title} image ${lightboxIndex! + 1}`}
              className="max-h-[90vh] max-w-[calc(100vw-10rem)] object-contain"
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className={`grid gap-2.5 ${gridClassName}`}>
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-muted"
            onClick={() => setLightboxIndex(index)}
          >
            <img
              src={image.url}
              alt=""
              className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
          </button>
        ))}
      </div>
      {lightbox}
    </>
  );
}
