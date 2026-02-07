'use client';

import { useEffect, useCallback } from 'react';
import { useEditorStore } from './useEditorStore';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useKeyboardShortcuts({
  enabled = true,
  onUndo,
  onRedo,
}: KeyboardShortcutsOptions = {}) {
  const setTool = useEditorStore((s) => s.setTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

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
    [enabled, undo, redo, setTool, onUndo, onRedo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
