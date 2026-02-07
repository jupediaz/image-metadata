'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import dynamic from 'next/dynamic';

const EditorShell = dynamic(() => import('@/components/layout/EditorShell'), {
  ssr: false,
  loading: () => (
    <div className="h-dvh w-dvw bg-[#1e1e1e] flex items-center justify-center text-[#cccccc]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-600 border-t-blue-500" />
        <p className="text-sm">Loading editor...</p>
      </div>
    </div>
  ),
});

export default function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const images = useImageStore((s) => s.images);
  const startAiEdit = useImageStore((s) => s.startAiEdit);
  const image = images.find((img) => img.id === id);

  useEffect(() => {
    if (image) {
      startAiEdit(id);
    }
  }, [id, image, startAiEdit]);

  if (!image) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">Image not found</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Back to gallery
          </button>
        </div>
      </div>
    );
  }

  return <EditorShell imageId={id} />;
}
