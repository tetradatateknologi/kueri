import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Database, Filter, Info, Loader2, X } from "lucide-react";

import { WorkspaceEmptyState } from "@/components/kueri/WorkspaceEmptyState";
import { ResultsTableSkeleton } from "@/components/kueri/ResultsTableSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { DEFAULT_QUERY_LIMIT } from "@/lib/api/query-config";
import type { QueryResult, ResultColumnFilter } from "@/lib/api/types";
import { queryResultColumnNames } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type SortDir = "asc" | "desc";

type ResultsGridProps = {
  result: QueryResult | null;
  isLoading: boolean;
  error: string | null;
  onLoadMore?: () => void;
  activeFilters?: ResultColumnFilter[];
  onFiltersChange?: (filters: ResultColumnFilter[]) => void;
  onClearAllFilters?: () => void;
};

const statusColor: Record<string, string> = {
  paid: "text-neon bg-neon/10 border-neon/30",
  pending: "text-env-staging bg-env-staging/10 border-env-staging/30",
  refunded: "text-muted-foreground bg-muted border-border",
  failed: "text-destructive bg-destructive/10 border-destructive/30",
};

const SCROLL_LOAD_THRESHOLD_PX = 120;
const FILTER_DEBOUNCE_MS = 400;
const EMPTY_FILTERS: ResultColumnFilter[] = [];

