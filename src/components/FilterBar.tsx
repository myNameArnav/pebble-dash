import type { Filters } from "../types";

interface FilterBarProps {
  filters: Filters;
  search: string;
  entries: { status: string; batch: string; device: string }[];
  onFilter: (key: keyof Filters, value: string) => void;
  onSearch: (value: string) => void;
  onReset: () => void;
}

function buildChipCounts(entries: { status: string; batch: string; device: string }[]) {
  const statusCounts: Record<string, number> = {};
  const batchCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = {};
  entries.forEach((e) => {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    batchCounts[e.batch] = (batchCounts[e.batch] || 0) + 1;
    deviceCounts[e.device] = (deviceCounts[e.device] || 0) + 1;
  });
  return { statusCounts, batchCounts, deviceCounts };
}

function ChipGroup({
  label,
  options,
  counts,
  active,
  onChange,
}: {
  label: string;
  options: string[];
  counts: Record<string, number>;
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <button
        className={`chip${active === "All" ? " active" : ""}`}
        onClick={() => onChange("All")}
      >
        All
      </button>
      {options.map((v) => (
        <button
          key={v}
          className={`chip${active === v ? " active" : ""}`}
          onClick={() => onChange(v)}
        >
          {v}
          <span className="count">{counts[v] || 0}</span>
        </button>
      ))}
    </div>
  );
}

export function FilterBar({ filters, search, entries, onFilter, onSearch, onReset }: FilterBarProps) {
  const { statusCounts, batchCounts, deviceCounts } = buildChipCounts(entries);

  return (
    <div className="filter-bar">
      <div className="filter-inner">
        <ChipGroup
          label="Status"
          options={["Shipped", "Confirmed", "Waiting", "Unknown"]}
          counts={statusCounts}
          active={filters.status}
          onChange={(v) => onFilter("status", v)}
        />
        <ChipGroup
          label="Batch"
          options={["Batch 1", "Batch 2", "Batch 3", "Batch 4", "Batch 5"]}
          counts={batchCounts}
          active={filters.batch}
          onChange={(v) => onFilter("batch", v)}
        />
        <ChipGroup
          label="Device"
          options={["Pebble Duo 2", "Pebble Time 2", "Pebble Round", "Pebble Index"]}
          counts={deviceCounts}
          active={filters.device}
          onChange={(v) => onFilter("device", v)}
        />
        <div className="search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search the wire…"
            aria-label="Search reports"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <button className="filter-reset" type="button" onClick={onReset}>
          ✕ Clear
        </button>
      </div>
    </div>
  );
}
