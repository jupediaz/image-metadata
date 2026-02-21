'use client';

import { EditVersion } from '@/types/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExportVersionDialog } from '../dialogs/ExportVersionDialog';
import { ImageFile } from '@/types/image';

interface EditHistoryProps {
  versions: EditVersion[];
  currentVersionIndex?: number;
  onRevert: (index: number) => void;
  onDelete?: (index: number) => void;
  sessionId: string;
  className?: string;
  imageId: string;
  originalImage: ImageFile;
}

function downloadImage(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

export default function EditHistory({
  versions,
  currentVersionIndex = -1,
  onRevert,
  onDelete,
  sessionId,
  className = '',
  imageId,
  originalImage,
}: EditHistoryProps) {
  const router = useRouter();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportVersion, setExportVersion] = useState<EditVersion | null>(null);
  const [exportFormat, setExportFormat] = useState<'original' | 'jpg'>('original');
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());

  const ext = originalImage.format === 'jpeg' ? '.jpg' : `.${originalImage.format}`;
  const originalUrl = `/api/image?sessionId=${sessionId}&id=${imageId}&ext=${ext}`;

  const handleExport = (version: EditVersion, format: 'original' | 'jpg') => {
    setExportVersion(version);
    setExportFormat(format);
    setExportDialogOpen(true);
  };

  const handleCompare = (versionIndex: number) => {
    router.push(`/image/${imageId}/compare?left=original&right=version-${versionIndex}`);
  };

  const handleSelectVersion = (versionId: string) => {
    const newSelected = new Set(selectedVersions);
    if (newSelected.has(versionId)) {
      newSelected.delete(versionId);
    } else {
      // Limit to 2 selections
      if (newSelected.size >= 2) {
        return;
      }
      newSelected.add(versionId);
    }
    setSelectedVersions(newSelected);
  };

  const handleCompareSelected = () => {
    const selected = Array.from(selectedVersions);
    if (selected.length !== 2) return;

    // Determine if any selection is "original"
    const leftId = selected[0];
    const rightId = selected[1];

    router.push(`/image/${imageId}/compare?left=${leftId}&right=${rightId}&synced=true`);
  };

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Historial de Ediciones ({versions.length})
        </h3>
        {selectedVersions.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedVersions.size}/2 seleccionadas
            </span>
            {selectedVersions.size === 2 && (
              <button
                onClick={handleCompareSelected}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V15M9 21H5a2 2 0 0 1-2-2V15" />
                </svg>
                Ver comparación
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {/* Original - First in the list */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            currentVersionIndex === -1 || currentVersionIndex === undefined
              ? 'border-green-500 bg-green-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="flex gap-3">
            {/* Selection checkbox */}
            <div className="flex-shrink-0 flex items-start pt-1">
              <input
                type="checkbox"
                checked={selectedVersions.has('original')}
                onChange={(e) => {
                  e.stopPropagation();
                  handleSelectVersion('original');
                }}
                disabled={selectedVersions.size >= 2 && !selectedVersions.has('original')}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Thumbnail */}
            <div
              className="flex-shrink-0 cursor-pointer"
              onClick={() => onRevert(-1)}
            >
              <img
                src={originalUrl}
                alt="Original"
                className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
              />
            </div>

            {/* Info */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => onRevert(-1)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {(currentVersionIndex === -1 || currentVersionIndex === undefined) && '✓ '}Original
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Sin ediciones de IA
              </p>
            </div>
          </div>
        </div>

        {/* Versions - in chronological order (oldest first) */}
        {versions.map((version, index) => {
          const isCurrent = index === currentVersionIndex;
          const timestamp = new Date(version.timestamp);
          const versionId = `version-${index}`;

          return (
            <div
              key={version.id}
              className={`p-3 rounded-lg border transition-all ${
                isCurrent
                  ? 'border-blue-500 bg-blue-900/20 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex gap-3">
                {/* Selection checkbox */}
                <div className="flex-shrink-0 flex items-start pt-1">
                  <input
                    type="checkbox"
                    checked={selectedVersions.has(versionId)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectVersion(versionId);
                    }}
                    disabled={selectedVersions.size >= 2 && !selectedVersions.has(versionId)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Thumbnail */}
                {version.thumbnailUrl && (
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => onRevert(index)}
                  >
                    <img
                      src={version.thumbnailUrl}
                      alt={`Version ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border border-gray-300 dark:border-gray-600"
                    />
                  </div>
                )}

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onRevert(index)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-200">
                        {isCurrent && '✓ '}Version {index + 1}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(timestamp, "d MMM yyyy, HH:mm", { locale: es })}
                      </p>
                      {version.model && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {version.model}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Prompt */}
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                    <span className="text-gray-500">Prompt:</span> {version.prompt}
                  </p>

                  {/* Mask indicator */}
                  {version.inpaintMaskDataUrl && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      <span className="text-xs text-gray-500">Inpainting</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Export in original format */}
                    {version.imageUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(version, 'original');
                        }}
                        title={`Exportar en ${originalImage.format.toUpperCase()}`}
                        className="px-2 py-1 text-[10px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded transition-colors flex items-center gap-1"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        {originalImage.format.toUpperCase()}
                      </button>
                    )}

                    {/* Export as JPG */}
                    {version.imageUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(version, 'jpg');
                        }}
                        title="Exportar en JPG"
                        className="px-2 py-1 text-[10px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded transition-colors flex items-center gap-1"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        JPG
                      </button>
                    )}

                    {/* Compare with original */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompare(index);
                      }}
                      title="Comparar con original"
                      className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors flex items-center gap-1"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      Comparar
                    </button>

                    {/* Delete */}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(index);
                        }}
                        title="Eliminar esta versión"
                        className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-red-900/60 text-gray-400 hover:text-red-300 rounded transition-colors flex items-center gap-1"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export dialog */}
      {exportVersion && (
        <ExportVersionDialog
          open={exportDialogOpen}
          onClose={() => {
            setExportDialogOpen(false);
            setExportVersion(null);
          }}
          version={exportVersion}
          originalImage={originalImage}
          sessionId={sessionId}
          targetFormat={exportFormat}
        />
      )}
    </div>
  );
}
