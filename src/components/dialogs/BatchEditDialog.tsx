'use client';

import { useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { MetadataChange } from '@/types/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BatchEditDialog({ open, onClose }: Props) {
  const selectedIds = useImageStore((s) => s.selectedIds);
  const updateMetadata = useImageStore((s) => s.updateMetadata);
  const updateImage = useImageStore((s) => s.updateImage);
  const sessionId = useImageStore((s) => s.sessionId);
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [dateTimeOriginal, setDateTimeOriginal] = useState('');
  const [copyright, setCopyright] = useState('');
  const [creator, setCreator] = useState('');
  const [software, setSoftware] = useState('');

  const handleApply = async () => {
    const changes: MetadataChange[] = [];
    if (dateTimeOriginal) changes.push({ section: 'dates', field: 'dateTimeOriginal', value: new Date(dateTimeOriginal).toISOString() });
    if (copyright) changes.push({ section: 'iptc', field: 'copyright', value: copyright });
    if (creator) changes.push({ section: 'iptc', field: 'creator', value: creator });
    if (software) changes.push({ section: 'exif', field: 'software', value: software });

    if (changes.length === 0) {
      toast('info', 'Rellena al menos un campo');
      return;
    }

    setSaving(true);
    let successCount = 0;

    for (const imageId of selectedIds) {
      try {
        const res = await fetch('/api/metadata', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, imageId, changes }),
        });

        if (res.ok) {
          const data = await res.json();
          updateMetadata(imageId, data.metadata);
          updateImage(imageId, { size: data.size });
          successCount++;
        }
      } catch (err) {
        console.error(`Error updating ${imageId}:`, err);
      }
    }

    setSaving(false);
    toast('success', `Metadata actualizada en ${successCount} imagen${successCount > 1 ? 'es' : ''}`);
    onClose();
  };

  const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm min-h-[44px]";

  return (
    <Modal open={open} onClose={onClose} title="Editar metadata en lote">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Solo se aplicaran los campos que rellenes. Se aplicara a {selectedIds.size} imagen{selectedIds.size > 1 ? 'es' : ''}.
        </p>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha original</label>
          <input
            type="datetime-local"
            value={dateTimeOriginal}
            onChange={(e) => setDateTimeOriginal(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Copyright</label>
          <input
            type="text"
            value={copyright}
            onChange={(e) => setCopyright(e.target.value)}
            className={inputClass}
            placeholder="(c) 2025 Tu Nombre"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Autor</label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            className={inputClass}
            placeholder="Nombre del fotografo"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Software</label>
          <input
            type="text"
            value={software}
            onChange={(e) => setSoftware(e.target.value)}
            className={inputClass}
            placeholder="Image Metadata Tool"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleApply} disabled={saving}>
            {saving ? <><Spinner size="sm" /> Aplicando...</> : 'Aplicar a todas'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
