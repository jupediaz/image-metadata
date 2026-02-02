'use client';

import { useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import { Button } from '@/components/ui/Button';
import { BatchRenameDialog } from '@/components/dialogs/BatchRenameDialog';
import { ConvertDialog } from '@/components/dialogs/ConvertDialog';
import { BatchEditDialog } from '@/components/dialogs/BatchEditDialog';
import { ExportDialog } from '@/components/dialogs/ExportDialog';

export function BatchToolbar() {
  const selectedIds = useImageStore((s) => s.selectedIds);
  const deselectAll = useImageStore((s) => s.deselectAll);

  const [renameOpen, setRenameOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const count = selectedIds.size;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2 sm:mb-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {count} seleccionada{count !== 1 ? 's' : ''}
            </span>
            <button onClick={deselectAll} className="text-sm text-blue-600 dark:text-blue-400 min-h-[44px] px-2">
              Cancelar
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button variant="secondary" size="sm" onClick={() => setRenameOpen(true)}>
              Renombrar
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Editar metadata
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConvertOpen(true)}>
              Convertir
            </Button>
            <Button variant="primary" size="sm" onClick={() => setExportOpen(true)}>
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <BatchRenameDialog open={renameOpen} onClose={() => setRenameOpen(false)} />
      <ConvertDialog open={convertOpen} onClose={() => setConvertOpen(false)} />
      <BatchEditDialog open={editOpen} onClose={() => setEditOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
}
