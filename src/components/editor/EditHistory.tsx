'use client';

import { EditVersion } from '@/types/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EditHistoryProps {
  versions: EditVersion[];
  currentVersionIndex?: number;
  onRevert: (index: number) => void;
  sessionId: string;
  className?: string;
}

export default function EditHistory({
  versions,
  currentVersionIndex = -1,
  onRevert,
  sessionId,
  className = '',
}: EditHistoryProps) {
  if (!versions || versions.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-sm font-medium text-gray-300 mb-3">
        Historial de Ediciones ({versions.length})
      </h3>

      <div className="space-y-2">
        {versions.map((version, index) => {
          const isCurrent = index === currentVersionIndex;
          const timestamp = new Date(version.timestamp);

          return (
            <div
              key={version.id}
              className={`p-3 rounded-lg border transition-all ${
                isCurrent
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                {version.thumbnailUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={version.thumbnailUrl}
                      alt={`Version ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border border-gray-600"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {isCurrent && '✓ '}Version {index + 1}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(timestamp, "d MMM yyyy, HH:mm", { locale: es })}
                      </p>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => onRevert(index)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                      >
                        Revertir
                      </button>
                    )}
                  </div>

                  {/* Prompt */}
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    <span className="text-gray-500">Prompt:</span> {version.prompt}
                  </p>

                  {/* Mask indicator */}
                  {version.maskDataUrl && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      <span className="text-xs text-gray-500">Con máscara</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Original indicator */}
      <div className="mt-3 p-3 rounded-lg border border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <p className="text-sm text-gray-300">Original</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Sin ediciones de IA
        </p>
      </div>
    </div>
  );
}
