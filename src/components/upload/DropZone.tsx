'use client';

import { useState, useRef, DragEvent } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { useToast } from '@/components/ui/Toast';
import { Spinner } from '@/components/ui/Spinner';

export function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const sessionId = useImageStore((s) => s.sessionId);
  const addImages = useImageStore((s) => s.addImages);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setProgress(`Preparando ${fileArray.length} archivo${fileArray.length > 1 ? 's' : ''}...`);

    try {
      const formData = new FormData();
      formData.append('sessionId', sessionId);
      fileArray.forEach((f) => formData.append('files', f));

      // Simulate initial progress
      setUploadProgress(10);
      setProgress(`Subiendo ${fileArray.length} archivo${fileArray.length > 1 ? 's' : ''}...`);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 70) + 10; // 10-80%
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error('Error en el upload'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Error de red'));
        });
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);

      setUploadProgress(80);
      setProgress('Procesando metadatos...');

      const responseText = await uploadPromise;
      const data = JSON.parse(responseText);

      setUploadProgress(100);
      setProgress('¡Completado!');

      addImages(data.images);
      toast('success', `${data.images.length} imagen${data.images.length > 1 ? 'es' : ''} cargada${data.images.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast('error', 'Error al subir las imagenes');
      console.error(err);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress('');
        setUploadProgress(0);
      }, 500);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent GlobalDropZone from handling
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent GlobalDropZone from handling
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent GlobalDropZone from handling
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`
        w-full max-w-xl mx-auto cursor-pointer
        border-2 border-dashed rounded-2xl
        flex flex-col items-center justify-center gap-4
        p-8 sm:p-12
        min-h-[300px] sm:min-h-[400px]
        transition-all duration-200
        ${isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
        ${isUploading ? 'pointer-events-none opacity-75' : ''}
      `}
    >
      {isUploading ? (
        <div className="w-full max-w-sm space-y-4">
          <Spinner size="lg" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{progress}</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">
              Arrastra imagenes aqui
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              o toca para seleccionar archivos
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {['HEIC', 'JPG', 'PNG', 'WebP'].map((fmt) => (
              <span
                key={fmt}
                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                {fmt}
              </span>
            ))}
          </div>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/heic,image/heif,image/jpeg,image/png,image/webp,.heic,.heif"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}
