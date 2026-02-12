'use client';

import { useEffect } from 'react';
import { useProgressStore, ProgressTask, ProgressType } from '@/hooks/useProgressStore';

const typeConfig: Record<ProgressType, { color: string; icon: string }> = {
  'upload': { color: 'bg-blue-500', icon: '↑' },
  'processing': { color: 'bg-purple-500', icon: '⚙' },
  'ai-edit': { color: 'bg-pink-500', icon: '✨' },
  'export': { color: 'bg-green-500', icon: '↓' },
  'convert': { color: 'bg-orange-500', icon: '🔄' },
};

function ProgressBarItem({ task }: { task: ProgressTask }) {
  const config = typeConfig[task.type];
  const removeTask = useProgressStore((s) => s.removeTask);

  useEffect(() => {
    if (task.status === 'completed') {
      const timer = setTimeout(() => {
        removeTask(task.id);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (task.status === 'error') {
      const timer = setTimeout(() => {
        removeTask(task.id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [task.status, task.id, removeTask]);

  const progressColor = task.status === 'error'
    ? 'bg-red-500'
    : task.status === 'completed'
    ? 'bg-green-500'
    : config.color;

  return (
    <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span className="text-lg" role="img" aria-label={task.type}>
          {config.icon}
        </span>

        {/* Label and progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {task.label}
              {task.total && task.current && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({task.current}/{task.total})
                </span>
              )}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
              {task.status === 'completed' ? '✓' : task.status === 'error' ? '✗' : `${Math.round(task.progress)}%`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all duration-300 ease-out`}
              style={{ width: `${task.progress}%` }}
            />
          </div>

          {/* Error message */}
          {task.status === 'error' && task.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
              {task.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function GlobalProgressBar() {
  const tasks = useProgressStore((s) => s.tasks);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 shadow-lg animate-slideDown">
      {tasks.map((task) => (
        <ProgressBarItem key={task.id} task={task} />
      ))}
    </div>
  );
}
