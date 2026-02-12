'use client';

import { usePersistence } from '@/hooks/usePersistence';
import { useAutoPersist } from '@/hooks/useAutoPersist';

export function PersistenceProvider({ children }: { children: React.ReactNode }) {
  const hydrated = usePersistence();

  // Auto-persist changes to IndexedDB
  useAutoPersist();

  if (!hydrated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
