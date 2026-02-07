'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import { ImageDetailView } from '@/components/workspace/ImageDetail';

export default function ImageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const images = useImageStore((s) => s.images);
  const image = images.find((img) => img.id === id);

  if (!image) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4">
          <p className="text-gray-500 dark:text-gray-400">Image not found</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Back to gallery
          </button>
        </div>
      </div>
    );
  }

  return <ImageDetailView imageId={id} />;
}
