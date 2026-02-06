'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, PencilBrush } from 'fabric';

interface InpaintingCanvasProps {
  imageUrl: string;
  onMaskChange?: (maskDataUrl: string | null) => void;
  className?: string;
}

export default function InpaintingCanvas({
  imageUrl,
  onMaskChange,
  className = '',
}: InpaintingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [brushMode, setBrushMode] = useState<'draw' | 'erase'>('draw');
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
      brush.color = 'rgba(255, 0, 0, 0.7)';
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

    if (brushMode === 'draw') {
      brush.color = 'rgba(255, 0, 0, 0.7)';
    } else {
      brush.color = 'rgba(0, 0, 0, 0.7)';
    }

    console.log('Brush updated:', {
      mode: brushMode,
      width: brush.width,
      color: brush.color,
      isDrawingMode: canvas.isDrawingMode
    });
  }, [brushSize, brushMode]);

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const newZoom = Math.max(0.5, Math.min(3, zoom + delta));
    setZoom(newZoom);

    const center = canvas.getCenter();
    canvas.zoomToPoint({ x: center.left, y: center.top }, newZoom);
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
      return;
    }

    // Create a temporary canvas for the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width || 800;
    maskCanvas.height = canvas.height || 600;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // Fill with black (no edit)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw all paths in white (edit areas)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    objects.forEach((obj) => {
      if (obj.type === 'path') {
        const path = obj as any;
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
      }
    });

    const maskDataUrl = maskCanvas.toDataURL('image/png');
    console.log('Mask exported:', { pathCount: objects.length });
    onMaskChange?.(maskDataUrl);
  }, [brushSize, onMaskChange]);

  // Notify parent of mask changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handlePathCreated = (e: any) => {
      console.log('Path created:', e);
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
    console.log('Mask cleared');
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

        {/* Drawing mode indicator */}
        {canvasReady && (
          <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
            {isPanning ? '🤚 Pan activo' : '✏️ Modo dibujo activo'}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center bg-gray-800 p-4 rounded-lg border border-gray-700">
        {/* Brush Mode */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setBrushMode('draw');
              if (isPanning) togglePanMode();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              brushMode === 'draw' && !isPanning
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={!canvasReady}
          >
            ✏️ Dibujar
          </button>
          <button
            onClick={() => {
              setBrushMode('erase');
              if (isPanning) togglePanMode();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              brushMode === 'erase' && !isPanning
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={!canvasReady}
          >
            🧹 Borrar
          </button>
          <button
            onClick={togglePanMode}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isPanning
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={!canvasReady}
          >
            🤚 Mover
          </button>
        </div>

        <div className="w-px h-8 bg-gray-600"></div>

        {/* Brush Size */}
        <div className="flex items-center gap-3">
          <label className="text-gray-300 text-sm font-medium">Tamaño:</label>
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32"
            disabled={!canvasReady}
          />
          <span className="text-gray-300 text-sm w-10 text-right">{brushSize}px</span>
        </div>

        <div className="w-px h-8 bg-gray-600"></div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(-0.25)}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold disabled:opacity-50"
            title="Zoom out"
            disabled={!canvasReady}
          >
            −
          </button>
          <button
            onClick={resetZoom}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 text-sm disabled:opacity-50"
            title="Reset zoom"
            disabled={!canvasReady}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => handleZoom(0.25)}
            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 font-bold disabled:opacity-50"
            title="Zoom in"
            disabled={!canvasReady}
          >
            +
          </button>
        </div>

        <div className="w-px h-8 bg-gray-600"></div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={undo}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            disabled={!canvasReady}
          >
            ↶ Deshacer
          </button>
          <button
            onClick={clearMask}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            disabled={!canvasReady}
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg border border-gray-700">
        <p>
          <strong className="text-gray-300">💡 Instrucciones:</strong>
          Usa <span className="text-red-400 font-semibold">Dibujar</span> para pintar las áreas que quieres editar (aparecerán en rojo).
          Usa <span className="text-blue-400 font-semibold">Borrar</span> para eliminar partes de la máscara.
          Usa <span className="text-green-400 font-semibold">Mover</span> para desplazarte cuando hagas zoom.
          Controla el zoom con los botones <strong>+ / −</strong>.
        </p>
      </div>
    </div>
  );
}
