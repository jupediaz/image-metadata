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
  setEditorInpaintMask: (maskDataUrl: string | null) => void;
  setEditorProtectMask: (maskDataUrl: string | null) => void;
  setEditorPrompt: (prompt: string) => void;
  setEditorProcessing: (isProcessing: boolean) => void;
  setEditorPreview: (previewUrl: string | null) => void;
  setEditorError: (error: string | null) => void;
  saveEditVersion: (imageId: string, version: EditVersion) => void;
  revertToVersion: (imageId: string, versionIndex: number) => void;
  deleteEditVersion: (imageId: string, versionIndex: number) => void;

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
          inpaintMaskDataUrl: null,
          protectMaskDataUrl: null,
          prompt: 'arregla los pequeños daños que se ven, dejando sombras y reflejos homogeneos, tipicos de un brillo y reflejo homogeneo de unas puertas alineadas',
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

    setEditorInpaintMask: (maskDataUrl) =>
      set((state) =>
        state.editorState
          ? { editorState: { ...state.editorState, inpaintMaskDataUrl: maskDataUrl } }
          : {}
      ),

    setEditorProtectMask: (maskDataUrl) =>
      set((state) =>
        state.editorState
          ? { editorState: { ...state.editorState, protectMaskDataUrl: maskDataUrl } }
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

    deleteEditVersion: (imageId, versionIndex) =>
      set((state) => ({
        images: state.images.map((img) => {
          if (img.id !== imageId || !img.editHistory) return img;
          const newHistory = img.editHistory.filter((_, i) => i !== versionIndex);
          let newIndex = img.currentVersionIndex ?? -1;
          // Adjust currentVersionIndex
          if (newHistory.length === 0) {
            newIndex = -1;
          } else if (newIndex === versionIndex) {
            // Deleted the active version -> go to previous or original
            newIndex = versionIndex > 0 ? versionIndex - 1 : -1;
          } else if (newIndex > versionIndex) {
            newIndex--;
          }
          return { ...img, editHistory: newHistory, currentVersionIndex: newIndex };
        }),
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
