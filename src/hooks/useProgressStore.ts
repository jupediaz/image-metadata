import { create } from 'zustand';

export type ProgressType = 'upload' | 'processing' | 'ai-edit' | 'export' | 'convert';

export interface ProgressTask {
  id: string;
  type: ProgressType;
  label: string;
  progress: number; // 0-100
  total?: number; // For multi-item operations
  current?: number; // Current item being processed
  status: 'active' | 'completed' | 'error';
  error?: string;
}

interface ProgressStore {
  tasks: ProgressTask[];

  // Add a new progress task
  addTask: (task: Omit<ProgressTask, 'status'>) => void;

  // Update task progress
  updateTask: (id: string, updates: Partial<ProgressTask>) => void;

  // Mark task as completed
  completeTask: (id: string) => void;

  // Mark task as error
  errorTask: (id: string, error: string) => void;

  // Remove a task
  removeTask: (id: string) => void;

  // Clear all completed/error tasks
  clearCompleted: () => void;

  // Get active tasks
  getActiveTasks: () => ProgressTask[];
}

export const useProgressStore = create<ProgressStore>((set, get) => ({
  tasks: [],

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, { ...task, status: 'active' as const }],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),

  completeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'completed' as const, progress: 100 } : t
      ),
    })),

  errorTask: (id, error) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'error' as const, error } : t
      ),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),

  clearCompleted: () =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status === 'active'),
    })),

  getActiveTasks: () => get().tasks.filter((t) => t.status === 'active'),
}));
