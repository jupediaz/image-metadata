'use client';

import { useImageStore } from '@/hooks/useImageStore';
import { ImageGrid } from './ImageGrid';
import { ImageDetail } from './ImageDetail';
import { BatchToolbar } from './BatchToolbar';

export function ImageWorkspace() {
  const view = useImageStore((s) => s.view);
  const selectedIds = useImageStore((s) => s.selectedIds);

  return (
    <div className="flex flex-col pb-20">
      {view === 'detail' ? (
        <ImageDetail />
      ) : (
        <ImageGrid />
      )}

      {selectedIds.size > 0 && view === 'grid' && (
        <BatchToolbar />
      )}
    </div>
  );
}
