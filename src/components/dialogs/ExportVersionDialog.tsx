'use client';

import { useState } from 'react';
import { useProgress } from '@/hooks/useProgress';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EditVersion, ImageFile } from '@/types/image';

interface Props {
  open: boolean;
  onClose: () => void;
  version: EditVersion;
  originalImage: ImageFile;
  sessionId: string;
  targetFormat?: 'original' | 'jpg';
}

type ExportFormat = 'jpg' | 'heic';

export function ExportVersionDialog({ open, onClose, version, originalImage, sessionId, targetFormat }: Props) {
  const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();
  const { toast } = useToast();

  const originalFormat = originalImage.format.toLowerCase();

  // Determine initial format based on targetFormat prop
  const getInitialFormat = (): ExportFormat => {
    if (targetFormat === 'jpg') return 'jpg';
    if (targetFormat === 'original') {
      return originalFormat === 'heic' ? 'heic' : 'jpg';
    }
    return originalFormat === 'heic' ? 'heic' : 'jpg';
  };

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(getInitialFormat());
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const progressId = startProgress('export', `Exportando versión editada`);

    try {
      updateProgress(progressId, 10, 'Preparando exportación con calidad original...');

      // Use the new export-version API that preserves exact quality
      const exportRes = await fetch('/api/export-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          versionId: version.id,
          originalImageId: originalImage.id,
          originalFilename: originalImage.originalFilename,
          originalFormat: originalImage.format,
          originalWidth: originalImage.width,
          originalHeight: originalImage.height,
          originalFileSize: originalImage.originalFileSize,
          originalQuality: originalImage.originalQuality,
          targetFormat: selectedFormat,
          exifDump: version.originalExifDump,
        }),
      });

      if (!exportRes.ok) {
        const errorData = await exportRes.json();
        throw new Error(errorData.error || 'Export failed');
      }

      updateProgress(progressId, 70, 'Procesando imagen...');

      const finalBlob = await exportRes.blob();
      const finalExt = selectedFormat === 'heic' ? '.heic' : '.jpg';
      const baseName = originalImage.originalFilename.replace(/\.[^/.]+$/, '');
      const suggestedName = `${baseName}_updated${finalExt}`;

      updateProgress(progressId, 90, 'Guardando archivo...');

      // Try to use File System Access API for better UX
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName,
            types: [
              {
                description: selectedFormat === 'heic' ? 'HEIC Image' : 'JPEG Image',
                accept: {
                  [selectedFormat === 'heic' ? 'image/heic' : 'image/jpeg']: [finalExt],
                },
              },
            ],
          });

          const writable = await handle.createWritable();
          await writable.write(finalBlob);
          await writable.close();

          finishProgress(progressId);
          toast(
            'success',
            `✅ Exportado: ${suggestedName} con calidad idéntica a la original`
          );
          onClose();
          return;
        } catch {
          // User cancelled or API not supported, fallback to regular download
        }
      }

      // Fallback: Regular download
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      a.click();
      URL.revokeObjectURL(url);

      finishProgress(progressId);
      toast(
        'success',
        `✅ Exportado: ${suggestedName} con parámetros idénticos a la original`
      );
      onClose();
    } catch (err) {
      failProgress(progressId, err instanceof Error ? err.message : 'Error al exportar');
      toast('error', 'Error al exportar');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Exportar versión editada">
      <div className="space-y-4">
        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">🎯 Calidad idéntica a la original</p>
              <ul className="space-y-0.5 text-blue-700 dark:text-blue-300">
                <li>✓ Mismas dimensiones exactas ({originalImage.width}x{originalImage.height})</li>
                <li>✓ Mismo nivel de compresión y peso</li>
                <li>✓ EXIF completo (cámara, GPS, fechas)</li>
                <li>✓ Perfil de color y profundidad de bits</li>
                <li>✓ Nombre: {originalImage.originalFilename.replace(/\.[^/.]+$/, '')}_updated{selectedFormat === 'heic' ? '.heic' : '.jpg'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Version info */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {version.model?.includes('flash') ? 'Gemini 2.5 Flash' : 'Gemini 3 Pro'}
              </div>
              {version.processingTimeMs && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Generado en {(version.processingTimeMs / 1000).toFixed(1)}s
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(version.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Format selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Formato de exportación
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedFormat('jpg')}
              disabled={exporting}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[64px] ${
                selectedFormat === 'jpg'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>JPG</span>
                {originalFormat === 'jpeg' && (
                  <span className="text-xs opacity-75">(Original)</span>
                )}
              </div>
            </button>
            <button
              onClick={() => setSelectedFormat('heic')}
              disabled={exporting}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-all min-h-[64px] ${
                selectedFormat === 'heic'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span>HEIC</span>
                {originalFormat === 'heic' && (
                  <span className="text-xs opacity-75">(Original)</span>
                )}
              </div>
            </button>
          </div>
          {selectedFormat !== originalFormat && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Formato original: {originalFormat.toUpperCase()} → Conversión a{' '}
              {selectedFormat.toUpperCase()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Spinner size="sm" /> Exportando...
              </>
            ) : (
              '↓ Descargar'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
