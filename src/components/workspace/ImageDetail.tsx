'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import { MetadataPanel } from '@/components/metadata/MetadataPanel';
import { MetadataEditor } from '@/components/metadata/MetadataEditor';
import { formatFileSize } from '@/lib/constants';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';

const EditHistory = dynamic(() => import('@/components/editor/EditHistory'), {
  ssr: false
});

interface ImageDetailViewProps {
  imageId: string;
}

export function ImageDetailView({ imageId }: ImageDetailViewProps) {
  const router = useRouter();
  const images = useImageStore((s) => s.images);
  const sessionId = useImageStore((s) => s.sessionId);
  const revertToVersion = useImageStore((s) => s.revertToVersion);
  const deleteEditVersion = useImageStore((s) => s.deleteEditVersion);
  const removeImage = useImageStore((s) => s.removeImage);
  const updateMetadata = useImageStore((s) => s.updateMetadata);
  const setActiveImage = useImageStore((s) => s.setActiveImage);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'metadata' | 'history'>('metadata');

  const image = images.find((img) => img.id === imageId);

  // Auto-refresh metadata if it's empty (e.g. uploaded before extraction was enabled)
  useEffect(() => {
    if (!image || !sessionId) return;
    const meta = image.metadata;
    const isEmpty = !meta || (!meta.exif && !meta.gps && !meta.dates && !meta.iptc && Object.keys(meta.raw || {}).length === 0);
    if (!isEmpty) return;

    let cancelled = false;
    fetch(`/api/metadata?sessionId=${sessionId}&id=${image.id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data?.metadata) return;
        const m = data.metadata;
        const stillEmpty = !m.exif && !m.gps && !m.dates && !m.iptc && Object.keys(m.raw || {}).length === 0;
        if (!stillEmpty) {
          updateMetadata(image.id, m);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [image?.id, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!image) return null;

  const handleBack = () => {
    setActiveImage(null);
    router.push('/');
  };

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
        router.push('/');
      } else {
        alert('Error al eliminar la imagen');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error al eliminar la imagen');
    }
  };

  const handleEditWithAI = () => {
    router.push(`/image/${imageId}/edit`);
  };

  const currentIndex = images.findIndex((img) => img.id === imageId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const ext = image.format === 'jpeg' ? '.jpg' : `.${image.format}`;

  // Determine which version to display
  const hasVersions = image.editHistory && image.editHistory.length > 0;
  const versionIndex = image.currentVersionIndex ?? -1;
  const currentVersion = hasVersions && versionIndex >= 0 ? image.editHistory![versionIndex] : null;

  const navigateToImage = (id: string) => {
    setActiveImage(id);
    router.push(`/image/${id}`);
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col lg:flex-row">
        {/* Left: Image preview */}
        <div className="lg:w-3/4 xl:w-4/5">
          {/* Header bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-h-[44px] px-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Volver
            </button>

            {/* Edit and Download buttons - Over the image */}
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleEditWithAI}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 inline-flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
                Edit with AI
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="inline-flex items-center gap-1.5"
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

            <div className="flex-1 min-w-0 mx-4">
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
                onClick={() => hasPrev && navigateToImage(images[currentIndex - 1].id)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Imagen anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button
                disabled={!hasNext}
                onClick={() => hasNext && navigateToImage(images[currentIndex + 1].id)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Imagen siguiente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center min-h-[calc(100dvh-80px)]">
            <img
              src={currentVersion ? currentVersion.imageUrl : `/api/image?sessionId=${sessionId}&id=${image.id}&ext=${ext}`}
              alt={image.filename}
              className="max-w-full max-h-[calc(100dvh-80px)] w-auto h-auto object-contain"
            />
            {currentVersion && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-md">
                Versión {versionIndex + 1}
              </div>
            )}
          </div>
        </div>

        {/* Right: Metadata panel or editor */}
        <div className="lg:w-1/4 xl:w-1/5 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 flex flex-col lg:max-h-[calc(100dvh-60px)]">
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <button
              onClick={() => {
                setActiveTab('metadata');
                setIsEditing(false);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'metadata'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Metadata
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setIsEditing(false);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'history'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Historial
              {image.editHistory && image.editHistory.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
                  {image.editHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'metadata' ? (
              <>
                {/* Edit toggle for metadata tab */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {isEditing ? 'Editando metadatos' : 'Ver metadatos'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1.5 text-xs"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                </div>

                {isEditing ? (
                  <MetadataEditor image={image} onClose={() => setIsEditing(false)} />
                ) : (
                  <MetadataPanel image={image} />
                )}
              </>
            ) : (
              <>
                {/* History tab */}
                {image.editHistory && image.editHistory.length > 0 ? (
                  <div className="p-4">
                    <EditHistory
                      versions={image.editHistory}
                      currentVersionIndex={image.currentVersionIndex}
                      onRevert={(index) => revertToVersion(image.id, index)}
                      onDelete={(index) => {
                        if (confirm('¿Estás seguro de que quieres eliminar esta versión?')) {
                          deleteEditVersion(image.id, index);
                        }
                      }}
                      sessionId={sessionId}
                      imageId={image.id}
                      originalImage={image}
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      No hay historial de ediciones
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Edita la imagen con IA para crear versiones
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
