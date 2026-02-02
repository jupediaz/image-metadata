'use client';

import { useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
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
  const sessionId = useImageStore((s) => s.sessionId);
  const { toast } = useToast();

  const [stripMetadata, setStripMetadata] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
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

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const filename = disposition
        ? disposition.split('filename=')[1]?.replace(/"/g, '') || 'imagenes.zip'
        : selectedIds.size === 1 ? 'imagen.jpg' : 'imagenes.zip';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast('success', 'Exportacion completada');
      onClose();
    } catch (err) {
      toast('error', 'Error al exportar');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Exportar imagenes">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {selectedIds.size} imagen{selectedIds.size > 1 ? 'es' : ''} seleccionada{selectedIds.size > 1 ? 's' : ''}
        </p>

        {selectedIds.size > 1 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            Se descargaran como archivo ZIP
          </p>
        )}

        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={stripMetadata}
            onChange={(e) => setStripMetadata(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Eliminar metadata</span>
            <p className="text-xs text-gray-400">Elimina EXIF, GPS, IPTC y otros datos de las imagenes</p>
          </div>
        </label>

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
