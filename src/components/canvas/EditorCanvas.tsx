/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas, FabricImage, PencilBrush, Point, Rect, Group, LayoutManager, FixedLayout } from 'fabric';
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
  clearMasks: () => void;
  clearInpaintMask: () => void;
  clearProtectMask: () => void;
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
  const zoomFromCanvasRef = useRef(false);
  const inpaintGroupRef = useRef<Group | null>(null);
  const protectGroupRef = useRef<Group | null>(null);
  const eraseGroupRef = useRef<Group | null>(null); // New: group for eraser strokes
  const [canvasReady, setCanvasReady] = useState(false);

  const setEditorInpaintMask = useImageStore((s) => s.setEditorInpaintMask);
  const setEditorProtectMask = useImageStore((s) => s.setEditorProtectMask);

  // Keep activeToolRef in sync
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Helper: render paths to a B/W mask canvas with erase support
  const renderPathsToMask = useCallback((paths: any[], erasePaths: any[], width: number, height: number): string | null => {
    if (paths.length === 0 && erasePaths.length === 0) return null;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return null;

    // Start with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw positive paths in white
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    paths.forEach((path: any) => {
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

    // Draw erase paths in black (subtracting from the mask)
    ctx.strokeStyle = '#000000';
    erasePaths.forEach((path: any) => {
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

    return maskCanvas.toDataURL('image/png');
  }, [brushSize]);

  // Export dual masks from group paths with erase support
  const exportMasks = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const w = canvas.width || 800;
    const h = canvas.height || 600;

    // Get paths from groups
    const inpaintPaths = inpaintGroupRef.current?.getObjects() || [];
    const protectPaths = protectGroupRef.current?.getObjects() || [];
    const erasePaths = eraseGroupRef.current?.getObjects() || [];

    // Apply erase paths to both masks (they subtract from both)
    setEditorInpaintMask(renderPathsToMask(inpaintPaths, erasePaths, w, h));
    setEditorProtectMask(renderPathsToMask(protectPaths, erasePaths, w, h));
  }, [renderPathsToMask, setEditorInpaintMask, setEditorProtectMask]);

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

  const clearMasks = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Clear all groups including erase
    inpaintGroupRef.current?.removeAll();
    protectGroupRef.current?.removeAll();
    eraseGroupRef.current?.removeAll();

    canvas.renderAll();
    exportMasks();
  }, [exportMasks]);

  const clearInpaintMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    inpaintGroupRef.current?.removeAll();
    canvas.renderAll();
    exportMasks();
  }, [exportMasks]);

  const clearProtectMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    protectGroupRef.current?.removeAll();
    canvas.renderAll();
    exportMasks();
  }, [exportMasks]);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    fitAll,
    fitWidth,
    fitHeight,
    exportImage,
    clearMasks,
    clearInpaintMask,
    clearProtectMask,
  }), [
    fitAll,
    fitWidth,
    fitHeight,
    exportImage,
    clearMasks,
    clearInpaintMask,
    clearProtectMask,
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

      // Create mask groups with uniform opacity
      // Using FixedLayout prevents the group from recalculating bounds when paths are added
      const inpaintGroup = new Group([], {
        left: 0,
        top: 0,
        width: w,
        height: h,
        opacity: 0.5,
        selectable: false,
        evented: false,
        interactive: false,
        subTargetCheck: false,
        clipPath: imageClipRef.current,
        layoutManager: new LayoutManager(new FixedLayout()),
      });
      (inpaintGroup as any).maskType = 'inpaint';

      const protectGroup = new Group([], {
        left: 0,
        top: 0,
        width: w,
        height: h,
        opacity: 0.5,
        selectable: false,
        evented: false,
        interactive: false,
        subTargetCheck: false,
        clipPath: imageClipRef.current,
        layoutManager: new LayoutManager(new FixedLayout()),
      });
      (protectGroup as any).maskType = 'protect';

      // Create erase group - paths here act as "negative" areas
      const eraseGroup = new Group([], {
        left: 0,
        top: 0,
        width: w,
        height: h,
        opacity: 0.7,
        selectable: false,
        evented: false,
        interactive: false,
        subTargetCheck: false,
        clipPath: imageClipRef.current,
        layoutManager: new LayoutManager(new FixedLayout()),
      });
      (eraseGroup as any).maskType = 'erase';

      canvas.add(inpaintGroup);
      canvas.add(protectGroup);
      canvas.add(eraseGroup);
      inpaintGroupRef.current = inpaintGroup;
      protectGroupRef.current = protectGroup;
      eraseGroupRef.current = eraseGroup;

      canvas.renderAll();

      // Start in drawing mode with green brush (inpaint) - fully opaque, group handles transparency
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.width = brushSize;
      brush.color = 'rgb(0, 255, 0)';
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

    // Path created -> move into the appropriate group for uniform opacity
    canvas.on('path:created', (e: any) => {
      const path = e.path;
      if (!path) return;

      const tool = activeToolRef.current;
      const targetGroup = tool === 'brush' ? inpaintGroupRef.current
        : tool === 'protect' ? protectGroupRef.current
        : tool === 'eraser' ? eraseGroupRef.current
        : null;

      if (targetGroup) {
        // Tag path
        path.maskType = tool === 'brush' ? 'inpaint'
          : tool === 'protect' ? 'protect'
          : 'erase';
        path.set({ opacity: 1, selectable: false, evented: false });

        // Remove from canvas (PencilBrush auto-adds it) and add to group
        canvas.remove(path);
        targetGroup.add(path);

        // Force group to recognize the new path and update
        path.setCoords();
        path.dirty = true;
        targetGroup.dirty = true;
        targetGroup.setCoords();

        canvas.renderAll();
        exportMasks();
      }
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

      // Make groups interactive so individual paths can be selected
      [inpaintGroupRef.current, protectGroupRef.current, eraseGroupRef.current].forEach((group) => {
        if (!group) return;
        group.set({ interactive: true, subTargetCheck: true });
        group.getObjects().forEach((obj) => {
          obj.set({ selectable: true, evented: true, hasControls: true, hasBorders: true });
        });
      });
      canvas.renderAll();

      canvas.on('object:modified', () => exportMasks());
    } else if (activeTool === 'brush' || activeTool === 'protect' || activeTool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.discardActiveObject();

      // Make groups non-interactive during drawing
      [inpaintGroupRef.current, protectGroupRef.current, eraseGroupRef.current].forEach((group) => {
        if (!group) return;
        group.set({ interactive: false, subTargetCheck: false, selectable: false, evented: false });
      });
      canvas.renderAll();

      if (canvas.freeDrawingBrush) {
        const brush = canvas.freeDrawingBrush as PencilBrush;
        brush.width = brushSize;

        // Fully opaque colors - the Group handles uniform transparency
        if (activeTool === 'brush') {
          brush.color = 'rgb(0, 255, 0)';
        } else if (activeTool === 'protect') {
          brush.color = 'rgb(255, 0, 0)';
        } else {
          brush.color = 'rgb(0, 0, 0)';
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
      active.forEach((obj) => {
        // Remove from parent group if it's inside one
        const parent = (obj as any).group;
        if (parent && (parent === inpaintGroupRef.current || parent === protectGroupRef.current || parent === eraseGroupRef.current)) {
          parent.remove(obj);
        } else {
          canvas.remove(obj);
        }
      });
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

  // Apply zoom from external sources (slider, buttons, keyboard)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;

    // Skip if zoom was set by canvas wheel handler (already applied)
    if (zoomFromCanvasRef.current) {
      zoomFromCanvasRef.current = false;
      return;
    }

    // Zoom to center of the viewport
    const container = containerRef.current;
    if (!container) return;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;

    canvas.zoomToPoint(new Point(centerX, centerY), zoom);
    canvas.renderAll();
  }, [zoom, canvasReady]);

  // Handle wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const currentZoom = canvas.getZoom();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(5, currentZoom + delta));

      // Mark as canvas-originated so the zoom useEffect doesn't double-apply
      zoomFromCanvasRef.current = true;
      onZoomChange(newZoom);

      const point = canvas.getPointer(e as any);
      canvas.zoomToPoint(new Point(point.x, point.y), newZoom);
      canvas.renderAll();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [onZoomChange]);

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
