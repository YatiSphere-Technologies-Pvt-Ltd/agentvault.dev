'use client';

import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight, Columns3, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

/**
 * Reusable TanStack-backed table.
 *
 * Props:
 *   columns       — TanStack column defs
 *   data          — row objects
 *   globalFilter  — string; filtered across all columns using the default fuzzy matcher
 *   onGlobalFilterChange — (str) => void, controlled
 *   onRowClick    — (row.original) => void; row cursor becomes pointer
 *   toolbar       — React node rendered above the table (left side)
 *   emptyMessage  — string shown when there are zero rows
 *   pageSize      — initial page size (default 20). Use Infinity to disable pagination.
 *   minWidth      — min-width class for the inner table to force horizontal scroll on narrow viewports
 *   initialSorting — TanStack SortingState for the default sort
 */
export function DataTable({
  columns,
  data,
  globalFilter,
  onGlobalFilterChange,
  onRowClick,
  toolbar,
  emptyMessage = 'No rows.',
  pageSize = 20,
  minWidth = 'min-w-[640px]',
  initialSorting = [],
}) {
  const paginated = pageSize !== Infinity;
  const [sorting, setSorting] = useState(initialSorting);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      ...(paginated ? { pagination } : {}),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange,
    onPaginationChange: paginated ? setPagination : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
  });

  const visibleLeafCols = table.getAllLeafColumns().filter(c => c.getCanHide());

  return (
    <div className="space-y-3">
      {(toolbar || visibleLeafCols.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">{toolbar}</div>
          {visibleLeafCols.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="outline" size="sm">
                  <Columns3 className="h-3.5 w-3.5" /> Columns
                </Button>
              } />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-[10.5px] uppercase tracking-[0.15em] font-mono text-muted-foreground">
                  Toggle columns
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleLeafCols.map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={v => col.toggleVisibility(!!v)}
                    className="capitalize"
                  >
                    {String(col.columnDef.header ?? col.id).toString().toLowerCase()}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table className={minWidth}>
            <TableHeader className="bg-muted/40">
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(h => {
                    const canSort = h.column.getCanSort();
                    const sort = h.column.getIsSorted();
                    const align = h.column.columnDef.meta?.align;
                    return (
                      <TableHead
                        key={h.id}
                        className={`select-none ${align === 'right' ? 'text-right' : ''}`}
                        style={{ width: h.getSize ? h.getSize() : undefined }}
                      >
                        {h.isPlaceholder ? null : canSort ? (
                          <button
                            onClick={h.column.getToggleSortingHandler()}
                            className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${align === 'right' ? 'ml-auto' : ''}`}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            <SortIcon sort={sort} />
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground text-[12.5px]">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                  >
                    {row.getVisibleCells().map(cell => {
                      const align = cell.column.columnDef.meta?.align;
                      return (
                        <TableCell
                          key={cell.id}
                          className={align === 'right' ? 'text-right' : ''}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {paginated && <Pagination table={table} />}
    </div>
  );
}

function SortIcon({ sort }) {
  if (sort === 'asc')  return <ArrowUp   className="h-3.5 w-3.5 text-foreground" />;
  if (sort === 'desc') return <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />;
}

function Pagination({ table }) {
  const filtered = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const from = filtered === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, filtered);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[12px] text-muted-foreground">
      <div className="font-mono tabular-nums">
        {from}–{to} of {filtered}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] uppercase tracking-[0.15em] font-mono">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-7 w-16 text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2 font-mono tabular-nums text-[11.5px]">
            {pageIndex + 1} / {Math.max(pageCount, 1)}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7"
            onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}>
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
