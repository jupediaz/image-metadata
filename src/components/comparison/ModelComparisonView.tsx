'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import { useComparisonStore } from '@/hooks/useComparisonStore';
import { EditVersion } from '@/types/image';
import ComparisonSlider from './ComparisonSlider';
import ViewportSelector from './ViewportSelector';
import { ExportVersionDialog } from '../dialogs/ExportVersionDialog';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

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
  const cancelAiEdit = useImageStore((s) => s.cancelAiEdit);
  const mode = useComparisonStore((s) => s.mode);
  const setMode = useComparisonStore((s) => s.setMode);
  const reset = useComparisonStore((s) => s.reset);

  const image = images.find((img) => img.id === imageId);

  // Check if coming from editor or synced mode (initialize from URL params)
  const [fromEditor] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('fromEditor') === 'true';
  });
  const [syncedMode, setSyncedMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('synced') === 'true';
  });

  // Refs for synchronized zoom/pan
  const leftTransformRef = useRef<ReactZoomPanPinchRef>(null);
  const rightTransformRef = useRef<ReactZoomPanPinchRef>(null);
  const isSyncingRef = useRef(false);

  const handleTransformChange = (side: 'left' | 'right', state: { positionX: number; positionY: number; scale: number }) => {
    if (isSyncingRef.current || !syncedMode) return;

    isSyncingRef.current = true;

    const targetRef = side === 'left' ? rightTransformRef : leftTransformRef;

    if (targetRef.current) {
      targetRef.current.setTransform(
        state.positionX,
        state.positionY,
        state.scale,
        0
      );
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 10);
  };

  const ext = image
    ? image.format === 'jpeg' ? '.jpg' : `.${image.format}`
    : '.jpg';
  const originalUrl = image
    ? `/api/image?sessionId=${sessionId}&id=${image.id}&ext=${ext}`
    : '';

  // Resolve source URLs from query params
  const resolveSource = (source: string): {
    url: string;
    label: string;
    id: string;
    version?: EditVersion;
  } => {
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
        return { url: version.imageUrl, label, id: source, version };
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
          version,
        };
      }
    }

    return { url: originalUrl, label: 'Original', id: 'original' };
  };

  const [left, setLeft] = useState(resolveSource(initialLeft));
  const [right, setRight] = useState(resolveSource(initialRight));
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportVersion, setExportVersion] = useState<EditVersion | null>(null);

  // Helper to format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

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
        ) : syncedMode ? (
          <div className="flex h-full">
            {/* Left image with synchronized zoom/pan */}
            <div className="flex-1 relative overflow-hidden border-r border-[#3c3c3c] flex flex-col">
              <div className="flex-1 relative bg-[#1e1e1e]">
                <TransformWrapper
                  ref={leftTransformRef}
                  initialScale={1}
                  minScale={0.5}
                  maxScale={8}
                  centerOnInit
                  wheel={{ step: 0.1 }}
                  doubleClick={{ mode: 'reset' }}
                  onTransformed={(ref) => handleTransformChange('left', ref.state)}
                >
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full flex items-center justify-center"
                  >
                    <img
                      src={left.url}
                      alt={left.label}
                      className="max-w-full max-h-full object-contain"
                    />
                  </TransformComponent>
                </TransformWrapper>

                {/* Info overlay - top center */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-3 shadow-lg max-w-xs">
                  <div className="flex flex-col gap-2 text-center">
                    {/* Model info (only for edited versions) */}
                    {left.version && (
                      <>
                        <div className="text-xs text-blue-300 font-medium">
                          {left.version.model?.includes('flash') ? 'Gemini 2.5 Flash' : 'Gemini 3 Pro'}
                        </div>
                        {left.version.processingTimeMs && (
                          <div className="text-xs text-gray-300">
                            ⏱️ {(left.version.processingTimeMs / 1000).toFixed(1)}s
                          </div>
                        )}
                        <div className="border-t border-blue-500/30 my-1" />
                      </>
                    )}
                    {/* Image metadata */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="text-gray-400 text-left">Dimensiones:</div>
                      <div className="text-white text-right font-mono">{image.width} × {image.height}</div>

                      <div className="text-gray-400 text-left">Formato:</div>
                      <div className="text-white text-right uppercase">{image.format}</div>

                      <div className="text-gray-400 text-left">Tamaño:</div>
                      <div className="text-white text-right font-mono">{formatFileSize(image.size)}</div>

                      {(image.originalColorSpace || image.metadata?.exif?.colorSpace) && (
                        <>
                          <div className="text-gray-400 text-left">Color:</div>
                          <div className="text-white text-right text-[11px]">{image.originalColorSpace || image.metadata?.exif?.colorSpace}</div>
                        </>
                      )}

                      {image.originalBitDepth && (
                        <>
                          <div className="text-gray-400 text-left">Profundidad:</div>
                          <div className="text-white text-right">{image.originalBitDepth} bits</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                    {left.label}
                  </span>
                </div>
              </div>

              {/* Export button - bottom center */}
              {left.version && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => {
                      setExportVersion(left.version!);
                      setExportDialogOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar
                  </button>
                </div>
              )}
            </div>

            {/* Right image with synchronized zoom/pan */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              <div className="flex-1 relative bg-[#1e1e1e]">
                <TransformWrapper
                  ref={rightTransformRef}
                  initialScale={1}
                  minScale={0.5}
                  maxScale={8}
                  centerOnInit
                  wheel={{ step: 0.1 }}
                  doubleClick={{ mode: 'reset' }}
                  onTransformed={(ref) => handleTransformChange('right', ref.state)}
                >
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full flex items-center justify-center"
                  >
                    <img
                      src={right.url}
                      alt={right.label}
                      className="max-w-full max-h-full object-contain"
                    />
                  </TransformComponent>
                </TransformWrapper>

                {/* Info overlay - top center */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-3 shadow-lg max-w-xs">
                  <div className="flex flex-col gap-2 text-center">
                    {/* Model info (only for edited versions) */}
                    {right.version && (
                      <>
                        <div className="text-xs text-blue-300 font-medium">
                          {right.version.model?.includes('flash') ? 'Gemini 2.5 Flash' : 'Gemini 3 Pro'}
                        </div>
                        {right.version.processingTimeMs && (
                          <div className="text-xs text-gray-300">
                            ⏱️ {(right.version.processingTimeMs / 1000).toFixed(1)}s
                          </div>
                        )}
                        <div className="border-t border-blue-500/30 my-1" />
                      </>
                    )}
                    {/* Image metadata */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="text-gray-400 text-left">Dimensiones:</div>
                      <div className="text-white text-right font-mono">{image.width} × {image.height}</div>

                      <div className="text-gray-400 text-left">Formato:</div>
                      <div className="text-white text-right uppercase">{image.format}</div>

                      <div className="text-gray-400 text-left">Tamaño:</div>
                      <div className="text-white text-right font-mono">{formatFileSize(image.size)}</div>

                      {(image.originalColorSpace || image.metadata?.exif?.colorSpace) && (
                        <>
                          <div className="text-gray-400 text-left">Color:</div>
                          <div className="text-white text-right text-[11px]">{image.originalColorSpace || image.metadata?.exif?.colorSpace}</div>
                        </>
                      )}

                      {image.originalBitDepth && (
                        <>
                          <div className="text-gray-400 text-left">Profundidad:</div>
                          <div className="text-white text-right">{image.originalBitDepth} bits</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                    {right.label}
                  </span>
                </div>
              </div>

              {/* Export button - bottom center */}
              {right.version && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => {
                      setExportVersion(right.version!);
                      setExportDialogOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Left image - normal mode */}
            <div className="flex-1 relative overflow-hidden border-r border-[#3c3c3c] flex flex-col">
              <div className="flex-1 relative">
                <img
                  src={left.url}
                  alt={left.label}
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {/* Info overlay - top center */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-3 shadow-lg max-w-xs">
                  <div className="flex flex-col gap-2 text-center">
                    {/* Model info (only for edited versions) */}
                    {left.version && (
                      <>
                        <div className="text-xs text-blue-300 font-medium">
                          {left.version.model?.includes('flash') ? 'Gemini 2.5 Flash' : 'Gemini 3 Pro'}
                        </div>
                        {left.version.processingTimeMs && (
                          <div className="text-xs text-gray-300">
                            ⏱️ {(left.version.processingTimeMs / 1000).toFixed(1)}s
                          </div>
                        )}
                        <div className="border-t border-blue-500/30 my-1" />
                      </>
                    )}
                    {/* Image metadata */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="text-gray-400 text-left">Dimensiones:</div>
                      <div className="text-white text-right font-mono">{image.width} × {image.height}</div>

                      <div className="text-gray-400 text-left">Formato:</div>
                      <div className="text-white text-right uppercase">{image.format}</div>

                      <div className="text-gray-400 text-left">Tamaño:</div>
                      <div className="text-white text-right font-mono">{formatFileSize(image.size)}</div>

                      {(image.originalColorSpace || image.metadata?.exif?.colorSpace) && (
                        <>
                          <div className="text-gray-400 text-left">Color:</div>
                          <div className="text-white text-right text-[11px]">{image.originalColorSpace || image.metadata?.exif?.colorSpace}</div>
                        </>
                      )}

                      {image.originalBitDepth && (
                        <>
                          <div className="text-gray-400 text-left">Profundidad:</div>
                          <div className="text-white text-right">{image.originalBitDepth} bits</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                    {left.label}
                  </span>
                </div>
              </div>

              {/* Export button - bottom center */}
              {left.version && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => {
                      setExportVersion(left.version!);
                      setExportDialogOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar
                  </button>
                </div>
              )}
            </div>

            {/* Right image - normal mode */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
              <div className="flex-1 relative">
                <img
                  src={right.url}
                  alt={right.label}
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {/* Info overlay - top center */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-900/90 to-purple-900/90 backdrop-blur-sm border border-blue-500/30 rounded-lg px-4 py-3 shadow-lg max-w-xs">
                  <div className="flex flex-col gap-2 text-center">
                    {/* Model info (only for edited versions) */}
                    {right.version && (
                      <>
                        <div className="text-xs text-blue-300 font-medium">
                          {right.version.model?.includes('flash') ? 'Gemini 2.5 Flash' : 'Gemini 3 Pro'}
                        </div>
                        {right.version.processingTimeMs && (
                          <div className="text-xs text-gray-300">
                            ⏱️ {(right.version.processingTimeMs / 1000).toFixed(1)}s
                          </div>
                        )}
                        <div className="border-t border-blue-500/30 my-1" />
                      </>
                    )}
                    {/* Image metadata */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="text-gray-400 text-left">Dimensiones:</div>
                      <div className="text-white text-right font-mono">{image.width} × {image.height}</div>

                      <div className="text-gray-400 text-left">Formato:</div>
                      <div className="text-white text-right uppercase">{image.format}</div>

                      <div className="text-gray-400 text-left">Tamaño:</div>
                      <div className="text-white text-right font-mono">{formatFileSize(image.size)}</div>

                      {(image.originalColorSpace || image.metadata?.exif?.colorSpace) && (
                        <>
                          <div className="text-gray-400 text-left">Color:</div>
                          <div className="text-white text-right text-[11px]">{image.originalColorSpace || image.metadata?.exif?.colorSpace}</div>
                        </>
                      )}

                      {image.originalBitDepth && (
                        <>
                          <div className="text-gray-400 text-left">Profundidad:</div>
                          <div className="text-white text-right">{image.originalBitDepth} bits</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                    {right.label}
                  </span>
                </div>
              </div>

              {/* Export button - bottom center */}
              {right.version && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => {
                      setExportVersion(right.version!);
                      setExportDialogOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor action bar - shown when coming from editor */}
      {fromEditor && (
        <div className="bg-[#252526] border-t border-[#3c3c3c] px-4 py-4 shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <button
              onClick={() => {
                // Get the latest version to export
                const latestVersion = image?.editHistory?.[image.editHistory.length - 1];
                if (latestVersion) {
                  setExportVersion(latestVersion);
                  setExportDialogOpen(true);
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Guardar
            </button>
            <button
              onClick={() => router.push(`/image/${imageId}/edit`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Refinar más
            </button>
            <button
              onClick={() => {
                cancelAiEdit();
                router.push(`/image/${imageId}`);
              }}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Export dialog */}
      {exportVersion && (
        <ExportVersionDialog
          open={exportDialogOpen}
          onClose={() => {
            setExportDialogOpen(false);
            setExportVersion(null);
          }}
          version={exportVersion}
          originalImage={image}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}
