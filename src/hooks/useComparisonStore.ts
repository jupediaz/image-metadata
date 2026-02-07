import { create } from 'zustand';

export type ComparisonMode = 'slider' | 'side-by-side' | 'none';

export interface ComparisonSource {
  type: 'original' | 'version' | 'model';
  label: string;
  imageUrl: string;
  versionIndex?: number;
  model?: string;
}

interface ComparisonStoreState {
  mode: ComparisonMode;
  leftSource: ComparisonSource | null;
  rightSource: ComparisonSource | null;
  sliderPosition: number; // 0-1
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };

  setMode: (mode: ComparisonMode) => void;
  setLeftSource: (source: ComparisonSource) => void;
  setRightSource: (source: ComparisonSource) => void;
  setSliderPosition: (position: number) => void;
  setViewport: (viewport: Partial<ComparisonStoreState['viewport']>) => void;
  reset: () => void;
}

export const useComparisonStore = create<ComparisonStoreState>((set) => ({
  mode: 'slider',
  leftSource: null,
  rightSource: null,
  sliderPosition: 0.5,
  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
  },

  setMode: (mode) => set({ mode }),
  setLeftSource: (source) => set({ leftSource: source }),
  setRightSource: (source) => set({ rightSource: source }),
  setSliderPosition: (position) => set({ sliderPosition: Math.max(0, Math.min(1, position)) }),
  setViewport: (viewport) =>
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    })),
  reset: () =>
    set({
      mode: 'slider',
      leftSource: null,
      rightSource: null,
      sliderPosition: 0.5,
      viewport: { zoom: 1, panX: 0, panY: 0 },
    }),
}));
