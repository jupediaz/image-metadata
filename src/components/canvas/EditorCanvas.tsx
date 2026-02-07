/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, FabricImage, PencilBrush, Point } from 'fabric';
import { useImageStore } from '@/hooks/useImageStore';
import { type EditorTool } from '../layout/EditorShell';

interface EditorCanvasProps {
  imageUrl: string;
  activeTool: EditorTool;
  brushSize: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onCursorMove: (pos: { x: number; y: number } | null) => void;
}

export default function EditorCanvas({
  imageUrl,
  activeTool,
  brushSize,
  zoom,
  onZoomChange,
  onCursorMove,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const setEditorMask = useImageStore((s) => s.setEditorMask);

  // Export mask from canvas paths
  const exportMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length === 0) {
      setEditorMask(null);
      return;
    }

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width || 800;
    maskCanvas.height = canvas.height || 600;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
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
            if (cmd === 'M') ctx.moveTo(segment[1], segment[2]);
            else if (cmd === 'Q') ctx.quadraticCurveTo(segment[1], segment[2], segment[3], segment[4]);
            else if (cmd === 'L') ctx.lineTo(segment[1], segment[2]);
          });
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    setEditorMask(maskCanvas.toDataURL('image/png'));
  }, [brushSize, setEditorMask]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    const canvas = new Canvas(canvasRef.current, {
      width: w,
      height: h,
      backgroundColor: '#2d2d2d',
      selection: false,
    });

    fabricCanvasRef.current = canvas;

    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      if (!img || !canvas) return;

      const scale = Math.min(
        (w * 0.9) / (img.width || 1),
        (h * 0.9) / (img.height || 1)
      );

      img.scale(scale);
      img.set({
        left: (w - (img.width || 0) * scale) / 2,
        top: (h - (img.height || 0) * scale) / 2,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });

      canvas.backgroundImage = img;
      canvas.renderAll();

      // Start in drawing mode
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.width = brushSize;
      brush.color = 'rgba(255, 0, 0, 0.7)';
      brush.strokeLineCap = 'round';
      brush.strokeLineJoin = 'round';
      canvas.freeDrawingBrush = brush;

      setCanvasReady(true);
    });

    // Resize handler
    const handleResize = () => {
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      canvas.setWidth(newW);
      canvas.setHeight(newH);
      canvas.renderAll();
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Path created -> export mask
    canvas.on('path:created', () => exportMask());

    return () => {
      ro.disconnect();
      canvas.dispose();
    };
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update tool mode
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    // Remove custom pan handlers
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    canvas.off('object:modified');

    if (activeTool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';

      // Make all drawn paths selectable and movable
      canvas.getObjects().forEach((obj) => {
        obj.set({ selectable: true, evented: true, hasControls: true, hasBorders: true });
      });
      canvas.renderAll();

      // Re-export mask when objects are moved/scaled
      canvas.on('object:modified', () => exportMask());
    } else if (activeTool === 'brush' || activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();

      // Lock all objects so they don't interfere with drawing
      canvas.getObjects().forEach((obj) => {
        obj.set({ selectable: false, evented: false });
      });
      canvas.renderAll();

      if (canvas.freeDrawingBrush) {
        const brush = canvas.freeDrawingBrush as PencilBrush;
        brush.width = brushSize;
        brush.color = activeTool === 'brush'
          ? 'rgba(255, 0, 0, 0.7)'
          : 'rgba(0, 0, 0, 0.7)';
      }
    } else if (activeTool === 'pan') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'grab';
      canvas.hoverCursor = 'grab';
      canvas.discardActiveObject();

      canvas.getObjects().forEach((obj) => {
        obj.set({ selectable: false, evented: false });
      });
      canvas.renderAll();

      let lastX = 0;
      let lastY = 0;
      let isDragging = false;

      canvas.on('mouse:down', (opt: any) => {
        isDragging = true;
        lastX = opt.e.clientX;
        lastY = opt.e.clientY;
        canvas.defaultCursor = 'grabbing';
      });

      canvas.on('mouse:move', (opt: any) => {
        if (!isDragging) return;
        const vpt = canvas.viewportTransform;
        if (!vpt) return;
        vpt[4] += opt.e.clientX - lastX;
        vpt[5] += opt.e.clientY - lastY;
        canvas.requestRenderAll();
        lastX = opt.e.clientX;
        lastY = opt.e.clientY;
      });

      canvas.on('mouse:up', () => {
        isDragging = false;
        canvas.defaultCursor = 'grab';
      });
    } else if (activeTool === 'zoom') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'zoom-in';
      canvas.discardActiveObject();
      canvas.getObjects().forEach((obj) => {
        obj.set({ selectable: false, evented: false });
      });
      canvas.renderAll();
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'default';
    }
  }, [activeTool, brushSize, canvasReady, exportMask]);

  // Delete/Backspace to remove selected objects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const canvas = fabricCanvasRef.current;
      if (!canvas || activeTool !== 'select') return;

      const active = canvas.getActiveObjects();
      if (active.length === 0) return;

      e.preventDefault();
      active.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      exportMask();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, exportMask]);

  // Update brush size
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas?.freeDrawingBrush) return;
    canvas.freeDrawingBrush.width = brushSize;
  }, [brushSize]);

  // Handle wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
      onZoomChange(newZoom);

      const point = canvas.getPointer(e as any);
      canvas.zoomToPoint(new Point(point.x, point.y), newZoom);
      canvas.renderAll();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoomChange]);

  // Track cursor position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      onCursorMove({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseLeave = () => onCursorMove(null);

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [onCursorMove]);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} />
      {!canvasReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2d2d2d]">
          <div className="flex flex-col items-center gap-2 text-[#858585]">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#3c3c3c] border-t-blue-500" />
            <span className="text-xs">Loading image...</span>
          </div>
        </div>
      )}
    </div>
  );
}
