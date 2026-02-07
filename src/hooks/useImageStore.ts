import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ImageFile, ImageMetadata, EditVersion } from '@/types/image';
import { EditorState } from '@/types/gemini';

interface ImageStore {
  sessionId: string;
  images: ImageFile[];
  selectedIds: Set<string>;
  activeImageId: string | null;
  isEditing: boolean;

  // AI Editor state
  editorState: EditorState | null;

  // Persistence
  hydrate: (images: ImageFile[], sessionId?: string) => void;

  addImages: (files: ImageFile[]) => void;
  removeImage: (id: string) => void;
  updateImage: (id: string, updates: Partial<ImageFile>) => void;
  updateMetadata: (id: string, metadata: ImageMetadata) => void;

  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setActiveImage: (id: string | null) => void;

  setEditing: (editing: boolean) => void;

  // AI Editor actions
  startAiEdit: (imageId: string) => void;
  cancelAiEdit: () => void;
  setEditorMask: (maskDataUrl: string | null) => void;
  setEditorPrompt: (prompt: string) => void;
  setEditorProcessing: (isProcessing: boolean) => void;
  setEditorPreview: (previewUrl: string | null) => void;
  setEditorError: (error: string | null) => void;
  saveEditVersion: (imageId: string, version: EditVersion) => void;
  revertToVersion: (imageId: string, versionIndex: number) => void;

  reset: () => void;
}

export const useImageStore = create<ImageStore>()(
  subscribeWithSelector((set) => ({
    sessionId: uuidv4(),
    images: [],
    selectedIds: new Set<string>(),
    activeImageId: null,
    isEditing: false,
    editorState: null,

    hydrate: (images, sessionId) =>
      set((state) => ({
        images,
        sessionId: sessionId ?? state.sessionId,
      })),

    addImages: (files) =>
      set((state) => ({
        images: [...state.images, ...files],
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
        isEditing: false,
      }),

    setEditing: (editing) => set({ isEditing: editing }),

    // AI Editor actions
    startAiEdit: (imageId) =>
      set({
        editorState: {
          imageId,
          maskDataUrl: null,
          prompt: '',
          isProcessing: false,
          previewUrl: null,
          error: null,
        },
        activeImageId: imageId,
      }),

    cancelAiEdit: () =>
      set({
        editorState: null,
      }),

    setEditorMask: (maskDataUrl) =>
      set((state) =>
        state.editorState
          ? { editorState: { ...state.editorState, maskDataUrl } }
          : {}
      ),

    setEditorPrompt: (prompt) =>
      set((state) =>
        state.editorState
          ? { editorState: { ...state.editorState, prompt } }
          : {}
      ),

    setEditorProcessing: (isProcessing) =>
      set((state) =>
        state.editorState
          ? { editorState: { ...state.editorState, isProcessing } }
          : {}
      ),

    setEditorPreview: (previewUrl) =>
      set((state) =>
        state.editorState
          ? { editorState: { ...state.editorState, previewUrl } }
          : {}
      ),

    setEditorError: (error) =>
      set((state) =>
        state.editorState
          ? { editorState: { ...state.editorState, error } }
          : {}
      ),

    saveEditVersion: (imageId, version) =>
      set((state) => ({
        images: state.images.map((img) =>
          img.id === imageId
            ? {
                ...img,
                editHistory: [...(img.editHistory || []), version],
                currentVersionIndex: (img.editHistory?.length || 0),
              }
            : img
        ),
        editorState: null,
      })),

    revertToVersion: (imageId, versionIndex) =>
      set((state) => ({
        images: state.images.map((img) =>
          img.id === imageId
            ? { ...img, currentVersionIndex: versionIndex }
            : img
        ),
      })),

    reset: () =>
      set({
        sessionId: uuidv4(),
        images: [],
        selectedIds: new Set<string>(),
        activeImageId: null,
        isEditing: false,
        editorState: null,
      }),
  }))
);
