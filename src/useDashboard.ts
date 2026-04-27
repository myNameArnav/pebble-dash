import { useState, useEffect, useCallback, useMemo } from "react";
import type { Entry, Post, Filters, SortState } from "./types";
import { INITIAL_DATA, normalizeEntry, loadLiveData } from "./data-utils";

export function useDashboard() {
  const [entries, setEntries] = useState<Entry[]>(INITIAL_DATA.entries.map(normalizeEntry));
  const [post, setPost] = useState<Post>(INITIAL_DATA.post);
  const [dataSource, setDataSource] = useState<"loading" | "live" | "failed">("loading");

  const [filters, setFilters] = useState<Filters>({ status: "All", batch: "All", device: "All" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ column: "created", asc: false });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const getFiltered = useCallback((currentEntries: Entry[], currentFilters: Filters, currentSearch: string) => {
    const q = currentSearch.trim().toLowerCase();
    return currentEntries.filter((e) => {
      if (currentFilters.status !== "All" && e.status !== currentFilters.status) return false;
      if (currentFilters.batch !== "All" && e.batch !== currentFilters.batch) return false;
      if (currentFilters.device !== "All" && e.device !== currentFilters.device) return false;
      if (q) {
        const hay = `${e.author} ${e.country} ${e.device} ${e.color} ${e.batch} ${e.body || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, []);

  const filtered = useMemo(() => getFiltered(entries, filters, search), [entries, filters, search, getFiltered]);

  const sortData = useCallback((data: Entry[]) => {
    const { column, asc } = sort;
    const dir = asc ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[column];
      const bv = (b as unknown as Record<string, unknown>)[column];
      const aEmpty = av == null || av === "" || av === "Unknown";
      const bEmpty = bv == null || bv === "" || bv === "Unknown";
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;
      if (aEmpty && bEmpty) return 0;
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  }, [sort]);

  const sorted = useMemo(() => sortData(filtered), [filtered, sortData]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(sorted.length / pageSize)), [sorted.length, pageSize]);
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSort = useCallback((column: string) => {
    setSort((prev) => {
      if (prev.column === column) return { column, asc: !prev.asc };
      return { column, asc: true };
    });
    setPage(1);
  }, []);

  const handleFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ status: "All", batch: "All", device: "All" });
    setSearch("");
    setPage(1);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const live = await loadLiveData();
        setPost(live.post);
        setEntries(live.entries);
        setDataSource("live");
        setExpandedRows(new Set());
      } catch (error) {
        console.error(error);
        setDataSource("failed");
      }
    }
    init();
  }, []);

  return {
    entries,
    post,
    dataSource,
    filtered,
    sorted,
    slice,
    page: currentPage,
    pageCount,
    pageSize,
    filters,
    search,
    sort,
    expandedRows,
    setPage,
    handleSort,
    handleFilter,
    handleSearch,
    resetFilters,
    toggleExpanded,
  };
}
