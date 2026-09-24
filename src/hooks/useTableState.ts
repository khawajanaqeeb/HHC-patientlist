import { useState, useCallback } from 'react';

type SortColumn = 'sno' | 'name' | 'subscriber' | 'pkg';

export function useTableState() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<1 | -1>(1);

  const handleSort = useCallback((col: SortColumn) => {
    setSortColumn((prevCol) => {
      if (prevCol === col) {
        setSortDirection((prevDir) => (prevDir === 1 ? -1 : 1));
        return prevCol;
      } else {
        setSortDirection(1);
        return col;
      }
    });
  }, []);

  const resetTable = useCallback(() => {
    setSearchQuery('');
    setSortColumn(null);
    setSortDirection(1);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDirection,
    handleSort,
    resetTable,
  };
}
