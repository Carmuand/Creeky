/**
 * Properties for the {@link Pagination} component.
 */
interface PaginationProps {
  /** Current page index (1-based). */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Callback fired when the page changes. */
  onPageChange: (page: number) => void;
  /** Total number of items (for display). */
  totalItems?: number;
  /** Number of items per page (for display). */
  pageSize?: number;
  /** Additional class name for the container. */
  className?: string;
}

/**
 * Reusable pagination with prev/next and numbered buttons.
 */
export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const delta = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) pages.push(i);
    else if (pages[pages.length - 1] !== "ellipsis") pages.push("ellipsis");
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {totalItems !== undefined && pageSize !== undefined ? (
        <span className="text-xs text-(--muted)">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} de {totalItems}
        </span>
      ) : <span />}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          ‹
        </button>

        {pages.map((p, idx) =>
          p === "ellipsis" ? (
            <span key={`e-${idx}`} className="px-2 text-xs text-(--muted)">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${p === page ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent) hover:text-(--accent)"}`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          ›
        </button>
      </div>
    </div>
  );
}