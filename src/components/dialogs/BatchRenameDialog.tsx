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

export function BatchRenameDialog({ open, onClose }: Props) {
  const images = useImageStore((s) => s.images);
  const selectedIds = useImageStore((s) => s.selectedIds);
  const updateImage = useImageStore((s) => s.updateImage);
  const sessionId = useImageStore((s) => s.sessionId);
  const { toast } = useToast();

  const [pattern, setPattern] = useState('imagen');
  const [separator, setSeparator] = useState('_');
  const [startNumber, setStartNumber] = useState(1);
  const [saving, setSaving] = useState(false);

  const selectedImages = images.filter((img) => selectedIds.has(img.id));

  const preview = selectedImages.map((img, i) => {
    const num = startNumber + i;
    const ext = img.filename.includes('.') ? img.filename.substring(img.filename.lastIndexOf('.')) : '';
    return { id: img.id, oldName: img.filename, newName: `${pattern}${separator}${num}${ext}` };
  });

  const handleRename = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          imageIds: Array.from(selectedIds),
          pattern,
          separator,
          startNumber,
        }),
      });

      if (!res.ok) throw new Error('Error renombrando');

      const data = await res.json();
      for (const rename of data.renames) {
        updateImage(rename.id, { filename: rename.newName });
      }

      toast('success', `${data.renames.length} archivo${data.renames.length > 1 ? 's' : ''} renombrado${data.renames.length > 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      toast('error', 'Error al renombrar');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Renombrar en lote">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prefijo</label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[44px]"
            placeholder="imagen"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Separador</label>
            <select
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[44px]"
            >
              <option value="_">Guion bajo (_)</option>
              <option value="-">Guion (-)</option>
              <option value=" ">Espacio</option>
              <option value="">Sin separador</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Empieza en</label>
            <input
              type="number"
              min={0}
              value={startNumber}
              onChange={(e) => setStartNumber(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[44px]"
            />
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Vista previa</p>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
            {preview.map(({ id, oldName, newName }) => (
              <div key={id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 truncate max-w-[40%]">{oldName}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-gray-400">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
                <span className="text-gray-900 dark:text-gray-100 font-medium truncate">{newName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleRename} disabled={saving || !pattern}>
            {saving ? <><Spinner size="sm" /> Renombrando...</> : 'Renombrar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
