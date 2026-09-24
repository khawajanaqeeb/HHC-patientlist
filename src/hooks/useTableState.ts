import { useState } from 'react';

type SortColumn = 'sno' | 'name' | 'subscriber' | 'pkg';

export function useTableState() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<1 | -1>(1);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 1 ? -1 : 1));
    } else {
      setSortColumn(col);
      setSortDirection(1);
    }
  };

  const resetTable = () => {
    setSearchQuery('');
    setSortColumn(null);
    setSortDirection(1);
  };

  return {
    searchQuery,
    setSearchQuery,
    sortColumn,
    sortDirection,
    handleSort,
    resetTable,
  };
}
