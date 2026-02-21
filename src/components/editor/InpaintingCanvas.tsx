/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
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

function InpaintingCanvasInner({
  imageUrl,
  onMaskChange,
  onSafeZoneMaskChange,
  className = '',
}: InpaintingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  // Track whether the canvas was disposed (for strict mode safety)
  const disposedRef = useRef(false);
  // Track image position/scale on canvas for mask coordinate alignment
  const imageBoundsRef = useRef<{
    left: number;
    top: number;
    scale: number;
    originalWidth: number;
    originalHeight: number;
  } | null>(null);
  // Store callbacks in refs so path:created handler always sees latest without re-registering
  const onMaskChangeRef = useRef(onMaskChange);
  const onSafeZoneMaskChangeRef = useRef(onSafeZoneMaskChange);
  onMaskChangeRef.current = onMaskChange;
  onSafeZoneMaskChangeRef.current = onSafeZoneMaskChange;

  const [brushSize, setBrushSize] = useState(20);
  const [maskMode, setMaskMode] = useState<MaskMode>('inpaint');
  const [canvasReady, setCanvasReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [pathCount, setPathCount] = useState(0);

  // Redo stack: stores paths removed by undo, cleared on new path creation
  const redoStackRef = useRef<any[]>([]);

  // Refs for values needed inside the stable path:created handler
  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = Math.max(600, window.innerHeight - 300);

    disposedRef.current = false;

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
      // Guard: if canvas was disposed (React strict mode double-fire), skip setup
      if (disposedRef.current || fabricCanvasRef.current !== canvas) {
        console.log('[InpaintingCanvas] Skipping setup for disposed canvas');
        return;
      }

      if (!img) return;

      // Scale image to fit canvas
      const scale = Math.min(
        (canvas.width! * 0.9) / (img.width || 1),
        (canvas.height! * 0.9) / (img.height || 1)
      );

      img.scale(scale);
      const imgLeft = (canvas.width! - (img.width || 0) * scale) / 2;
      const imgTop = (canvas.height! - (img.height || 0) * scale) / 2;
      img.set({
        left: imgLeft,
        top: imgTop,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });

      // Store image bounds for mask coordinate alignment
      imageBoundsRef.current = {
        left: imgLeft,
        top: imgTop,
        scale,
        originalWidth: img.width || 1,
        originalHeight: img.height || 1,
      };

      // Set as background
      canvas.backgroundImage = img;
      canvas.renderAll();

      // Enable drawing mode AFTER image is loaded and rendered
      canvas.isDrawingMode = true;

      // Configure the brush
      const brush = new PencilBrush(canvas);
      brush.width = brushSizeRef.current;
      brush.color = 'rgba(255, 0, 0, 0.6)';
      brush.strokeLineCap = 'round';
      brush.strokeLineJoin = 'round';
      (brush as any).maskType = 'inpaint';

      canvas.freeDrawingBrush = brush;

      // Register path:created handler directly on this canvas instance
      // This avoids re-registration from React effect dependency changes
      canvas.on('path:created', (e: any) => {
        const path = e.path as Path;
        if (!path) return;

        const currentBrush = canvas.freeDrawingBrush;
        const currentMaskType = currentBrush ? (currentBrush as any).maskType || 'inpaint' : 'inpaint';

        if (currentMaskType === 'erase') {
          // Remove the eraser path
          canvas.remove(path);

          // Remove paths that intersect with the eraser stroke
          const eraserBounds = path.getBoundingRect();
          const allPaths = canvas.getObjects('path');

          allPaths.forEach((existingPath: any) => {
            if (existingPath === path) return;
            const pathBounds = existingPath.getBoundingRect();
            if (
              eraserBounds.left < pathBounds.left + pathBounds.width &&
              eraserBounds.left + eraserBounds.width > pathBounds.left &&
              eraserBounds.top < pathBounds.top + pathBounds.height &&
              eraserBounds.top + eraserBounds.height > pathBounds.top
            ) {
              canvas.remove(existingPath);
            }
          });
        } else {
          // Store mask type on the path
          path.maskType = currentMaskType;
        }

        // New path drawn → clear redo stack (standard undo/redo behavior)
        redoStackRef.current = [];

        // CRITICAL: Force synchronous render so the path appears immediately
        // before any React re-render can interfere
        canvas.renderAll();

        // Update path count for UI
        const count = canvas.getObjects('path').length;
        setPathCount(count);

        // Defer mask export to avoid triggering React state updates
        // during the Fabric.js event handling cycle
        setTimeout(() => {
          if (disposedRef.current) return;
          doExportMask(canvas);
        }, 0);
      });

      console.log('[InpaintingCanvas] Canvas initialized:', {
        isDrawingMode: canvas.isDrawingMode,
        brushWidth: brush.width,
        canvasSize: { width: canvas.width, height: canvas.height },
        imageBounds: imageBoundsRef.current,
      });

      setCanvasReady(true);
    }).catch((error) => {
      console.error('[InpaintingCanvas] Error loading image:', error);
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
      disposedRef.current = true;
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable init, only re-run on imageUrl change
  }, [imageUrl]);

  // Export mask helper — reads canvas state and calls parent callbacks via refs
  const doExportMask = useCallback((canvas: Canvas) => {
    const objects = canvas.getObjects();

    if (objects.length === 0) {
      onMaskChangeRef.current?.(null);
      onSafeZoneMaskChangeRef.current?.(null);
      return;
    }

    const width = canvas.width || 800;
    const height = canvas.height || 600;
    const currentBrushSize = brushSizeRef.current;

    // Separate paths by type
    const inpaintPaths: any[] = [];
    const safeZonePaths: any[] = [];

    objects.forEach((obj) => {
      if (obj.type === 'path') {
        const path = obj as any;
        const maskType = path.maskType || 'inpaint';

        if (maskType === 'inpaint') {
          inpaintPaths.push(path);
        } else if (maskType === 'safe-zone') {
          safeZonePaths.push(path);
        }
      }
    });

    // Export inpaint mask
    const inpaintMask = renderPathsToMask(inpaintPaths, width, height, currentBrushSize);
    onMaskChangeRef.current?.(inpaintMask);

    // Export safe zone mask
    const safeZoneMask = renderPathsToMask(safeZonePaths, width, height, currentBrushSize);
    onSafeZoneMaskChangeRef.current?.(safeZoneMask);
  }, []);

  // Render paths to a mask image, cropped to the image area
  const renderPathsToMask = useCallback((
    paths: any[],
    canvasWidth: number,
    canvasHeight: number,
    defaultBrushSize: number,
  ): string | null => {
    if (paths.length === 0) return null;

    // Step 1: Render paths at full canvas dimensions (canvas coordinate space)
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = canvasWidth;
    fullCanvas.height = canvasHeight;
    const ctx = fullCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    paths.forEach((path, i) => {
      ctx.lineWidth = path.strokeWidth || defaultBrushSize;
      ctx.save();

      // Use Fabric.js's own transform matrix to position the path correctly.
      const m = path.calcTransformMatrix();

      // DEBUG: Log transform details for first path
      if (i === 0) {
        console.log('[MASK_DEBUG] Path transform:', {
          left: path.left,
          top: path.top,
          width: path.width,
          height: path.height,
          originX: path.originX,
          originY: path.originY,
          pathOffset: path.pathOffset ? { x: path.pathOffset.x, y: path.pathOffset.y } : null,
          matrix: [m[0], m[1], m[2], m[3], m[4], m[5]],
          strokeWidth: path.strokeWidth,
          firstCmd: path.path?.[0],
          hasCalcTransformMatrix: typeof path.calcTransformMatrix === 'function',
        });
      }

      ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

      // Replicate Fabric.js _renderPathCommands: offset by -pathOffset
      const l = -(path.pathOffset?.x || 0);
      const t = -(path.pathOffset?.y || 0);

      ctx.beginPath();

      const pathData = path.path;
      if (pathData) {
        pathData.forEach((segment: any) => {
          const cmd = segment[0];
          if (cmd === 'M') {
            ctx.moveTo(segment[1] + l, segment[2] + t);
          } else if (cmd === 'Q') {
            ctx.quadraticCurveTo(
              segment[1] + l, segment[2] + t,
              segment[3] + l, segment[4] + t,
            );
          } else if (cmd === 'L') {
            ctx.lineTo(segment[1] + l, segment[2] + t);
          } else if (cmd === 'C') {
            ctx.bezierCurveTo(
              segment[1] + l, segment[2] + t,
              segment[3] + l, segment[4] + t,
              segment[5] + l, segment[6] + t,
            );
          }
        });
        ctx.stroke();
      }
      ctx.restore();
    });

    // Step 2: Crop to image bounds so mask aligns with image content
    const bounds = imageBoundsRef.current;
    if (bounds) {
      const displayedWidth = bounds.originalWidth * bounds.scale;
      const displayedHeight = bounds.originalHeight * bounds.scale;

      console.log('[MASK_DEBUG] Crop params:', {
        canvasSize: { width: canvasWidth, height: canvasHeight },
        imageBounds: { left: bounds.left, top: bounds.top, scale: bounds.scale },
        displayedSize: { width: displayedWidth, height: displayedHeight },
        originalSize: { width: bounds.originalWidth, height: bounds.originalHeight },
        cropSource: `(${bounds.left}, ${bounds.top}) ${displayedWidth}x${displayedHeight}`,
        cropDest: `(0, 0) ${bounds.originalWidth}x${bounds.originalHeight}`,
      });

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = bounds.originalWidth;
      cropCanvas.height = bounds.originalHeight;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        // Black fill ensures areas outside drawn strokes remain black (= preserve original)
        cropCtx.fillStyle = '#000000';
        cropCtx.fillRect(0, 0, bounds.originalWidth, bounds.originalHeight);
        // Copy only the image region from the full canvas, scaled to original dimensions
        cropCtx.drawImage(
          fullCanvas,
          bounds.left, bounds.top,          // source: image position on canvas
          displayedWidth, displayedHeight,  // source: displayed image size
          0, 0,                             // dest: fill entire crop canvas
          bounds.originalWidth, bounds.originalHeight,
        );
        return cropCanvas.toDataURL('image/png');
      }
    }

    // Fallback: return full canvas mask if bounds not available
    return fullCanvas.toDataURL('image/png');
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (ctrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update brush when settings change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvas.freeDrawingBrush) return;

    const brush = canvas.freeDrawingBrush as PencilBrush;
    brush.width = brushSize;

    if (maskMode === 'inpaint') {
      brush.color = 'rgba(255, 0, 0, 0.6)';
      (brush as any).maskType = 'inpaint';
    } else if (maskMode === 'safe-zone') {
      brush.color = 'rgba(0, 255, 0, 0.6)';
      (brush as any).maskType = 'safe-zone';
    } else {
      brush.color = 'rgba(0, 0, 0, 1)';
      (brush as any).maskType = 'erase';
    }
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
    } else {
      canvas.isDrawingMode = true;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
    }
  }, [isPanning]);

  const clearMask = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      canvas.remove(obj);
    });

    canvas.renderAll();
    setPathCount(0);
    redoStackRef.current = [];
    onMaskChangeRef.current?.(null);
    onSafeZoneMaskChangeRef.current?.(null);
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length > 0) {
      const removed = objects[objects.length - 1];
      canvas.remove(removed);
      redoStackRef.current.push(removed);
      canvas.renderAll();
      setPathCount(canvas.getObjects('path').length);
      setTimeout(() => doExportMask(canvas), 0);
    }
  };

  const redo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const path = redoStackRef.current.pop();
    if (path) {
      canvas.add(path);
      canvas.renderAll();
      setPathCount(canvas.getObjects('path').length);
      setTimeout(() => doExportMask(canvas), 0);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative border-2 border-gray-700 rounded-lg overflow-hidden bg-gray-800"
        style={{ touchAction: 'none' }}
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

        {/* Mode indicator + path count */}
        {canvasReady && (
          <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2">
            {isPanning ? (
              <>Modo mover</>
            ) : maskMode === 'inpaint' ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                Inpainting
              </>
            ) : maskMode === 'safe-zone' ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                Zona segura
              </>
            ) : (
              <>Borrador</>
            )}
            {pathCount > 0 && (
              <span className="ml-1 text-gray-400">| {pathCount} trazos</span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
        {/* Drawing Tools Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            Herramientas de Dibujo
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
              <span className="text-xl flex-shrink-0">x</span>
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
            Navegacion
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
            <span className="text-xl flex-shrink-0">H</span>
            <div className="flex-1 text-left">
              <div className="font-semibold">Modo Mover</div>
              <div className="text-xs opacity-75">Arrastra para desplazar la imagen</div>
            </div>
          </button>
        </div>

        {/* Brush Size Section */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
            Tamano de Pincel
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
            Zoom
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom(-0.25)}
              className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold disabled:opacity-50"
              disabled={!canvasReady}
            >
              -
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
            Acciones
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={undo}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-medium disabled:opacity-50"
              disabled={!canvasReady}
              title="Ctrl+Z"
            >
              Deshacer
            </button>
            <button
              onClick={redo}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-medium disabled:opacity-50"
              disabled={!canvasReady}
              title="Ctrl+Shift+Z"
            >
              Rehacer
            </button>
            <button
              onClick={clearMask}
              className="px-4 py-2 bg-red-900/50 text-red-200 rounded-lg hover:bg-red-900/70 font-medium border border-red-800 disabled:opacity-50"
              disabled={!canvasReady}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-2">
        <p className="text-gray-300 font-semibold">Instrucciones de mascaras:</p>
        <div className="space-y-1">
          <p className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-red-400 font-semibold">Inpainting:</span>
            <span>Marca las areas que quieres <strong>modificar</strong> con IA</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-green-400 font-semibold">Zona Segura:</span>
            <span>Marca las areas que quieres <strong>mantener sin cambios</strong></span>
          </p>
          <p>
            <span className="text-blue-400 font-semibold">Borrar:</span> Elimina cualquier trazo de la mascara
          </p>
          <p>
            <span className="text-yellow-400 font-semibold">Mover:</span> Desplazate por el canvas cuando hagas zoom
          </p>
        </div>
        <p className="text-xs text-gray-500 pt-2 border-t border-gray-700">
          <strong>Tip:</strong> Todos los trazos se acumulan. Puedes hacer multiples trazos para ampliar la mascara.
          Usa zoom (+/-) para mayor precision.
        </p>
      </div>
    </div>
  );
}

// Wrap in React.memo to prevent re-renders from parent state changes
const InpaintingCanvas = memo(InpaintingCanvasInner);
export default InpaintingCanvas;
