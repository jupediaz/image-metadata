import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ImageFile, ImageMetadata } from '@/types/image';

interface ImageStore {
  sessionId: string;
  images: ImageFile[];
  selectedIds: Set<string>;
  activeImageId: string | null;
  view: 'upload' | 'grid' | 'detail';
  isEditing: boolean;

  addImages: (files: ImageFile[]) => void;
  removeImage: (id: string) => void;
  updateImage: (id: string, updates: Partial<ImageFile>) => void;
  updateMetadata: (id: string, metadata: ImageMetadata) => void;

  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setActiveImage: (id: string | null) => void;

  setView: (view: 'upload' | 'grid' | 'detail') => void;
  setEditing: (editing: boolean) => void;
  reset: () => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  sessionId: uuidv4(),
  images: [],
  selectedIds: new Set<string>(),
  activeImageId: null,
  view: 'upload',
  isEditing: false,

  addImages: (files) =>
    set((state) => ({
      images: [...state.images, ...files],
      view: 'grid',
    })),

  removeImage: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.delete(id);
      return {
        images: state.images.filter((img) => img.id !== id),
        selectedIds: newSelected,
        activeImageId: state.activeImageId === id ? null : state.activeImageId,
      };
    }),

  updateImage: (id, updates) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    })),

  updateMetadata: (id, metadata) =>
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, metadata } : img
      ),
    })),

  toggleSelection: (id) =>
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    }),

  selectAll: () =>
    set((state) => ({
      selectedIds: new Set(state.images.map((img) => img.id)),
    })),

  deselectAll: () => set({ selectedIds: new Set() }),

  setActiveImage: (id) =>
    set({
      activeImageId: id,
      view: id ? 'detail' : 'grid',
      isEditing: false,
    }),

  setView: (view) => set({ view }),
  setEditing: (editing) => set({ isEditing: editing }),

  reset: () =>
    set({
      sessionId: uuidv4(),
      images: [],
      selectedIds: new Set<string>(),
      activeImageId: null,
      view: 'upload',
      isEditing: false,
    }),
}));
