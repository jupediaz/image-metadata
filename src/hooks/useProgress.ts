import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useProgressStore, ProgressType } from './useProgressStore';

export function useProgress() {
  const addTask = useProgressStore((s) => s.addTask);
  const updateTask = useProgressStore((s) => s.updateTask);
  const completeTask = useProgressStore((s) => s.completeTask);
  const errorTask = useProgressStore((s) => s.errorTask);

  const startProgress = useCallback(
    (type: ProgressType, label: string, total?: number) => {
      const id = uuidv4();
      addTask({
        id,
        type,
        label,
        progress: 0,
        total,
        current: 0,
      });
      return id;
    },
    [addTask]
  );

  const updateProgress = useCallback(
    (id: string, progress: number, label?: string, current?: number) => {
      updateTask(id, {
        progress: Math.min(100, Math.max(0, progress)),
        ...(label && { label }),
        ...(current !== undefined && { current }),
      });
    },
    [updateTask]
  );

  const finishProgress = useCallback(
    (id: string) => {
      completeTask(id);
    },
    [completeTask]
  );

  const failProgress = useCallback(
    (id: string, error: string) => {
      errorTask(id, error);
    },
    [errorTask]
  );

  return {
    startProgress,
    updateProgress,
    finishProgress,
    failProgress,
  };
}
