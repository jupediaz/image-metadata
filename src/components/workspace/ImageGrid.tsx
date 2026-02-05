'use client';

import { useImageStore } from '@/hooks/useImageStore';
import { ImageFile } from '@/types/image';
import dynamic from 'next/dynamic';

const HeicImage = dynamic(() => import('@/components/ui/HeicImage').then(mod => ({ default: mod.HeicImage })), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
});

export function ImageGrid() {
  const images = useImageStore((s) => s.images);
  const selectedIds = useImageStore((s) => s.selectedIds);
  const toggleSelection = useImageStore((s) => s.toggleSelection);
  const selectAll = useImageStore((s) => s.selectAll);
  const deselectAll = useImageStore((s) => s.deselectAll);
  const setActiveImage = useImageStore((s) => s.setActiveImage);
  const removeImage = useImageStore((s) => s.removeImage);
  const sessionId = useImageStore((s) => s.sessionId);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`¿Estás seguro de que quieres eliminar ${count} imagen${count > 1 ? 'es' : ''}?`)) {
      return;
    }

    const selectedImages = images.filter((img) => selectedIds.has(img.id));

    for (const image of selectedImages) {
      try {
        const ext = image.format === 'jpeg' ? '.jpg' : `.${image.format}`;
        const res = await fetch(`/api/delete?sessionId=${sessionId}&id=${image.id}&ext=${ext}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          removeImage(image.id);
        } else {
          console.error(`Error deleting image ${image.id}`);
        }
      } catch (error) {
        console.error(`Error deleting image ${image.id}:`, error);
      }
    }
  };

  return (
    <div className="p-4">
      {/* Selection bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {images.length} imagen{images.length !== 1 ? 'es' : ''}
          {selectedIds.size > 0 && (
            <span className="text-blue-600 dark:text-blue-400 ml-2">
              ({selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''})
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 min-h-[44px] px-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Eliminar
            </button>
          )}
          <button
            onClick={() => selectedIds.size === images.length ? deselectAll() : selectAll()}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 min-h-[44px] px-3"
          >
            {selectedIds.size === images.length ? 'Deseleccionar' : 'Seleccionar todo'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            selected={selectedIds.has(image.id)}
            onToggle={() => toggleSelection(image.id)}
            onOpen={() => setActiveImage(image.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ImageCard({
  image,
  selected,
  onToggle,
  onOpen,
}: {
  image: ImageFile;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  // Use thumbnail if available, otherwise use full image (for HEIC without thumbnail)
  const sessionId = useImageStore((s) => s.sessionId);
  const ext = image.format === 'jpeg' ? '.jpg' : `.${image.format}`;
  const imageUrl = image.thumbnailUrl || `/api/image?sessionId=${sessionId}&id=${image.id}&ext=${ext}`;

  return (
    <div
      className={`
        relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800
        aspect-square cursor-pointer
        ring-2 transition-all
        ${selected
          ? 'ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-950'
          : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'
        }
      `}
    >
      {/* Thumbnail */}
      {image.format === 'heic' || image.format === 'heif' ? (
        <HeicImage
          src={imageUrl}
          alt={image.filename}
          className="w-full h-full object-cover"
          onClick={onOpen}
          loading="lazy"
        />
      ) : (
        <img
          src={imageUrl}
          alt={image.filename}
          className="w-full h-full object-cover"
          onClick={onOpen}
          loading="lazy"
        />
      )}

      {/* Checkbox overlay */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`
          absolute top-1.5 left-1.5 w-6 h-6 rounded-full
          flex items-center justify-center
          transition-all
          ${selected
            ? 'bg-blue-500 text-white'
            : 'bg-black/30 text-white opacity-0 group-hover:opacity-100'
          }
        `}
      >
        {selected && (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Format badge */}
      <div className="absolute bottom-1 right-1">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/50 text-white uppercase">
          {image.format === 'jpeg' ? 'jpg' : image.format}
        </span>
      </div>

      {/* Filename on hover */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-xs truncate">{image.filename}</p>
      </div>
    </div>
  );
}
