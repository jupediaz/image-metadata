'use client';

import { useState, DragEvent, useEffect } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { useToast } from '@/components/ui/Toast';

export function GlobalDropZone({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const sessionId = useImageStore((s) => s.sessionId);
  const addImages = useImageStore((s) => s.addImages);
  const view = useImageStore((s) => s.view);
  const { toast } = useToast();

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setIsDragging(false);

    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      files.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Error en el upload');
      }

      const data = await res.json();
      addImages(data.images);
      toast('success', `${data.images.length} imagen${data.images.length > 1 ? 'es' : ''} añadida${data.images.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast('error', 'Error al subir las imágenes');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only hide overlay if leaving the window
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif')
    );

    if (files.length > 0) {
      handleFiles(files);
    } else {
      toast('error', 'Solo se permiten archivos de imagen');
    }
  };

  // Prevent default drag behavior on the entire window
  useEffect(() => {
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  // Don't show overlay on upload view
  const showOverlay = isDragging && view !== 'upload';

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative h-full"
    >
      {children}

      {/* Global drag overlay */}
      {showOverlay && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border-4 border-dashed border-blue-500 pointer-events-none">
              <div className="flex flex-col items-center gap-4">
                <svg className="w-16 h-16 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-center">
                  <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Suelta para añadir imágenes
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Se añadirán a tu galería actual
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                Subiendo imágenes...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
