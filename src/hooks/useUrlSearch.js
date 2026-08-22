import { useSearchParams } from "react-router-dom";

// Reads ?q=&from=&to= from the URL once, for pages the header's
// GlobalSearch (src/layout/GlobalSearch.jsx) can navigate to. A page
// calls this once and feeds the returned values into whatever search
// state it already has (a `q` useState for server search, or DataTable's
// `setFilter` for a dateRange/text column) — this hook doesn't own any
// search behavior itself, just exposes what arrived in the URL.
export function useUrlSearch() {
  const [searchParams] = useSearchParams();
  return {
    q: searchParams.get("q") || "",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
  };
}
