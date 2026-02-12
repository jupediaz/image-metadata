'use client';

import { useState, useEffect } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { DropZone } from '@/components/upload/DropZone';
import { ImageWorkspace } from '@/components/workspace/ImageWorkspace';
import { GlobalDropZone } from '@/components/upload/GlobalDropZone';
import { clearAllData } from '@/lib/persistence';

export default function Home() {
  const images = useImageStore((s) => s.images);
  const [userDismissed, setUserDismissed] = useState(false);

  // Modal shows when no images and user hasn't dismissed it
  const showUploadModal = images.length === 0 && !userDismissed;

  const openModal = () => setUserDismissed(false);
  const closeModal = () => setUserDismissed(true);

  // Escape to close modal
  useEffect(() => {
    if (!showUploadModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUploadModal]);

  return (
    <GlobalDropZone>
      <div className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Image Metadata Tool
            </h1>
            <div className="flex items-center gap-2">
              <AddMoreButton onOpen={openModal} />
              {images.length > 0 && <ClearDataButton />}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full">
          {images.length === 0 ? (
            <EmptyState onUpload={openModal} />
          ) : (
            <ImageWorkspace />
          )}
        </main>
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="relative">
            <button
              onClick={closeModal}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full shadow-lg transition-colors"
              title="Cerrar (Esc)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <DropZone />
          </div>
        </div>
      )}
    </GlobalDropZone>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-60px)] text-center p-8">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-1">
        No hay imagenes
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
        Sube imagenes para analizar sus metadatos y editarlas con IA
      </p>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Subir imagenes
      </button>
    </div>
  );
}

function AddMoreButton({ onOpen }: { onOpen: () => void }) {
  const sessionId = useImageStore((s) => s.sessionId);
  const addImages = useImageStore((s) => s.addImages);
  const images = useImageStore((s) => s.images);

  const handleFiles = async (files: FileList) => {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    Array.from(files).forEach((f) => formData.append('files', f));

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      addImages(data.images);
    }
  };

  if (images.length === 0) {
    return (
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Subir
      </button>
    );
  }

  return (
    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Añadir
      <input
        type="file"
        className="hidden"
        multiple
        accept="image/heic,image/heif,image/jpeg,image/png,image/webp"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </label>
  );
}

function ClearDataButton() {
  const reset = useImageStore((s) => s.reset);

  const handleClear = async () => {
    if (!confirm('¿Eliminar todas las imagenes y datos guardados?')) return;
    await clearAllData();
    reset();
  };

  return (
    <button
      onClick={handleClear}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[44px]"
      title="Eliminar todos los datos"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}
