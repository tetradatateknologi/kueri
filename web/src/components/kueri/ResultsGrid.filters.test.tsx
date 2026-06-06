import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResultsGrid } from "@/components/kueri/ResultsGrid";
import type { QueryResult } from "@/lib/api/types";

function makeResult(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    columns: [
      { name: "id", filterable: true },
      { name: "name", filterable: true },
    ],
    rows: [
      [1, "andi"],
      [2, "budi"],
    ],
    rowCount: 2,
    durationMs: 12,
    cached: false,
    limit: 20,
    offset: 0,
    hasMore: false,
    autoLimitApplied: true,
    filtering: {
      enabled: true,
      mode: "server",
      appliedFilters: [],
    },
    loadingMore: false,
    ...overrides,
  };
}

describe("ResultsGrid column filters", () => {
  it("shows filter inputs when filtering is enabled", () => {
    render(
      <ResultsGrid
        result={makeResult()}
        isLoading={false}
        error={null}
        activeFilters={[]}
        onFiltersChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Column filters available")).toBeTruthy();
    expect(screen.getByLabelText("Filter name")).toBeTruthy();
  });

  it("hides filter inputs when filtering is disabled", () => {
    render(
      <ResultsGrid
        result={makeResult({
          filtering: {
            enabled: false,
            mode: "none",
            reason: "Only SELECT queries support column filtering.",
          },
        })}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Column filters are unavailable for this query.")).toBeTruthy();
    expect(screen.queryByLabelText("Filter name")).toBeNull();
  });

  it("debounces filter changes", async () => {
    vi.useFakeTimers();
    const onFiltersChange = vi.fn();

    render(
      <ResultsGrid
        result={makeResult()}
        isLoading={false}
        error={null}
        activeFilters={[]}
        onFiltersChange={onFiltersChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Filter name"), { target: { value: "andi" } });
    expect(onFiltersChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(onFiltersChange).toHaveBeenCalledWith([
      { column: "name", operator: "contains", value: "andi" },
    ]);

    vi.useRealTimers();
  });

  it("clears all filters", () => {
    const onClearAllFilters = vi.fn();
    render(
      <ResultsGrid
        result={makeResult()}
        isLoading={false}
        error={null}
        activeFilters={[{ column: "name", operator: "contains", value: "andi" }]}
        onFiltersChange={vi.fn()}
        onClearAllFilters={onClearAllFilters}
      />,
    );

    fireEvent.click(screen.getByText("Clear all filters"));
    expect(onClearAllFilters).toHaveBeenCalledTimes(1);
  });
});
