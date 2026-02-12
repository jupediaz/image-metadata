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

export function ConvertDialog({ open, onClose }: Props) {
  const selectedIds = useImageStore((s) => s.selectedIds);
  const updateImage = useImageStore((s) => s.updateImage);
  const sessionId = useImageStore((s) => s.sessionId);
  const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();
  const { toast } = useToast();

  const [targetFormat, setTargetFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [quality, setQuality] = useState(90);
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleConvert = async () => {
    setSaving(true);
    const progressId = startProgress(
      'convert',
      `Convirtiendo ${selectedIds.size} imagen${selectedIds.size > 1 ? 'es' : ''} a ${targetFormat.toUpperCase()}`,
      selectedIds.size
    );

    try {
      updateProgress(progressId, 10, 'Preparando conversión...');

      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          imageIds: Array.from(selectedIds),
          targetFormat,
          quality,
          preserveMetadata,
        }),
      });

      if (!res.ok) throw new Error('Error convirtiendo');

      updateProgress(progressId, 50, 'Procesando imágenes...');

      const data = await res.json();

      updateProgress(progressId, 90, 'Actualizando metadatos...');

      for (const img of data.converted) {
        updateImage(img.id, {
          format: img.format,
          size: img.size,
          filename: img.filename,
          mimeType: img.mimeType,
        });
      }

      finishProgress(progressId);
      toast('success', `${data.converted.length} imagen${data.converted.length > 1 ? 'es' : ''} convertida${data.converted.length > 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      failProgress(progressId, err instanceof Error ? err.message : 'Error al convertir');
      toast('error', 'Error al convertir');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const showQuality = targetFormat !== 'png';

  return (
    <Modal open={open} onClose={onClose} title="Convertir formato">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Formato destino</label>
          <div className="grid grid-cols-3 gap-2">
            {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setTargetFormat(fmt)}
                className={`
                  py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                  ${targetFormat === fmt
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {fmt === 'jpeg' ? 'JPG' : fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {showQuality && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Calidad: {quality}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Menor tamaño</span>
              <span>Mayor calidad</span>
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input
            type="checkbox"
            checked={preserveMetadata}
            onChange={(e) => setPreserveMetadata(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Preservar metadata</span>
        </label>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Se convertiran {selectedIds.size} imagen{selectedIds.size > 1 ? 'es' : ''} a {targetFormat === 'jpeg' ? 'JPG' : targetFormat.toUpperCase()}
        </p>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleConvert} disabled={saving}>
            {saving ? <><Spinner size="sm" /> Convirtiendo...</> : 'Convertir'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
