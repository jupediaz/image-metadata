'use client';

import { ImageFile } from '@/types/image';

interface ViewportSelectorProps {
  image: ImageFile;
  sessionId: string;
  selectedSource: string;
  onSourceChange: (source: string, imageUrl: string, label: string) => void;
  side: 'left' | 'right';
}

export default function ViewportSelector({
  image,
  sessionId,
  selectedSource,
  onSourceChange,
  side,
}: ViewportSelectorProps) {
  const ext = image.format === 'jpeg' ? '.jpg' : `.${image.format}`;
  const originalUrl = `/api/image?sessionId=${sessionId}&id=${image.id}&ext=${ext}`;

  const sources = [
    { id: 'original', label: 'Original', url: originalUrl },
    ...(image.editHistory || []).map((version, i) => ({
      id: `version-${i}`,
      label: `V${i + 1}${version.model ? ` (${version.model.includes('flash') ? 'Flash' : 'Pro'})` : ''}`,
      url: version.imageUrl,
    })),
  ];

  return (
    <select
      value={selectedSource}
      onChange={(e) => {
        const source = sources.find((s) => s.id === e.target.value);
        if (source) {
          onSourceChange(source.id, source.url, source.label);
        }
      }}
      className="px-2 py-1 bg-[#2d2d2d] border border-[#3c3c3c] rounded text-xs text-[#cccccc] focus:ring-1 focus:ring-blue-500 focus:border-transparent"
    >
      {sources.map((source) => (
        <option key={source.id} value={source.id}>
          {side === 'left' ? 'L' : 'R'}: {source.label}
        </option>
      ))}
    </select>
  );
}
