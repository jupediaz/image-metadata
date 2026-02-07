'use client';

import { useCallback, useRef } from 'react';
import { useComparisonStore } from '@/hooks/useComparisonStore';

interface ComparisonSliderProps {
  leftUrl: string;
  rightUrl: string;
  leftLabel: string;
  rightLabel: string;
}

export default function ComparisonSlider({
  leftUrl,
  rightUrl,
  leftLabel,
  rightLabel,
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderPosition = useComparisonStore((s) => s.sliderPosition);
  const setSliderPosition = useComparisonStore((s) => s.setSliderPosition);
  const viewport = useComparisonStore((s) => s.viewport);
  const setViewport = useComparisonStore((s) => s.setViewport);

  const posPercent = sliderPosition * 100;

  // Drag the divider
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const updatePosition = (clientX: number) => {
        const rect = container.getBoundingClientRect();
        const pos = (clientX - rect.left) / rect.width;
        setSliderPosition(pos);
      };

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        const clientX = 'touches' in ev ? ev.touches[0].clientX : ev.clientX;
        updatePosition(clientX);
      };

      const handleEnd = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [setSliderPosition]
  );

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(5, viewport.zoom + delta));
      setViewport({ zoom: newZoom });
    },
    [viewport.zoom, setViewport]
  );

  // Pan with drag on the images
  const handleImageDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 1 && !e.altKey) return; // Middle click or Alt+click
      e.preventDefault();

      let lastX = e.clientX;
      let lastY = e.clientY;

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        setViewport({
          panX: viewport.panX + dx,
          panY: viewport.panY + dy,
        });
      };

      const handleEnd = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.body.style.cursor = '';
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.body.style.cursor = 'grabbing';
    },
    [viewport.panX, viewport.panY, setViewport]
  );

  const imageTransform = `scale(${viewport.zoom}) translate(${viewport.panX / viewport.zoom}px, ${viewport.panY / viewport.zoom}px)`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#1a1a1a] cursor-default"
      onWheel={handleWheel}
      onMouseDown={handleImageDragStart}
    >
      {/* Left image (full) */}
      <img
        src={leftUrl}
        alt={leftLabel}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ transform: imageTransform, transformOrigin: 'center center' }}
        draggable={false}
      />

      {/* Right image (clipped) */}
      <img
        src={rightUrl}
        alt={rightLabel}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{
          transform: imageTransform,
          transformOrigin: 'center center',
          clipPath: `inset(0 0 0 ${posPercent}%)`,
        }}
        draggable={false}
      />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] z-10 cursor-col-resize"
        style={{ left: `${posPercent}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-col-resize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-20">
        <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
          {leftLabel}
        </span>
      </div>
      <div className="absolute top-3 right-3 z-20">
        <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
          {rightLabel}
        </span>
      </div>
    </div>
  );
}
