'use client';

import { useImageStore } from '@/hooks/useImageStore';
import { DropZone } from '@/components/upload/DropZone';
import { ImageWorkspace } from '@/components/workspace/ImageWorkspace';

export default function Home() {
  const view = useImageStore((s) => s.view);
  const images = useImageStore((s) => s.images);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Image Metadata Tool
          </h1>
          {images.length > 0 && view !== 'upload' && (
            <AddMoreButton />
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full">
        {view === 'upload' || images.length === 0 ? (
          <div className="p-4 flex items-center justify-center min-h-[calc(100dvh-60px)]">
            <DropZone />
          </div>
        ) : (
          <ImageWorkspace />
        )}
      </main>
    </div>
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
