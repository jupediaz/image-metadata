'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import { useEditorStore } from '@/hooks/useEditorStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import TopMenuBar from './TopMenuBar';
import LeftToolbar from './LeftToolbar';
import RightPanel from './RightPanel';
import BottomStatusBar from './BottomStatusBar';
import PanelResizer from './PanelResizer';
import KeyboardShortcutsOverlay from './KeyboardShortcutsOverlay';
import EditorCanvas from '../canvas/EditorCanvas';

interface EditorShellProps {
  imageId: string;
}

export type EditorTool = 'select' | 'pan' | 'brush' | 'eraser' | 'lasso' | 'zoom';

export default function EditorShell({ imageId }: EditorShellProps) {
  const router = useRouter();
  const images = useImageStore((s) => s.images);
  const sessionId = useImageStore((s) => s.sessionId);
  const cancelAiEdit = useImageStore((s) => s.cancelAiEdit);

  const editorStore = useEditorStore();
  const image = images.find((img) => img.id === imageId);

  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [activeTab, setActiveTab] = useState<'ai' | 'properties' | 'history'>('ai');

  // Initialize editor store
  useEffect(() => {
    editorStore.init(imageId);
    return () => editorStore.reset();
  }, [imageId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useKeyboardShortcuts({ enabled: true });

  // Listen for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          cancelAiEdit();
          router.push(`/image/${imageId}`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageId, cancelAiEdit, router]);

  if (!image) return null;

  const imageUrl = `/api/image?sessionId=${sessionId}&id=${image.id}`;

  const handleBack = () => {
    cancelAiEdit();
    router.push(`/image/${imageId}`);
  };

  return (
    <>
      <div
        className="h-dvh w-dvw grid overflow-hidden select-none"
        style={{
          gridTemplateRows: '36px 1fr 24px',
        }}
      >
        {/* Top Menu Bar */}
        <TopMenuBar
          filename={image.filename}
          onBack={handleBack}
          imageId={imageId}
          onUndo={() => editorStore.undo()}
          onRedo={() => editorStore.redo()}
          canUndo={editorStore.canUndo()}
          canRedo={editorStore.canRedo()}
        />

        {/* Body */}
        <div
          className="grid overflow-hidden"
          style={{
            gridTemplateColumns: `48px 1fr 6px ${rightPanelWidth}px`,
          }}
        >
          {/* Left Toolbar */}
          <LeftToolbar
            activeTool={editorStore.activeTool}
            onToolChange={editorStore.setTool}
            brushSize={editorStore.brushSize}
            onBrushSizeChange={editorStore.setBrushSize}
          />

          {/* Canvas Area */}
          <div className="relative overflow-hidden bg-[#2d2d2d]">
            <EditorCanvas
              imageUrl={imageUrl}
              activeTool={editorStore.activeTool}
              brushSize={editorStore.brushSize}
              zoom={editorStore.zoom}
              onZoomChange={editorStore.setZoom}
              onCursorMove={setCursorPos}
            />
          </div>

          {/* Panel Resizer */}
          <PanelResizer
            onResize={(delta) =>
              setRightPanelWidth((w) => Math.max(280, Math.min(500, w - delta)))
            }
          />

          {/* Right Panel */}
          <RightPanel
            imageId={imageId}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Bottom Status Bar */}
        <BottomStatusBar
          zoom={editorStore.zoom}
          onZoomChange={editorStore.setZoom}
          imageWidth={image.width}
          imageHeight={image.height}
          cursorPos={cursorPos}
        />
      </div>

      {/* Keyboard shortcuts overlay (toggled with ?) */}
      <KeyboardShortcutsOverlay />
    </>
  );
}
