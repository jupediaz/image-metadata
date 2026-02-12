'use client';

import { useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { useProgress } from '@/hooks/useProgress';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ open, onClose }: Props) {
  const selectedIds = useImageStore((s) => s.selectedIds);
  const images = useImageStore((s) => s.images);
  const sessionId = useImageStore((s) => s.sessionId);
  const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();
  const { toast } = useToast();

  const [stripMetadata, setStripMetadata] = useState(false);
  const [exporting, setExporting] = useState(false);

  const selectedImages = images.filter(img => selectedIds.has(img.id));

  const handleExport = async () => {
    setExporting(true);
    const progressId = startProgress(
      'export',
      `Exportando ${selectedIds.size} imagen${selectedIds.size > 1 ? 'es' : ''}`,
      selectedIds.size
    );

    try {
      updateProgress(progressId, 10, 'Preparando exportación...');

      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          imageIds: Array.from(selectedIds),
          stripMetadata,
        }),
      });

      if (!res.ok) throw new Error('Error exportando');

      updateProgress(progressId, 50, 'Generando archivo...');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');

      // Use original filename if single image
      let filename: string;
      if (disposition) {
        filename = disposition.split('filename=')[1]?.replace(/"/g, '') || 'imagenes.zip';
      } else if (selectedIds.size === 1) {
        const singleImage = selectedImages[0];
        filename = singleImage?.filename || 'imagen.jpg';
      } else {
        filename = 'imagenes.zip';
      }

      updateProgress(progressId, 90, 'Descargando...');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      finishProgress(progressId);

      const successMsg = stripMetadata
        ? `Exportación completada (metadata eliminada)`
        : `Exportación completada - Formato y metadata originales mantenidos`;

      toast('success', successMsg);
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
    <Modal open={open} onClose={onClose} title="Exportar imágenes">
      <div className="space-y-4">
        {/* Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Exportación 1:1 - Todo se mantiene original</p>
              <ul className="space-y-0.5 text-blue-700 dark:text-blue-300">
                <li>✓ Formato original ({selectedImages.map(img => img.format.toUpperCase()).join(', ')})</li>
                <li>✓ Metadata completa (EXIF, GPS, IPTC, XMP)</li>
                <li>✓ Fechas y horas de captura</li>
                <li>✓ Ubicación y coordenadas GPS</li>
                <li>✓ Información de cámara y configuración</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedIds.size} imagen{selectedIds.size > 1 ? 'es' : ''} seleccionada{selectedIds.size > 1 ? 's' : ''}
        </p>

        {selectedIds.size > 1 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            📦 Se descargarán como archivo ZIP con nombres originales
          </p>
        )}

        {/* Strip metadata option (advanced) */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={stripMetadata}
              onChange={(e) => setStripMetadata(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 mt-0.5"
            />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Eliminar metadata (avanzado)</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ⚠️ Elimina TODA la información EXIF, GPS, IPTC, fechas, ubicación, etc.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Solo usar si necesitas anonimizar las imágenes
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleExport} disabled={exporting}>
            {exporting ? <><Spinner size="sm" /> Exportando...</> : 'Descargar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
