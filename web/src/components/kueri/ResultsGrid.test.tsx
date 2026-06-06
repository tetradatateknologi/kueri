import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResultsGrid } from "@/components/kueri/ResultsGrid";
import type { QueryResult } from "@/lib/api/types";

function makeResult(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    columns: [{ name: "id", filterable: true }],
    rows: Array.from({ length: 20 }, (_, i) => [i + 1]),
    rowCount: 20,
    durationMs: 12,
    cached: false,
    limit: 20,
    offset: 0,
    hasMore: true,
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

describe("ResultsGrid infinite scroll", () => {
  it("calls onLoadMore when scrolled near the bottom", () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <ResultsGrid result={makeResult()} isLoading={false} error={null} onLoadMore={onLoadMore} />,
    );

    const scrollEl = container.firstElementChild as HTMLDivElement;
    Object.defineProperty(scrollEl, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(scrollEl, "clientHeight", { configurable: true, value: 400 });
    scrollEl.scrollTop = 500;

    fireEvent.scroll(scrollEl);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not call onLoadMore repeatedly while loading", () => {
    const onLoadMore = vi.fn();
    const { container } = render(
      <ResultsGrid
        result={makeResult({ loadingMore: true })}
        isLoading={false}
        error={null}
        onLoadMore={onLoadMore}
      />,
    );

    const scrollEl = container.firstElementChild as HTMLDivElement;
    Object.defineProperty(scrollEl, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(scrollEl, "clientHeight", { configurable: true, value: 400 });
    scrollEl.scrollTop = 500;

    fireEvent.scroll(scrollEl);
    fireEvent.scroll(scrollEl);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("shows all rows loaded when hasMore is false", () => {
    render(
      <ResultsGrid
        result={makeResult({ hasMore: false })}
        isLoading={false}
        error={null}
        onLoadMore={vi.fn()}
      />,
    );

    expect(screen.getByText("All rows loaded")).toBeTruthy();
  });

  it("shows auto-limit info message", () => {
    render(
      <ResultsGrid result={makeResult()} isLoading={false} error={null} onLoadMore={vi.fn()} />,
    );

    expect(screen.getByText(/Limited to 20 rows by default/i)).toBeTruthy();
  });
});
