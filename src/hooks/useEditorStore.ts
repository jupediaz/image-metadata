import { create } from 'zustand';

export interface EditAction {
  id: string;
  type: 'ai-edit' | 'mask-draw' | 'revert';
  prompt?: string;
  model?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  thumbnailUrl?: string;
  maskDataUrl?: string;
  timestamp: number;
}

interface EditorStoreState {
  imageId: string | null;
  actionHistory: EditAction[];
  currentActionIndex: number;

  // Canvas state
  activeTool: 'select' | 'pan' | 'brush' | 'eraser' | 'protect' | 'lasso' | 'zoom';
  brushSize: number;
  zoom: number;

  // Actions
  init: (imageId: string) => void;
  pushAction: (action: EditAction) => void;
  undo: () => EditAction | null;
  redo: () => EditAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setTool: (tool: EditorStoreState['activeTool']) => void;
  setBrushSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  imageId: null,
  actionHistory: [],
  currentActionIndex: -1,
  activeTool: 'brush',
  brushSize: 20,
  zoom: 1,

  init: (imageId) =>
    set({
      imageId,
      actionHistory: [],
      currentActionIndex: -1,
      activeTool: 'brush',
      brushSize: 20,
      zoom: 1,
    }),

  pushAction: (action) =>
    set((state) => {
      // Truncate future actions (if we undid some, those are gone)
      const history = state.actionHistory.slice(0, state.currentActionIndex + 1);
      return {
        actionHistory: [...history, action],
        currentActionIndex: history.length,
      };
    }),

  undo: () => {
    const state = get();
    if (state.currentActionIndex < 0) return null;
    const action = state.actionHistory[state.currentActionIndex];
    set({ currentActionIndex: state.currentActionIndex - 1 });
    return action;
  },

  redo: () => {
    const state = get();
    if (state.currentActionIndex >= state.actionHistory.length - 1) return null;
    const nextIndex = state.currentActionIndex + 1;
    const action = state.actionHistory[nextIndex];
    set({ currentActionIndex: nextIndex });
    return action;
  },

  canUndo: () => get().currentActionIndex >= 0,
  canRedo: () => get().currentActionIndex < get().actionHistory.length - 1,

  setTool: (tool) => set({ activeTool: tool }),
  setBrushSize: (size) => set({ brushSize: size }),
  setZoom: (zoom) => set({ zoom }),
  reset: () =>
    set({
      imageId: null,
      actionHistory: [],
      currentActionIndex: -1,
      activeTool: 'brush',
      brushSize: 20,
      zoom: 1,
    }),
}));
