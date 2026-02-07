'use client';

import { useImageStore } from '@/hooks/useImageStore';
import { ImageGrid } from './ImageGrid';
import { BatchToolbar } from './BatchToolbar';

export function ImageWorkspace() {
  const selectedIds = useImageStore((s) => s.selectedIds);

  return (
    <div className="flex flex-col pb-20">
      <ImageGrid />

      {selectedIds.size > 0 && (
        <BatchToolbar />
      )}
    </div>
  );
}
