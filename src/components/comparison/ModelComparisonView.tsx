'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import { useComparisonStore } from '@/hooks/useComparisonStore';
import ComparisonSlider from './ComparisonSlider';
import ViewportSelector from './ViewportSelector';

interface ModelComparisonViewProps {
  imageId: string;
  leftSource: string;
  rightSource: string;
}

export default function ModelComparisonView({
  imageId,
  leftSource: initialLeft,
  rightSource: initialRight,
}: ModelComparisonViewProps) {
  const router = useRouter();
  const images = useImageStore((s) => s.images);
  const sessionId = useImageStore((s) => s.sessionId);
  const mode = useComparisonStore((s) => s.mode);
  const setMode = useComparisonStore((s) => s.setMode);
  const reset = useComparisonStore((s) => s.reset);

  const image = images.find((img) => img.id === imageId);

  const ext = image
    ? image.format === 'jpeg' ? '.jpg' : `.${image.format}`
    : '.jpg';
  const originalUrl = image
    ? `/api/image?sessionId=${sessionId}&id=${image.id}&ext=${ext}`
    : '';

  // Resolve source URLs from query params
  const resolveSource = (source: string): { url: string; label: string; id: string } => {
    if (!image) return { url: '', label: 'Unknown', id: source };

    if (source === 'original') {
      return { url: originalUrl, label: 'Original', id: 'original' };
    }

    // model-<model-name>: find the latest version with that model
    if (source.startsWith('model-')) {
      const modelName = source.replace('model-', '');
      const version = image.editHistory?.findLast((v) => v.model === modelName);
      if (version) {
        const label = modelName.includes('flash') ? 'Flash' : 'Pro';
        return { url: version.imageUrl, label, id: source };
      }
    }

    // version-N
    if (source.startsWith('version-')) {
      const idx = parseInt(source.replace('version-', ''), 10);
      const version = image.editHistory?.[idx];
      if (version) {
        return {
          url: version.imageUrl,
          label: `V${idx + 1}`,
          id: source,
        };
      }
    }

    return { url: originalUrl, label: 'Original', id: 'original' };
  };

  const [left, setLeft] = useState(resolveSource(initialLeft));
  const [right, setRight] = useState(resolveSource(initialRight));

  // Clean up store on unmount
  useEffect(() => {
    return () => reset();
  }, [reset]);

  if (!image) {
    return (
      <div className="h-dvh bg-[#1e1e1e] flex items-center justify-center text-[#cccccc]">
        <p className="text-gray-400">Image not found</p>
      </div>
    );
  }

  return (
    <div className="h-dvh w-dvw flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#3c3c3c] px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/image/${imageId}`)}
            className="flex items-center gap-1 text-xs text-[#858585] hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <span className="text-xs font-medium">Comparison</span>
          <span className="text-[10px] text-[#585858]">{image.filename}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Source selectors */}
          <ViewportSelector
            image={image}
            sessionId={sessionId}
            selectedSource={left.id}
            onSourceChange={(id, url, label) => {
              setLeft({ id, url, label });
              // Update URL
              const params = new URLSearchParams({ left: id, right: right.id });
              router.replace(`/image/${imageId}/compare?${params.toString()}`);
            }}
            side="left"
          />
          <span className="text-[10px] text-[#585858]">vs</span>
          <ViewportSelector
            image={image}
            sessionId={sessionId}
            selectedSource={right.id}
            onSourceChange={(id, url, label) => {
              setRight({ id, url, label });
              const params = new URLSearchParams({ left: left.id, right: id });
              router.replace(`/image/${imageId}/compare?${params.toString()}`);
            }}
            side="right"
          />

          {/* Mode toggle */}
          <div className="flex border border-[#3c3c3c] rounded overflow-hidden">
            <button
              onClick={() => setMode('slider')}
              className={`px-2 py-1 text-[10px] ${
                mode === 'slider' ? 'bg-[#094771] text-white' : 'bg-[#2d2d2d] text-[#858585]'
              }`}
            >
              Slider
            </button>
            <button
              onClick={() => setMode('side-by-side')}
              className={`px-2 py-1 text-[10px] ${
                mode === 'side-by-side' ? 'bg-[#094771] text-white' : 'bg-[#2d2d2d] text-[#858585]'
              }`}
            >
              Side by Side
            </button>
          </div>
        </div>
      </div>

      {/* Comparison area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'slider' ? (
          <ComparisonSlider
            leftUrl={left.url}
            rightUrl={right.url}
            leftLabel={left.label}
            rightLabel={right.label}
          />
        ) : (
          <div className="flex h-full">
            <div className="flex-1 relative overflow-hidden border-r border-[#3c3c3c]">
              <img
                src={left.url}
                alt={left.label}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                  {left.label}
                </span>
              </div>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <img
                src={right.url}
                alt={right.label}
                className="absolute inset-0 w-full h-full object-contain"
              />
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                  {right.label}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