export function ResultsGrid({
  result,
  isLoading,
  error,
  onLoadMore,
  activeFilters = EMPTY_FILTERS,
  onFiltersChange,
  onClearAllFilters,
}: ResultsGridProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreLockRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const columnNames = useMemo(
    () => (result ? queryResultColumnNames(result.columns) : []),
    [result],
  );

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const filter of activeFilters) {
      if (filter.operator === "contains" || filter.operator === "equals") {
        next[filter.column] = filter.value ?? "";
      }
    }
    setDraftValues(next);
  }, [activeFilters]);

  const sortedRows = useMemo(() => {
    if (!result || sortCol == null) return result?.rows ?? [];
    const colIndex = columnNames.indexOf(sortCol);
    if (colIndex < 0) return result.rows;

    return [...result.rows].sort((a, b) => {
      const av = a[colIndex];
      const bv = b[colIndex];
      const aStr = av == null ? "" : String(av);
      const bStr = bv == null ? "" : String(bv);
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [result, sortCol, sortDir, columnNames]);

  const tryLoadMore = useCallback(() => {
    if (!result?.hasMore || result.loadingMore || !onLoadMore || loadMoreLockRef.current) {
      return;
    }
    loadMoreLockRef.current = true;
    onLoadMore();
  }, [onLoadMore, result?.hasMore, result?.loadingMore]);

  useEffect(() => {
    if (!result?.loadingMore) {
      loadMoreLockRef.current = false;
    }
  }, [result?.loadingMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onLoadMore) return;

    const onScroll = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining <= SCROLL_LOAD_THRESHOLD_PX) {
        tryLoadMore();
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onLoadMore, tryLoadMore]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const emitFilters = useCallback(
    (values: Record<string, string>) => {
      if (!onFiltersChange) return;
      const filters: ResultColumnFilter[] = Object.entries(values)
        .filter(([, value]) => value.trim() !== "")
        .map(([column, value]) => ({
          column,
          operator: "contains",
          value: value.trim(),
        }));
      onFiltersChange(filters);
    },
    [onFiltersChange],
  );

  const handleFilterInput = (column: string, value: string) => {
    setDraftValues((prev) => {
      const next = { ...prev, [column]: value };
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => emitFilters(next), FILTER_DEBOUNCE_MS);
      return next;
    });
  };

  const clearColumnFilter = (column: string) => {
    setDraftValues((prev) => {
      const next = { ...prev };
      delete next[column];
      emitFilters(next);
      return next;
    });
  };

  if (isLoading && !result) {
    return <ResultsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!result) {
    return (
      <WorkspaceEmptyState
        icon={Database}
        title="Run a query to see results"
        hint="⌘↵ or click Run Query"
      />
    );
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const loadedCount = result.rows.length;
  const filtering = result.filtering;
  const activeFilterCount = activeFilters.length;
  const limitHint = result.autoLimitApplied
    ? `Limited to ${DEFAULT_QUERY_LIMIT} rows by default. Scroll to load more.`
    : result.hasMore
      ? "Using query-defined limit. Scroll to load more."
      : hasExplicitLimitHint(result)
        ? "Using query-defined limit."
        : null;

  const filterStatusText = filtering.enabled
    ? activeFilterCount > 0
      ? `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
      : "Column filters available"
    : "Column filters are unavailable for this query.";

  return (
    <div ref={scrollRef} className="h-full overflow-auto flex flex-col">
      <div className="shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border bg-surface-1/30 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          {filtering.enabled ? (
            <Filter className="size-3 shrink-0 text-electric/80" />
          ) : (
            <Info className="size-3 shrink-0 opacity-70" />
          )}
          <span
            title={
              filtering.enabled
                ? undefined
                : (filtering.reason ??
                  "This query is too complex to filter safely from the UI.")
            }
            className={cn(!filtering.enabled && "cursor-help underline decoration-dotted underline-offset-2")}
          >
            {filterStatusText}
          </span>
        </span>
        {activeFilterCount > 0 && onClearAllFilters && (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="inline-flex items-center gap-1 text-electric hover:underline"
          >
            <X className="size-3" />
            Clear all filters
          </button>
        )}
        {result.loadingFilter && (
          <span className="inline-flex items-center gap-1 text-electric">
            <Loader2 className="size-3 animate-spin" />
            Filtering…
          </span>
        )}
      </div>
      {limitHint && (
        <div className="shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border bg-surface-1/20 flex items-center gap-1.5">
          <Info className="size-3 shrink-0 opacity-70" />
          <span>{limitHint}</span>
        </div>
      )}
      <table className="w-full text-xs font-mono">
        <thead className="sticky top-0 bg-surface-1 border-b border-border z-10">
          <tr>
            <th className="w-10 text-left px-3 py-2 text-muted-foreground font-medium">#</th>
            {result.columns.map((col, index) => (
              <th
                key={`${col.name}-${index}`}
                className="text-left px-3 py-2 text-muted-foreground font-medium cursor-pointer hover:text-electric transition-colors group"
                onClick={() => toggleSort(col.name)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.name}
                  {activeFilters.some((f) => f.column === col.name) && (
                    <Filter className="size-3 text-electric" aria-hidden />
                  )}
                  <ArrowUpDown
                    className={cn(
                      "size-3 transition-opacity",
                      sortCol === col.name ? "opacity-100 text-electric" : "opacity-40 group-hover:opacity-100",
                    )}
                  />
                </span>
              </th>
            ))}
          </tr>
          {filtering.enabled && onFiltersChange && (
            <tr className="border-t border-border/60 bg-surface-1/80">
              <th className="px-3 py-1.5" />
              {result.columns.map((col, index) => (
                <th key={`filter-${col.name}-${index}`} className="px-2 py-1.5 font-normal">
                  {col.filterable ? (
                    <div className="relative">
                      <Input
                        value={draftValues[col.name] ?? ""}
                        onChange={(e) => handleFilterInput(col.name, e.target.value)}
                        placeholder="contains…"
                        aria-label={`Filter ${col.name}`}
                        className="h-7 text-[11px] font-mono pr-7 bg-background/80"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {(draftValues[col.name] ?? "").length > 0 && (
                        <button
                          type="button"
                          aria-label={`Clear ${col.name} filter`}
                          onClick={(e) => {
                            e.stopPropagation();
                            clearColumnFilter(col.name);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  ) : null}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {sortedRows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-border/60 hover:bg-surface-1/60 transition-colors"
            >
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {columnNames[j] === "status" ? (
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] ${statusColor[String(cell)] ?? ""}`}
                    >
                      {String(cell)}
                    </span>
                  ) : (
                    String(cell ?? "")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-[10px] text-muted-foreground font-mono border-t border-border bg-surface-1/40 mt-auto flex items-center gap-2">
        <span>
          {loadedCount} rows loaded • {result.durationMs} ms
          {result.cached ? " • cached" : ""}
        </span>
        {result.loadingMore && (
          <span className="inline-flex items-center gap-1 text-electric">
            <Loader2 className="size-3 animate-spin" />
            Loading more…
          </span>
        )}
        {!result.hasMore && loadedCount > 0 && !result.loadingMore && (
          <span className="text-muted-foreground/80">All rows loaded</span>
        )}
      </div>
    </div>
  );
}

function hasExplicitLimitHint(result: QueryResult): boolean {
  return !result.autoLimitApplied && result.limit > 0;
}
