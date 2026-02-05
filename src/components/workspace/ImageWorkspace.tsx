'use client';

import { useImageStore } from '@/hooks/useImageStore';
import { ImageGrid } from './ImageGrid';
import { ImageDetail } from './ImageDetail';
import { BatchToolbar } from './BatchToolbar';
import dynamic from 'next/dynamic';

// Dynamically import ImageEditor to avoid SSR issues with fabric.js
const ImageEditor = dynamic(() => import('@/components/editor/ImageEditor'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading editor...</div>
});

export function ImageWorkspace() {
  const view = useImageStore((s) => s.view);
  const selectedIds = useImageStore((s) => s.selectedIds);

  if (view === 'ai-editor') {
    return <ImageEditor />;
  }

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
