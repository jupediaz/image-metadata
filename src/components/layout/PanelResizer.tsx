'use client';

import { useCallback, useRef } from 'react';

interface PanelResizerProps {
  onResize: (deltaX: number) => void;
}

export default function PanelResizer({ onResize }: PanelResizerProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastX.current = e.clientX;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - lastX.current;
        lastX.current = ev.clientX;
        onResize(delta);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [onResize]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className="w-[6px] cursor-col-resize bg-[#3c3c3c] hover:bg-[#007acc] transition-colors flex items-center justify-center"
    >
      <div className="w-px h-8 bg-[#585858]" />
    </div>
  );
}
