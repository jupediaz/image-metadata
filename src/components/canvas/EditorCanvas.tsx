/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas, FabricImage, PencilBrush, Point, Rect } from 'fabric';
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

export interface EditorCanvasHandle {
  fitAll: () => void;
  fitWidth: () => void;
  fitHeight: () => void;
  exportImage: () => void;
}

const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  { imageUrl, activeTool, brushSize, zoom, onZoomChange, onCursorMove },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const imageBoundsRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
  const imageClipRef = useRef<Rect | null>(null);
  const activeToolRef = useRef<EditorTool>(activeTool);
  const [canvasReady, setCanvasReady] = useState(false);

  const setEditorInpaintMask = useImageStore((s) => s.setEditorInpaintMask);
  const setEditorProtectMask = useImageStore((s) => s.setEditorProtectMask);

  // Keep activeToolRef in sync
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Export dual masks from canvas paths
  const exportMasks = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length === 0) {
      setEditorInpaintMask(null);
      setEditorProtectMask(null);
      return;
    }

    // Separate paths by type (inpaint vs protect)
    const inpaintPaths = objects.filter((obj: any) => obj.type === 'path' && obj.maskType === 'inpaint');
    const protectPaths = objects.filter((obj: any) => obj.type === 'path' && obj.maskType === 'protect');

    // Create inpaint mask (green zones)
    if (inpaintPaths.length > 0) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width || 800;
      maskCanvas.height = canvas.height || 600;
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        inpaintPaths.forEach((obj) => {
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
        });

        setEditorInpaintMask(maskCanvas.toDataURL('image/png'));
      }
    } else {
      setEditorInpaintMask(null);
    }

    // Create protect mask (red zones)
    if (protectPaths.length > 0) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = canvas.width || 800;
      maskCanvas.height = canvas.height || 600;
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        protectPaths.forEach((obj) => {
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
        });

        setEditorProtectMask(maskCanvas.toDataURL('image/png'));
      }
    } else {
      setEditorProtectMask(null);
    }
  }, [brushSize, setEditorInpaintMask, setEditorProtectMask]);

  // Fit helpers
  const fitAll = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
    onZoomChange(1);
  }, [onZoomChange]);

  const fitWidth = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const bounds = imageBoundsRef.current;
    if (bounds.width === 0) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const newZoom = (containerW * 0.95) / bounds.width;

    const imgCenterX = bounds.left + bounds.width / 2;
    const imgCenterY = bounds.top + bounds.height / 2;
    const panX = containerW / 2 - imgCenterX * newZoom;
    const panY = containerH / 2 - imgCenterY * newZoom;

    canvas.setViewportTransform([newZoom, 0, 0, newZoom, panX, panY]);
    canvas.renderAll();
    onZoomChange(newZoom);
  }, [onZoomChange]);

  const fitHeight = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const bounds = imageBoundsRef.current;
    if (bounds.height === 0) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const newZoom = (containerH * 0.95) / bounds.height;

    const imgCenterX = bounds.left + bounds.width / 2;
    const imgCenterY = bounds.top + bounds.height / 2;
    const panX = containerW / 2 - imgCenterX * newZoom;
    const panY = containerH / 2 - imgCenterY * newZoom;

    canvas.setViewportTransform([newZoom, 0, 0, newZoom, panX, panY]);
    canvas.renderAll();
    onZoomChange(newZoom);
  }, [onZoomChange]);

  const exportImage = useCallback(() => {
    // Download the current image
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'image-export.png';
    link.click();
  }, [imageUrl]);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({ fitAll, fitWidth, fitHeight, exportImage }), [
    fitAll,
    fitWidth,
    fitHeight,
    exportImage,
  ]);

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
        (h * 0.9) / (img.height || 1),
      );

      const imgLeft = (w - (img.width || 0) * scale) / 2;
      const imgTop = (h - (img.height || 0) * scale) / 2;
      const imgW = (img.width || 0) * scale;
      const imgH = (img.height || 0) * scale;

      img.scale(scale);
      img.set({
        left: imgLeft,
        top: imgTop,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });

      // Store image bounds for fit operations and path clipping
      imageBoundsRef.current = { left: imgLeft, top: imgTop, width: imgW, height: imgH };

      // Create a clip rect matching the image area (used for each drawn path)
      imageClipRef.current = new Rect({
        left: imgLeft,
        top: imgTop,
        width: imgW,
        height: imgH,
        absolutePositioned: true,
      });

      canvas.backgroundImage = img;
      canvas.renderAll();

      // Start in drawing mode with green brush (inpaint)
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.width = brushSize;
      brush.color = 'rgba(0, 255, 0, 0.7)'; // Green for inpaint zones
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

    // Path created -> tag with mask type, clip to image area, export masks
    canvas.on('path:created', (e: any) => {
      const path = e.path;
      if (path) {
        // Tag path with mask type based on active tool
        const tool = activeToolRef.current;
        if (tool === 'brush') {
          path.maskType = 'inpaint';
        } else if (tool === 'protect') {
          path.maskType = 'protect';
        }

        // Clip to image area
        if (imageClipRef.current) {
          path.clipPath = imageClipRef.current;
        }
        canvas.renderAll();
      }
      exportMasks();
    });

    return () => {
      ro.disconnect();
      canvas.dispose();
    };
  }, [imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update tool mode
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    // Remove custom handlers
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    canvas.off('object:modified');

    if (activeTool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';

      canvas.getObjects().forEach((obj) => {
        obj.set({ selectable: true, evented: true, hasControls: true, hasBorders: true });
      });
      canvas.renderAll();

      canvas.on('object:modified', () => exportMasks());
    } else if (activeTool === 'brush' || activeTool === 'protect' || activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();

      canvas.getObjects().forEach((obj) => {
        obj.set({ selectable: false, evented: false });
      });
      canvas.renderAll();

      if (canvas.freeDrawingBrush) {
        const brush = canvas.freeDrawingBrush as PencilBrush;
        brush.width = brushSize;

        // Set color based on tool: green for inpaint, red for protect, black for eraser
        if (activeTool === 'brush') {
          brush.color = 'rgba(0, 255, 0, 0.7)'; // Green - zones where AI CAN edit
        } else if (activeTool === 'protect') {
          brush.color = 'rgba(255, 0, 0, 0.7)'; // Red - zones where AI CANNOT edit
        } else {
          brush.color = 'rgba(0, 0, 0, 0.7)'; // Black - eraser
        }
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
  }, [activeTool, brushSize, canvasReady, exportMasks]);

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
      exportMasks();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, exportMasks]);

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
      onCursorMove({ x: e.clientX - rect.left, y: e.clientY - rect.top });
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
});

export default EditorCanvas;
