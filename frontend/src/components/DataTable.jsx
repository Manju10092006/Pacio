import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, EyeOff, CheckSquare, Square, MoreHorizontal } from "lucide-react";
import { Button, Input, Select, Badge, cn } from "./Primitives";

export function DataTable({
  data = [],
  columns = [],
  searchKey = "",
  searchPlaceholder = "Search records...",
  rowActions = [],
  bulkActions = [],
  initialPageSize = 10,
  onRowClick,
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(columns.map(c => c.key)));
  const [showColMenu, setShowColMenu] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});

  // 1. Filter & Search
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter by search query
    if (query && searchKey) {
      result = result.filter(row => {
        const val = row[searchKey];
        return val ? String(val).toLowerCase().includes(query.toLowerCase()) : false;
      });
    }

    // Filter by column-specific filters
    Object.keys(activeFilters).forEach(key => {
      const filterVal = activeFilters[key];
      if (filterVal) {
        result = result.filter(row => String(row[key]) === String(filterVal));
      }
    });

    // 2. Sort
    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === valB) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        const compare = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return sortOrder === "asc" ? compare : -compare;
      });
    }

    return result;
  }, [data, query, searchKey, sortKey, sortOrder, activeFilters]);

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Bulk selection helpers
  const allPageIds = useMemo(() => paginatedData.map(r => r.id || r._id || r.email || r.username).filter(Boolean), [paginatedData]);
  const isAllSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      allPageIds.forEach(id => next.delete(id));
    } else {
      allPageIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSort = (key, sortable) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-bone-100 p-4 border border-line-strong">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          {searchKey && (
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-xs h-10 py-1"
            />
          )}

          {/* Render Column Filter Selects if defined */}
          {columns.filter(c => c.filterOptions).map(col => (
            <Select
              key={col.key}
              value={activeFilters[col.key] || ""}
              onChange={e => {
                setActiveFilters({ ...activeFilters, [col.key]: e.target.value });
                setCurrentPage(1);
              }}
              className="h-10 py-1 w-40 text-xs font-mono"
            >
              <option value="">{col.header.toUpperCase()}: ALL</option>
              {col.filterOptions.map(opt => (
                <option key={opt} value={opt}>{opt.toUpperCase()}</option>
              ))}
            </Select>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Actions */}
          {selectedIds.size > 0 && bulkActions.length > 0 && (
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 text-xs font-mono">
              <span className="text-accent">{selectedIds.size} SELECTED</span>
              {bulkActions.map(action => (
                <Button
                  key={action.label}
                  variant="ghost"
                  onClick={() => action.action(Array.from(selectedIds))}
                  className="py-1 px-3 h-7 text-[10px]"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Column Visibility Menu */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowColMenu(!showColMenu)}
              className="h-10 py-1 text-xs"
            >
              <EyeOff size={14} className="mr-1" /> Columns
            </Button>
            {showColMenu && (
              <div className="absolute right-0 mt-2 w-48 border border-line-strong bg-bone p-3 shadow-xl z-20 space-y-2 font-mono text-[10px]">
                <div className="font-semibold text-ink/40 tracking-wider pb-1.5 border-b border-line">SHOW/HIDE</div>
                {columns.map(col => {
                  const isVisible = visibleColumns.has(col.key);
                  return (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-accent">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => {
                          const next = new Set(visibleColumns);
                          if (isVisible) {
                            if (next.size > 1) next.delete(col.key);
                          } else {
                            next.add(col.key);
                          }
                          setVisibleColumns(next);
                        }}
                        className="rounded border-line-strong text-accent focus:ring-accent"
                      />
                      <span>{col.header.toUpperCase()}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-line-strong bg-paper overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-line-strong bg-bone-100/55 font-mono text-[10px] text-ink/65 tracking-wider uppercase select-none">
              {bulkActions.length > 0 && (
                <th className="p-4 w-12 text-center border-r border-line">
                  <button onClick={toggleSelectAll} className="hover:text-accent">
                    {isAllSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                </th>
              )}
              {columns
                .filter(col => visibleColumns.has(col.key))
                .map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key, col.sortable)}
                    className={cn(
                      "p-4 font-semibold border-r border-line last:border-r-0",
                      col.sortable && "cursor-pointer hover:bg-bone-200 hover:text-ink"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {sortKey === col.key && (
                        sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </div>
                  </th>
                ))}
              {rowActions.length > 0 && <th className="p-4 w-16 text-center">ACTIONS</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions.length ? 1 : 0) + (rowActions.length ? 1 : 0)} className="p-12 text-center text-ink/40 font-mono text-xs">
                  NO RECORDS MATCH FILTER OR SEARCH QUERY.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const rowId = row.id || row._id || row.email || row.username || index;
                const isSelected = selectedIds.has(rowId);
                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "hover:bg-bone-50 transition-colors border-b border-line last:border-b-0",
                      isSelected && "bg-accent/[0.03]",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {bulkActions.length > 0 && (
                      <td className="p-4 text-center border-r border-line" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelectRow(rowId)} className="text-ink/60 hover:text-accent">
                          {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                        </button>
                      </td>
                    )}
                    {columns
                      .filter(col => visibleColumns.has(col.key))
                      .map(col => {
                        const cellVal = row[col.key];
                        return (
                          <td key={col.key} className="p-4 border-r border-line last:border-r-0 font-sans max-w-[240px] truncate">
                            {col.render ? col.render(cellVal, row) : String(cellVal ?? "")}
                          </td>
                        );
                      })}
                    {rowActions.length > 0 && (
                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block group">
                          <button className="p-1.5 hover:bg-bone-200 rounded border border-transparent hover:border-line-strong transition-all">
                            <MoreHorizontal size={14} />
                          </button>
                          <div className="hidden group-hover:block absolute right-0 bottom-full mb-1 w-32 bg-ink text-bone border border-ink shadow-lg z-20 py-1 font-mono text-[10px]">
                            {rowActions.map(act => (
                              <button
                                key={act.label}
                                onClick={() => act.action(row)}
                                className="w-full text-left px-3 py-1.5 hover:bg-accent text-bone uppercase tracking-wider"
                              >
                                {act.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex items-center justify-between font-mono text-xs text-ink/60 p-4 border border-line-strong bg-bone-100">
        <div>
          SHOWING {Math.min(processedData.length, (currentPage - 1) * pageSize + 1)}-
          {Math.min(processedData.length, currentPage * pageSize)} OF {processedData.length} ROWS
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>ROWS PER PAGE</span>
            <Select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 h-8 w-20 text-xs"
            >
              {[5, 10, 20, 50].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1 h-8 w-8 justify-center"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-2">PAGE {currentPage} OF {totalPages}</span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1 h-8 w-8 justify-center"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
