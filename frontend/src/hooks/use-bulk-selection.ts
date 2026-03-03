import { useState, useCallback, useMemo } from "react";

export function useBulkSelection<T extends string | number>(allIds: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const toggleOne = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds),
    );
  }, [allIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const allSelected = useMemo(
    () => allIds.length > 0 && selectedIds.size === allIds.length,
    [allIds.length, selectedIds.size],
  );

  const someSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < allIds.length,
    [allIds.length, selectedIds.size],
  );

  return {
    selectedIds,
    toggleOne,
    toggleAll,
    clearSelection,
    allSelected,
    someSelected,
    count: selectedIds.size,
  };
}
