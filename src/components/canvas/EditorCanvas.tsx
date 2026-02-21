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
  onStrokeHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export interface EditorCanvasHandle {
  fitAll: () => void;
  fitWidth: () => void;
  fitHeight: () => void;
  exportImage: () => void;
  clearMasks: () => void;
  clearInpaintMask: () => void;
  clearProtectMask: () => void;
  undoStroke: () => boolean;
  redoStroke: () => boolean;
  canUndoStroke: () => boolean;
  canRedoStroke: () => boolean;
  setInpaintVisibility: (visible: boolean) => void;
  setProtectVisibility: (visible: boolean) => void;
}

const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  { imageUrl, activeTool, brushSize, zoom, onZoomChange, onCursorMove, onStrokeHistoryChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const imageBoundsRef = useRef({ left: 0, top: 0, width: 0, height: 0, originalWidth: 0, originalHeight: 0 });
  const imageClipRef = useRef<Rect | null>(null);
  const activeToolRef = useRef<EditorTool>(activeTool);
  const zoomFromCanvasRef = useRef(false);
  const inpaintGroupRef = useRef<Group | null>(null);
  const protectGroupRef = useRef<Group | null>(null);
  const eraseGroupRef = useRef<Group | null>(null);
  // Stroke undo/redo: track each path and its parent group
  const strokeHistoryRef = useRef<{ path: any; group: Group }[]>([]);
  const strokeRedoRef = useRef<{ path: any; group: Group }[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);

  const setEditorInpaintMask = useImageStore((s) => s.setEditorInpaintMask);
  const setEditorProtectMask = useImageStore((s) => s.setEditorProtectMask);
  const onStrokeHistoryChangeRef = useRef(onStrokeHistoryChange);
  useEffect(() => { onStrokeHistoryChangeRef.current = onStrokeHistoryChange; }, [onStrokeHistoryChange]);

  const notifyStrokeHistory = useCallback(() => {
    onStrokeHistoryChangeRef.current?.(
      strokeHistoryRef.current.length > 0,
      strokeRedoRef.current.length > 0,
    );
  }, []);

  // Keep activeToolRef in sync
  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  // Helper: render paths to a B/W mask, cropped to the image region and scaled to original dimensions
  const renderPathsToMask = useCallback((paths: any[], erasePaths: any[], canvasW: number, canvasH: number): string | null => {
    if (paths.length === 0 && erasePaths.length === 0) return null;

    // Step 1: Render all paths at full canvas dimensions (path data has absolute canvas coords)
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = canvasW;
    fullCanvas.height = canvasH;
    const ctx = fullCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Helper to draw path commands
    const drawPaths = (pathList: any[], color: string) => {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      pathList.forEach((path: any) => {
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
            else if (cmd === 'C') ctx.bezierCurveTo(segment[1], segment[2], segment[3], segment[4], segment[5], segment[6]);
          });
          ctx.stroke();
        }
        ctx.restore();
      });
    };

    drawPaths(paths, '#FFFFFF');
    drawPaths(erasePaths, '#000000');

    // Step 2: Crop to image bounds so the mask aligns with the actual image, not the canvas margins
    const bounds = imageBoundsRef.current;
    if (bounds.originalWidth > 0 && bounds.originalHeight > 0) {
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = bounds.originalWidth;
      cropCanvas.height = bounds.originalHeight;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.fillStyle = '#000000';
        cropCtx.fillRect(0, 0, bounds.originalWidth, bounds.originalHeight);
        // Copy only the image region from the full canvas, scaled to original image dimensions
        cropCtx.drawImage(
          fullCanvas,
          bounds.left, bounds.top,                          // source: image position on canvas
          bounds.width, bounds.height,                      // source: displayed image size
          0, 0,                                             // dest: fill entire output
          bounds.originalWidth, bounds.originalHeight,      // dest: original image dimensions
        );
        return cropCanvas.toDataURL('image/png');
      }
    }

    // Fallback: no bounds available, return full canvas mask
    return fullCanvas.toDataURL('image/png');
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

    inpaintGroupRef.current?.removeAll();
    protectGroupRef.current?.removeAll();
    eraseGroupRef.current?.removeAll();
    strokeHistoryRef.current = [];
    strokeRedoRef.current = [];

    canvas.renderAll();
    exportMasks();
    notifyStrokeHistory();
  }, [exportMasks, notifyStrokeHistory]);

  const clearInpaintMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    inpaintGroupRef.current?.removeAll();
    // Remove inpaint entries from history
    strokeHistoryRef.current = strokeHistoryRef.current.filter(e => e.group !== inpaintGroupRef.current);
    strokeRedoRef.current = strokeRedoRef.current.filter(e => e.group !== inpaintGroupRef.current);
    canvas.renderAll();
    exportMasks();
    notifyStrokeHistory();
  }, [exportMasks, notifyStrokeHistory]);

  const clearProtectMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    protectGroupRef.current?.removeAll();
    // Remove protect entries from history
    strokeHistoryRef.current = strokeHistoryRef.current.filter(e => e.group !== protectGroupRef.current);
    strokeRedoRef.current = strokeRedoRef.current.filter(e => e.group !== protectGroupRef.current);
    canvas.renderAll();
    exportMasks();
    notifyStrokeHistory();
  }, [exportMasks, notifyStrokeHistory]);

  const undoStroke = useCallback((): boolean => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return false;

    const history = strokeHistoryRef.current;
    if (history.length === 0) return false;

    const { path, group } = history.pop()!;
    strokeRedoRef.current.push({ path, group });
    group.remove(path);
    group.dirty = true;
    canvas.renderAll();
    exportMasks();
    notifyStrokeHistory();
    return true;
  }, [exportMasks, notifyStrokeHistory]);

  const redoStroke = useCallback((): boolean => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return false;

    const redo = strokeRedoRef.current;
    if (redo.length === 0) return false;

    const { path, group } = redo.pop()!;
    strokeHistoryRef.current.push({ path, group });
    group.add(path);
    path.setCoords();
    group.dirty = true;
    canvas.renderAll();
    exportMasks();
    notifyStrokeHistory();
    return true;
  }, [exportMasks, notifyStrokeHistory]);

  const canUndoStroke = useCallback(() => strokeHistoryRef.current.length > 0, []);
  const canRedoStroke = useCallback(() => strokeRedoRef.current.length > 0, []);

  const setInpaintVisibility = useCallback((visible: boolean) => {
    const group = inpaintGroupRef.current;
    if (!group) return;
    group.set({ opacity: visible ? 0.5 : 0 });
    fabricCanvasRef.current?.renderAll();
  }, []);

  const setProtectVisibility = useCallback((visible: boolean) => {
    const group = protectGroupRef.current;
    if (!group) return;
    group.set({ opacity: visible ? 0.5 : 0 });
    fabricCanvasRef.current?.renderAll();
  }, []);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    fitAll,
    fitWidth,
    fitHeight,
    exportImage,
    clearMasks,
    clearInpaintMask,
    clearProtectMask,
    undoStroke,
    redoStroke,
    canUndoStroke,
    canRedoStroke,
    setInpaintVisibility,
    setProtectVisibility,
  }), [
    fitAll,
    fitWidth,
    fitHeight,
    exportImage,
    clearMasks,
    clearInpaintMask,
    clearProtectMask,
    undoStroke,
    redoStroke,
    canUndoStroke,
    canRedoStroke,
    setInpaintVisibility,
    setProtectVisibility,
  ]);

  // Initialize canvas, groups, and event handlers (runs ONCE on mount)
  // Image loading is separate so groups/paths survive image URL changes (mask persistence)
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

    // Create initial clip rect (updated when image loads)
    const clipRect = new Rect({
      left: 0, top: 0, width: w, height: h,
      absolutePositioned: true,
    });
    imageClipRef.current = clipRect;

    // Create mask groups with uniform opacity
    // Using FixedLayout prevents the group from recalculating bounds when paths are added
    const inpaintGroup = new Group([], {
      left: 0, top: 0, width: w, height: h,
      opacity: 0.5,
      selectable: false, evented: false,
      interactive: false, subTargetCheck: false,
      clipPath: clipRect,
      layoutManager: new LayoutManager(new FixedLayout()),
    });
    (inpaintGroup as any).maskType = 'inpaint';

    const protectGroup = new Group([], {
      left: 0, top: 0, width: w, height: h,
      opacity: 0.5,
      selectable: false, evented: false,
      interactive: false, subTargetCheck: false,
      clipPath: clipRect,
      layoutManager: new LayoutManager(new FixedLayout()),
    });
    (protectGroup as any).maskType = 'protect';

    const eraseGroup = new Group([], {
      left: 0, top: 0, width: w, height: h,
      opacity: 0.7,
      selectable: false, evented: false,
      interactive: false, subTargetCheck: false,
      clipPath: clipRect,
      layoutManager: new LayoutManager(new FixedLayout()),
    });
    (eraseGroup as any).maskType = 'erase';

    canvas.add(inpaintGroup);
    canvas.add(protectGroup);
    canvas.add(eraseGroup);
    inpaintGroupRef.current = inpaintGroup;
    protectGroupRef.current = protectGroup;
    eraseGroupRef.current = eraseGroup;

    // Start in drawing mode
    canvas.isDrawingMode = true;
    const brush = new PencilBrush(canvas);
    brush.width = brushSize;
    brush.color = 'rgb(0, 255, 0)';
    brush.strokeLineCap = 'round';
    brush.strokeLineJoin = 'round';
    canvas.freeDrawingBrush = brush;

    // Resize handler
    const handleResize = () => {
      canvas.setWidth(container.clientWidth);
      canvas.setHeight(container.clientHeight);
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
        path.maskType = tool === 'brush' ? 'inpaint'
          : tool === 'protect' ? 'protect'
          : 'erase';
        path.set({ opacity: 1, selectable: false, evented: false });

        canvas.remove(path);
        targetGroup.add(path);

        strokeHistoryRef.current.push({ path, group: targetGroup });
        strokeRedoRef.current = [];

        path.setCoords();
        path.dirty = true;
        targetGroup.dirty = true;
        targetGroup.setCoords();

        canvas.renderAll();
        exportMasks();
        onStrokeHistoryChangeRef.current?.(true, false);
      }
    });

    return () => {
      ro.disconnect();
      canvas.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load/update background image (runs on imageUrl change — groups/paths are preserved)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      if (!img || !fabricCanvasRef.current) return;

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
        left: imgLeft, top: imgTop,
        selectable: false, evented: false,
        hasControls: false, hasBorders: false,
      });

      // Update bounds for mask crop and fit operations
      imageBoundsRef.current = {
        left: imgLeft, top: imgTop,
        width: imgW, height: imgH,
        originalWidth: img.width || 1, originalHeight: img.height || 1,
      };

      // Update the shared clip rect so groups clip to the image area
      const clipRect = imageClipRef.current;
      if (clipRect) {
        clipRect.set({ left: imgLeft, top: imgTop, width: imgW, height: imgH });
      }

      canvas.backgroundImage = img;
      canvas.renderAll();
      setCanvasReady(true);
    });
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
