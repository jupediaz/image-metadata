'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from './useEditorStore';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitAll?: () => void;
}

export function useKeyboardShortcuts({
  enabled = true,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitAll,
}: KeyboardShortcutsOptions = {}) {
  const setTool = useEditorStore((s) => s.setTool);
  const activeTool = useEditorStore((s) => s.activeTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  // Space+drag temporary pan: hold Space to switch to pan, release to restore
  type ToolType = 'select' | 'pan' | 'brush' | 'eraser' | 'protect' | 'lasso' | 'zoom';
  const prevToolRef = useRef<ToolType | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Space held = temporary pan
      if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        if (activeTool !== 'pan') {
          prevToolRef.current = activeTool;
          setTool('pan');
        }
        return;
      }

      // Undo: Ctrl+Z
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const action = undo();
        if (action) onUndo?.();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((ctrl && e.shiftKey && e.key === 'z') || (ctrl && e.key === 'y')) {
        e.preventDefault();
        const action = redo();
        if (action) onRedo?.();
        return;
      }

      // Zoom shortcuts: Ctrl+= / Ctrl+- / Ctrl+0
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        onZoomIn?.();
        return;
      }
      if (ctrl && e.key === '-') {
        e.preventDefault();
        onZoomOut?.();
        return;
      }
      if (ctrl && e.key === '0') {
        e.preventDefault();
        onFitAll?.();
        return;
      }

      // Tool shortcuts (single keys, no modifiers)
      if (!ctrl && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            e.preventDefault();
            setTool('select');
            break;
          case 'h':
            e.preventDefault();
            setTool('pan');
            break;
          case 'b':
            e.preventDefault();
            setTool('brush');
            break;
          case 'p':
            e.preventDefault();
            setTool('protect');
            break;
          case 'e':
            e.preventDefault();
            setTool('eraser');
            break;
          case 'l':
            e.preventDefault();
            setTool('lasso');
            break;
          case 'z':
            e.preventDefault();
            setTool('zoom');
            break;
        }
      }
    },
    [enabled, activeTool, undo, redo, setTool, onUndo, onRedo, onZoomIn, onZoomOut, onFitAll]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      // Release Space = restore previous tool
      if (e.key === ' ' && prevToolRef.current !== null) {
        setTool(prevToolRef.current);
        prevToolRef.current = null;
      }
    },
    [setTool]
  );

  useEffect(() => {
    // Use capture phase to intercept before Fabric.js or other handlers
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [handleKeyDown, handleKeyUp]);
}
