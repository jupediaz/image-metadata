'use client';

import { useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { MetadataPanel } from '@/components/metadata/MetadataPanel';
import { MetadataEditor } from '@/components/metadata/MetadataEditor';
import { formatFileSize } from '@/lib/constants';
import { Button } from '@/components/ui/Button';

export function ImageDetail() {
  const images = useImageStore((s) => s.images);
  const activeImageId = useImageStore((s) => s.activeImageId);
  const setActiveImage = useImageStore((s) => s.setActiveImage);
  const sessionId = useImageStore((s) => s.sessionId);
  const [isEditing, setIsEditing] = useState(false);

  const image = images.find((img) => img.id === activeImageId);
  if (!image) return null;

  const currentIndex = images.findIndex((img) => img.id === activeImageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const ext = image.format === 'jpeg' ? '.jpg' : `.${image.format}`;

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Left: Image preview */}
      <div className="lg:w-1/2 xl:w-3/5">
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveImage(null)}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-h-[44px] px-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Volver
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
              {image.filename}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {image.width} x {image.height} &middot; {formatFileSize(image.size)} &middot; {image.format.toUpperCase()}
            </p>
          </div>

          {/* Nav arrows */}
          <div className="flex gap-1">
            <button
              disabled={!hasPrev}
              onClick={() => hasPrev && setActiveImage(images[currentIndex - 1].id)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              disabled={!hasNext}
              onClick={() => hasNext && setActiveImage(images[currentIndex + 1].id)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center min-h-[250px] sm:min-h-[400px]">
          <img
            src={`/api/image?sessionId=${sessionId}&id=${image.id}&ext=${ext}`}
            alt={image.filename}
            className="max-w-full max-h-[60vh] object-contain"
          />
        </div>

        {/* Action buttons mobile */}
        <div className="flex gap-2 p-4 lg:hidden">
          <Button
            variant={isEditing ? 'secondary' : 'primary'}
            size="sm"
            className="flex-1"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Ver metadata' : 'Editar metadata'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => downloadImage(sessionId, image.id, ext, image.filename)}>
            Descargar
          </Button>
        </div>
      </div>

      {/* Right: Metadata panel or editor */}
      <div className="lg:w-1/2 xl:w-2/5 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 overflow-y-auto lg:max-h-[calc(100dvh-60px)]">
        {/* Desktop edit toggle */}
        <div className="hidden lg:flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isEditing ? 'Editando' : 'Metadata'}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => downloadImage(sessionId, image.id, ext, image.filename)}>
              Descargar
            </Button>
          </div>
        </div>

        {isEditing ? (
          <MetadataEditor image={image} onClose={() => setIsEditing(false)} />
        ) : (
          <MetadataPanel image={image} />
        )}
      </div>
    </div>
  );
}

async function downloadImage(sessionId: string, imageId: string, ext: string, filename: string) {
  const res = await fetch(`/api/image?sessionId=${sessionId}&id=${imageId}&ext=${ext}`);
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
