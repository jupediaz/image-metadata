/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, PencilBrush, Point, Path } from 'fabric';

// Extend Path to include maskType property
declare module 'fabric' {
  interface Path {
    maskType?: 'inpaint' | 'safe-zone' | 'erase';
  }
}

interface InpaintingCanvasProps {
  imageUrl: string;
  onMaskChange?: (maskDataUrl: string | null) => void;
  onSafeZoneMaskChange?: (maskDataUrl: string | null) => void;
  className?: string;
}

type MaskMode = 'inpaint' | 'safe-zone' | 'erase';

export default function InpaintingCanvas({
  imageUrl,
  onMaskChange,
  onSafeZoneMaskChange,
  className = '',
}: InpaintingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [maskMode, setMaskMode] = useState<MaskMode>('inpaint');
  const [canvasReady, setCanvasReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = Math.max(600, window.innerHeight - 300);

    // Create canvas instance
    const canvas = new Canvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: '#1f2937',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    // Load background image
    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      if (!img || !canvas) return;

      // Scale image to fit canvas
      const scale = Math.min(
        (canvas.width! * 0.9) / (img.width || 1),
        (canvas.height! * 0.9) / (img.height || 1)
      );

      img.scale(scale);
      img.set({
        left: (canvas.width! - (img.width || 0) * scale) / 2,
        top: (canvas.height! - (img.height || 0) * scale) / 2,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });

      // Set as background
      canvas.backgroundImage = img;
      canvas.renderAll();

      // CRITICAL: Enable drawing mode AFTER image is loaded and rendered
      canvas.isDrawingMode = true;

      // Configure the brush
      const brush = new PencilBrush(canvas);
      brush.width = brushSize;
      brush.color = 'rgba(255, 0, 0, 0.6)'; // Red for inpainting by default
      brush.strokeLineCap = 'round';
      brush.strokeLineJoin = 'round';

      canvas.freeDrawingBrush = brush;

      console.log('Canvas initialized:', {
        isDrawingMode: canvas.isDrawingMode,
        brushWidth: brush.width,
        brushColor: brush.color,
        canvasSize: { width: canvas.width, height: canvas.height }
      });

      setCanvasReady(true);
    }).catch((error) => {
      console.error('Error loading image:', error);
    });

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      canvas.setWidth(newWidth);
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [imageUrl, brushSize]);

  // Update brush when settings change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvas.freeDrawingBrush) return;

    const brush = canvas.freeDrawingBrush as PencilBrush;
    brush.width = brushSize;

    // Set color and mode based on mask mode
    if (maskMode === 'inpaint') {
      brush.color = 'rgba(255, 0, 0, 0.6)'; // Red for areas to modify
      (brush as any).maskType = 'inpaint';
      // Normal drawing mode
      canvas.freeDrawingBrush.globalCompositeOperation = 'source-over';
    } else if (maskMode === 'safe-zone') {
      brush.color = 'rgba(0, 255, 0, 0.6)'; // Green for areas to protect
      (brush as any).maskType = 'safe-zone';
      // Normal drawing mode
      canvas.freeDrawingBrush.globalCompositeOperation = 'source-over';
    } else {
      // Eraser mode: use destination-out to actually erase pixels
      brush.color = 'rgba(0, 0, 0, 1)'; // Color doesn't matter with destination-out
      (brush as any).maskType = 'erase';
      canvas.freeDrawingBrush.globalCompositeOperation = 'destination-out';
    }

    console.log('Brush updated:', {
      mode: maskMode,
      width: brush.width,
      color: brush.color,
      isDrawingMode: canvas.isDrawingMode
    });
  }, [brushSize, maskMode]);

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
    setZoom(newZoom);

    const center = canvas.getCenter();
    canvas.zoomToPoint(new Point(center.left, center.top), newZoom);
    canvas.renderAll();

    console.log('Zoom changed:', newZoom);
  }, [zoom]);

  const resetZoom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
  }, []);

  // Toggle pan mode
  const togglePanMode = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newPanning = !isPanning;
    setIsPanning(newPanning);

    if (newPanning) {
      // Disable drawing, enable panning
      canvas.isDrawingMode = false;
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';

      let lastX = 0;
      let lastY = 0;
      let isDragging = false;

      const handleMouseDown = (opt: any) => {
        const evt = opt.e;
        isDragging = true;
        lastX = evt.clientX;
        lastY = evt.clientY;
        canvas.defaultCursor = 'grabbing';
      };

      const handleMouseMove = (opt: any) => {
        if (!isDragging) return;
        const evt = opt.e;
        const vpt = canvas.viewportTransform;
        if (!vpt) return;

        vpt[4] += evt.clientX - lastX;
        vpt[5] += evt.clientY - lastY;
        canvas.requestRenderAll();
        lastX = evt.clientX;
        lastY = evt.clientY;
      };

      const handleMouseUp = () => {
        isDragging = false;
        canvas.defaultCursor = 'grab';
      };

      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);

      console.log('Pan mode enabled');
    } else {
      // Enable drawing, disable panning
      canvas.isDrawingMode = true;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');

      console.log('Drawing mode re-enabled');
    }
  }, [isPanning]);

  const exportMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();

    if (objects.length === 0) {
      onMaskChange?.(null);
      onSafeZoneMaskChange?.(null);
      return;
    }

    const width = canvas.width || 800;
    const height = canvas.height || 600;

    // Separate paths by type
    const inpaintPaths: any[] = [];
    const safeZonePaths: any[] = [];

    objects.forEach((obj) => {
      if (obj.type === 'path') {
        const path = obj as any;
        // Try to get maskType from multiple sources
        const maskType = path.maskType || path.data?.maskType || 'inpaint';

        console.log('Processing path:', {
          type: obj.type,
          maskType,
          stroke: path.stroke,
          hasPath: !!path.path,
          directMaskType: path.maskType,
          dataMaskType: path.data?.maskType
        });

        if (maskType === 'inpaint') {
          inpaintPaths.push(path);
        } else if (maskType === 'safe-zone') {
          safeZonePaths.push(path);
        }
      }
    });

    console.log('Mask export summary:', {
      totalPaths: objects.length,
      inpaintCount: inpaintPaths.length,
      safeZoneCount: safeZonePaths.length
    });

    // Create inpainting mask (red areas -> white in mask)
    if (inpaintPaths.length > 0) {
      const inpaintCanvas = document.createElement('canvas');
      inpaintCanvas.width = width;
      inpaintCanvas.height = height;
      const ctx = inpaintCanvas.getContext('2d');

      if (ctx) {
        // Fill with black (no edit)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw inpaint paths in white
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        inpaintPaths.forEach((path) => {
          ctx.lineWidth = path.strokeWidth || brushSize;
          ctx.save();
          ctx.beginPath();

          const pathData = path.path;
          if (pathData) {
            pathData.forEach((segment: any) => {
              const cmd = segment[0];
              if (cmd === 'M') {
                ctx.moveTo(segment[1], segment[2]);
              } else if (cmd === 'Q') {
                ctx.quadraticCurveTo(segment[1], segment[2], segment[3], segment[4]);
              } else if (cmd === 'L') {
                ctx.lineTo(segment[1], segment[2]);
              }
            });
            ctx.stroke();
          }
          ctx.restore();
        });

        const inpaintMask = inpaintCanvas.toDataURL('image/png');
        onMaskChange?.(inpaintMask);
        console.log('Inpaint mask exported:', { pathCount: inpaintPaths.length });
      }
    } else {
      onMaskChange?.(null);
    }

    // Create safe zone mask (green areas -> white in mask)
    if (safeZonePaths.length > 0) {
      const safeZoneCanvas = document.createElement('canvas');
      safeZoneCanvas.width = width;
      safeZoneCanvas.height = height;
      const ctx = safeZoneCanvas.getContext('2d');

      if (ctx) {
        // Fill with black (can edit)
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Draw safe zone paths in white (protected areas)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        safeZonePaths.forEach((path) => {
          ctx.lineWidth = path.strokeWidth || brushSize;
          ctx.save();
          ctx.beginPath();

          const pathData = path.path;
          if (pathData) {
            pathData.forEach((segment: any) => {
              const cmd = segment[0];
              if (cmd === 'M') {
                ctx.moveTo(segment[1], segment[2]);
              } else if (cmd === 'Q') {
                ctx.quadraticCurveTo(segment[1], segment[2], segment[3], segment[4]);
              } else if (cmd === 'L') {
                ctx.lineTo(segment[1], segment[2]);
              }
            });
            ctx.stroke();
          }
          ctx.restore();
        });

        const safeZoneMask = safeZoneCanvas.toDataURL('image/png');
        onSafeZoneMaskChange?.(safeZoneMask);
        console.log('Safe zone mask exported:', { pathCount: safeZonePaths.length });
      }
    } else {
      onSafeZoneMaskChange?.(null);
    }
  }, [brushSize, onMaskChange, onSafeZoneMaskChange]);

  // Notify parent of mask changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handlePathCreated = (e: any) => {
      const path = e.path as Path;
      if (path && canvas.freeDrawingBrush) {
        const maskType = (canvas.freeDrawingBrush as any).maskType || 'inpaint';

        // If in erase mode, remove the eraser path itself and remove intersecting paths
        if (maskType === 'erase') {
          // Remove the eraser path (we don't want to keep it)
          canvas.remove(path);

          // Find and remove paths that intersect with the eraser stroke
          const eraserBounds = path.getBoundingRect();
          const allPaths = canvas.getObjects('path');

          allPaths.forEach((existingPath: any) => {
            // Skip if this is the eraser path itself
            if (existingPath === path) return;

            const pathBounds = existingPath.getBoundingRect();
            // Check if bounding boxes intersect
            if (
              eraserBounds.left < pathBounds.left + pathBounds.width &&
              eraserBounds.left + eraserBounds.width > pathBounds.left &&
              eraserBounds.top < pathBounds.top + pathBounds.height &&
              eraserBounds.top + eraserBounds.height > pathBounds.top
            ) {
              canvas.remove(existingPath);
              console.log('Erased path:', { maskType: existingPath.maskType });
            }
          });

          canvas.renderAll();
        } else {
          // Normal drawing modes: store the mask type
          path.maskType = maskType;
          (path as any).data = { ...(path as any).data, maskType };

          console.log('Path created:', {
            maskType: path.maskType,
            stroke: path.stroke,
            dataExists: !!(path as any).data
          });
        }
      }
      exportMask();
    };

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [exportMask]);

  const clearMask = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      canvas.remove(obj);
    });

    canvas.renderAll();
    onMaskChange?.(null);
    onSafeZoneMaskChange?.(null);
    console.log('Mask cleared - both inpaint and safe zone masks reset');
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
      exportMask();
      console.log('Undo - removed last path');
    }
  };

  // Debug: Log canvas state when it's ready
  useEffect(() => {
    if (canvasReady) {
      const canvas = fabricCanvasRef.current;
      console.log('Canvas ready. Current state:', {
        isDrawingMode: canvas?.isDrawingMode,
        hasBrush: !!canvas?.freeDrawingBrush,
        brushWidth: canvas?.freeDrawingBrush?.width,
        objectCount: canvas?.getObjects().length
      });
    }
  }, [canvasReady]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative border-2 border-gray-700 rounded-lg overflow-hidden bg-gray-800"
        style={{ touchAction: 'none' }} // Prevent touch scrolling on mobile
      >
        <canvas ref={canvasRef} />
        {!canvasReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span>Cargando imagen...</span>
            </div>
          </div>
        )}

        {/* Zoom indicator */}
        {zoom !== 1 && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            {Math.round(zoom * 100)}%
          </div>
        )}

        {/* Mode indicator */}
        {canvasReady && (
          <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">
            {isPanning ? (
              <>🤚 Modo mover</>
            ) : maskMode === 'inpaint' ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                Inpainting activo
              </>
            ) : maskMode === 'safe-zone' ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                Zona segura activa
              </>
            ) : (
              <>🧹 Borrador activo</>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
        {/* Drawing Tools Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            🎨 Herramientas de Dibujo
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                setMaskMode('inpaint');
                if (isPanning) togglePanMode();
              }}
              className={`px-5 py-3 rounded-lg font-medium transition-all flex items-center gap-3 text-left ${
                maskMode === 'inpaint' && !isPanning
                  ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              disabled={!canvasReady}
            >
              <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-semibold">Pincel Rojo - Modificar</div>
                <div className="text-xs opacity-75">Marca las zonas que la IA debe editar</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMaskMode('safe-zone');
                if (isPanning) togglePanMode();
              }}
              className={`px-5 py-3 rounded-lg font-medium transition-all flex items-center gap-3 text-left ${
                maskMode === 'safe-zone' && !isPanning
                  ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              disabled={!canvasReady}
            >
              <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-semibold">Pincel Verde - Proteger</div>
                <div className="text-xs opacity-75">Marca las zonas que NO deben cambiar</div>
              </div>
            </button>

            <button
              onClick={() => {
                setMaskMode('erase');
                if (isPanning) togglePanMode();
              }}
              className={`px-5 py-3 rounded-lg font-medium transition-all flex items-center gap-3 text-left ${
                maskMode === 'erase' && !isPanning
                  ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              disabled={!canvasReady}
            >
              <span className="text-xl flex-shrink-0">🧹</span>
              <div className="flex-1">
                <div className="font-semibold">Borrador</div>
                <div className="text-xs opacity-75">Elimina trazos rojos o verdes</div>
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Tools Section */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            🧭 Navegación
          </h3>
          <button
            onClick={togglePanMode}
            className={`w-full px-5 py-3 rounded-lg font-medium transition-all flex items-center gap-3 ${
              isPanning
                ? 'bg-yellow-600 text-white shadow-lg ring-2 ring-yellow-400'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={!canvasReady}
          >
            <span className="text-xl flex-shrink-0">🤚</span>
            <div className="flex-1 text-left">
              <div className="font-semibold">Modo Mover</div>
              <div className="text-xs opacity-75">Arrastra para desplazar la imagen</div>
            </div>
          </button>
        </div>

        {/* Brush Size Section */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            ✏️ Tamaño de Pincel
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="flex-1"
              disabled={!canvasReady}
            />
            <span className="text-gray-300 font-mono font-bold text-lg w-16 text-right">{brushSize}px</span>
          </div>
        </div>

        {/* Zoom Section */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            🔍 Zoom
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom(-0.25)}
              className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold disabled:opacity-50"
              disabled={!canvasReady}
            >
              −
            </button>
            <span className="text-gray-300 font-mono font-bold text-lg w-20 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => handleZoom(0.25)}
              className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold disabled:opacity-50"
              disabled={!canvasReady}
            >
              +
            </button>
            <button
              onClick={resetZoom}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-medium disabled:opacity-50"
              disabled={!canvasReady}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Actions Section */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            ⚡ Acciones
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={undo}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-medium disabled:opacity-50"
              disabled={!canvasReady}
            >
              ↶ Deshacer
            </button>
            <button
              onClick={clearMask}
              className="px-4 py-2 bg-red-900/50 text-red-200 rounded-lg hover:bg-red-900/70 font-medium border border-red-800 disabled:opacity-50"
              disabled={!canvasReady}
            >
              ✕ Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-2">
        <p className="text-gray-300 font-semibold">💡 Instrucciones de máscaras:</p>
        <div className="space-y-1">
          <p className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-red-400 font-semibold">Inpainting:</span>
            <span>Marca las áreas que quieres <strong>modificar</strong> con IA</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-green-400 font-semibold">Zona Segura:</span>
            <span>Marca las áreas que quieres <strong>mantener sin cambios</strong></span>
          </p>
          <p>
            <span className="text-blue-400 font-semibold">Borrar:</span> Elimina cualquier trazo de la máscara
          </p>
          <p>
            <span className="text-yellow-400 font-semibold">Mover:</span> Desplázate por el canvas cuando hagas zoom
          </p>
        </div>
        <p className="text-xs text-gray-500 pt-2 border-t border-gray-700">
          <strong>Tip:</strong> Todos los trazos se acumulan. Puedes hacer múltiples trazos para ampliar la máscara.
          Usa zoom (+/−) para mayor precisión.
        </p>
      </div>
    </div>
  );
}
