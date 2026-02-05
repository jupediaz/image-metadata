'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, Path } from 'fabric';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [brushMode, setBrushMode] = useState<'draw' | 'erase'>('draw');
  const [canvasReady, setCanvasReady] = useState(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      width: 800,
      height: 600,
      backgroundColor: '#000000',
    });

    fabricCanvasRef.current = canvas;

    // Load background image
    FabricImage.fromURL(imageUrl).then((img) => {
      if (!img) return;

      // Scale image to fit canvas
      const scale = Math.min(
        canvas.width! / (img.width || 1),
        canvas.height! / (img.height || 1)
      );

      img.scale(scale);
      img.set({
        left: (canvas.width! - (img.width || 0) * scale) / 2,
        top: (canvas.height! - (img.height || 0) * scale) / 2,
        selectable: false,
        evented: false,
      });

      canvas.backgroundImage = img;
      canvas.renderAll();
      setCanvasReady(true);
    });

    // Set initial brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)'; // Red semi-transparent
    }

    // Cleanup
    return () => {
      canvas.dispose();
    };
  }, [imageUrl]);

  // Update brush when settings change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas?.freeDrawingBrush) return;

    canvas.freeDrawingBrush.width = brushSize;

    if (brushMode === 'draw') {
      canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)'; // Red for drawing
    } else {
      // For eraser, we use a white brush that will be inverted later
      canvas.freeDrawingBrush.color = 'rgba(0, 0, 0, 0.5)'; // Black for erasing
    }
  }, [brushSize, brushMode]);

  const exportMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

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
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (obj.type === 'path') {
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = (obj as { strokeWidth?: number }).strokeWidth || brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const path = obj as Path;
        const pathData = path.path;
        if (!pathData) return;

        ctx.beginPath();
        pathData.forEach((segment) => {
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
        ctx.restore();
      }
    });

    const maskDataUrl = maskCanvas.toDataURL('image/png');
    onMaskChange?.(objects.length > 0 ? maskDataUrl : null);
  }, [brushSize, onMaskChange]);

  // Notify parent of mask changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleModified = () => {
      exportMask();
    };

    canvas.on('path:created', handleModified);

    return () => {
      canvas.off('path:created', handleModified);
    };
  }, [exportMask]);

  const clearMask = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (obj.type === 'path') {
        canvas.remove(obj);
      }
    });

    canvas.renderAll();
    onMaskChange?.(null);
  };

  const undo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
      exportMask();
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Canvas */}
      <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-black">
        <canvas ref={canvasRef} />
        {!canvasReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading image...</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Brush Mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setBrushMode('draw')}
            className={`px-4 py-2 rounded ${
              brushMode === 'draw'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Draw Mask
          </button>
          <button
            onClick={() => setBrushMode('erase')}
            className={`px-4 py-2 rounded ${
              brushMode === 'erase'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Erase
          </button>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <label className="text-gray-300 text-sm">Brush Size:</label>
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-gray-400 text-sm w-8">{brushSize}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={undo}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Undo
          </button>
          <button
            onClick={clearMask}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            Clear Mask
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-400">
        <p>
          <strong className="text-gray-300">Instructions:</strong> Paint over the areas you want to edit.
          Red areas will be modified according to your prompt.
        </p>
      </div>
    </div>
  );
}
