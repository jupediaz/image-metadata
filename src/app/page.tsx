'use client';

import { useImageStore } from '@/hooks/useImageStore';
import { DropZone } from '@/components/upload/DropZone';
import { ImageWorkspace } from '@/components/workspace/ImageWorkspace';
import { GlobalDropZone } from '@/components/upload/GlobalDropZone';
import { clearAllData } from '@/lib/persistence';

export default function Home() {
  const images = useImageStore((s) => s.images);

  return (
    <GlobalDropZone>
      <div className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Image Metadata Tool
            </h1>
            <div className="flex items-center gap-2">
              {images.length > 0 && (
                <>
                  <ClearDataButton />
                  <AddMoreButton />
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full">
          {images.length === 0 ? (
            <div className="p-4 flex items-center justify-center min-h-[calc(100dvh-60px)]">
              <DropZone />
            </div>
          ) : (
            <ImageWorkspace />
          )}
        </main>
      </div>
    </GlobalDropZone>
  );
}

function AddMoreButton() {
  const sessionId = useImageStore((s) => s.sessionId);
  const addImages = useImageStore((s) => s.addImages);

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

  return (
    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors min-h-[44px]">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    if (!confirm('¿Eliminar todas las imágenes y datos guardados?')) return;
    await clearAllData();
    reset();
  };

  return (
    <button
      onClick={handleClear}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[44px]"
      title="Eliminar todos los datos"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}
