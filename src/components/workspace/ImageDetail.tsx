'use client';

import { useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { MetadataPanel } from '@/components/metadata/MetadataPanel';
import { MetadataEditor } from '@/components/metadata/MetadataEditor';
import { formatFileSize } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';

const EditHistory = dynamic(() => import('@/components/editor/EditHistory'), {
  ssr: false
});

export function ImageDetail() {
  const images = useImageStore((s) => s.images);
  const activeImageId = useImageStore((s) => s.activeImageId);
  const setActiveImage = useImageStore((s) => s.setActiveImage);
  const sessionId = useImageStore((s) => s.sessionId);
  const startAiEdit = useImageStore((s) => s.startAiEdit);
  const revertToVersion = useImageStore((s) => s.revertToVersion);
  const removeImage = useImageStore((s) => s.removeImage);
  const [isEditing, setIsEditing] = useState(false);

  const image = images.find((img) => img.id === activeImageId);
  if (!image) return null;

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return;
    }

    try {
      const ext = image.format === 'jpeg' ? '.jpg' : `.${image.format}`;
      const res = await fetch(`/api/delete?sessionId=${sessionId}&id=${image.id}&ext=${ext}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        removeImage(image.id);
        setActiveImage(null);
      } else {
        alert('Error al eliminar la imagen');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error al eliminar la imagen');
    }
  };

  const currentIndex = images.findIndex((img) => img.id === activeImageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const ext = image.format === 'jpeg' ? '.jpg' : `.${image.format}`;

  // Determine which version to display
  const hasVersions = image.editHistory && image.editHistory.length > 0;
  const versionIndex = image.currentVersionIndex ?? -1;
  const currentVersion = hasVersions && versionIndex >= 0 ? image.editHistory![versionIndex] : null;

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

          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Eliminar imagen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
            <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <button
              disabled={!hasPrev}
              onClick={() => hasPrev && setActiveImage(images[currentIndex - 1].id)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Imagen anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              disabled={!hasNext}
              onClick={() => hasNext && setActiveImage(images[currentIndex + 1].id)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Imagen siguiente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center min-h-[250px] sm:min-h-[500px] lg:min-h-[600px]">
          <img
            src={currentVersion ? currentVersion.imageUrl : `/api/image?sessionId=${sessionId}&id=${image.id}&ext=${ext}`}
            alt={image.filename}
            className="max-w-full max-h-[70vh] lg:max-h-[80vh] w-auto h-auto object-contain"
          />
          {currentVersion && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-md">
              Versión {versionIndex + 1}
            </div>
          )}
        </div>

        {/* Action buttons mobile */}
        <div className="flex flex-col gap-2 p-4 lg:hidden">
          <Button
            variant="primary"
            size="sm"
            onClick={() => startAiEdit(image.id)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            ✨ Edit with AI
          </Button>
          <div className="flex gap-2">
            <Button
              variant={isEditing ? 'secondary' : 'primary'}
              size="sm"
              className="flex-1 inline-flex items-center justify-center gap-1.5"
              onClick={() => setIsEditing(!isEditing)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isEditing ? (
                  <>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </>
                ) : (
                  <>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </>
                )}
              </svg>
              {isEditing ? 'Ver metadata' : 'Editar metadata'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="inline-flex items-center justify-center gap-1.5"
              onClick={() => downloadImage(sessionId, image.id, ext, image.filename)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Descargar
            </Button>
          </div>
        </div>
      </div>

      {/* Right: Metadata panel or editor */}
      <div className="lg:w-1/2 xl:w-2/5 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 overflow-y-auto lg:max-h-[calc(100dvh-60px)]">
        {/* Desktop edit toggle */}
        <div className="hidden lg:flex flex-col gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800">
          <Button
            variant="primary"
            size="sm"
            onClick={() => startAiEdit(image.id)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            ✨ Edit with AI
          </Button>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isEditing ? 'Editando' : 'Metadata'}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => setIsEditing(!isEditing)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isEditing ? (
                    <path d="M18 6L6 18M6 6l12 12" />
                  ) : (
                    <>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </>
                  )}
                </svg>
                {isEditing ? 'Cancelar' : 'Editar'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => downloadImage(sessionId, image.id, ext, image.filename)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar
              </Button>
            </div>
          </div>
        </div>

        {isEditing ? (
          <MetadataEditor image={image} onClose={() => setIsEditing(false)} />
        ) : (
          <>
            <MetadataPanel image={image} />

            {/* Edit History */}
            {image.editHistory && image.editHistory.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                <EditHistory
                  versions={image.editHistory}
                  currentVersionIndex={image.currentVersionIndex}
                  onRevert={(index) => revertToVersion(image.id, index)}
                  sessionId={sessionId}
                />
              </div>
            )}
          </>
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
