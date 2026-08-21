import "./Pagination.css";

// Simple Previous/Next + page count — no jump-to-page, no user-configurable
// page size.
export default function Pagination({ page, limit, total, onPageChange }) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return null;

  return (
    <div className="bp-pagination">
      <button
        type="button"
        className="bp-pagination-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="bp-pagination-info">
        Page {page} of {pageCount} · {total} total
      </span>
      <button
        type="button"
        className="bp-pagination-btn"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
