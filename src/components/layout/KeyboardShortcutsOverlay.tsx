'use client';

import { useEffect, useState } from 'react';

const shortcuts = [
  { category: 'Tools', items: [
    { key: 'V', desc: 'Select / Move' },
    { key: 'H', desc: 'Pan (hand)' },
    { key: 'B', desc: 'Brush tool' },
    { key: 'E', desc: 'Eraser tool' },
    { key: 'L', desc: 'Lasso tool' },
    { key: 'Z', desc: 'Zoom tool' },
  ]},
  { category: 'Edit', items: [
    { key: 'Ctrl+Z', desc: 'Undo' },
    { key: 'Ctrl+Shift+Z', desc: 'Redo' },
    { key: 'Ctrl+Y', desc: 'Redo (alt)' },
    { key: 'Del / Backspace', desc: 'Delete selected mask' },
  ]},
  { category: 'Navigation', items: [
    { key: 'Space+Drag', desc: 'Temporary pan' },
    { key: 'Scroll', desc: 'Zoom in/out' },
    { key: 'Esc', desc: 'Back to detail' },
    { key: '?', desc: 'Toggle this overlay' },
  ]},
];

export default function KeyboardShortcutsOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setVisible((v) => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c]">
          <h2 className="text-sm font-medium text-white">Keyboard Shortcuts</h2>
          <button
            onClick={() => setVisible(false)}
            className="text-[#858585] hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="text-[10px] uppercase tracking-wider text-[#585858] mb-2">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-xs text-[#cccccc]">{item.desc}</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-[#1e1e1e] border border-[#3c3c3c] rounded text-[#858585] font-mono">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-[#3c3c3c] text-center">
          <span className="text-[10px] text-[#585858]">Press ? to toggle</span>
        </div>
      </div>
    </div>
  );
}
