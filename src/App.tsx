import "./index.css";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Fragment } from "react";
import { FilterBar } from "./components/FilterBar";
import { Mark } from "./components/Mark";
import { StatCards } from "./components/StatCards";
import { useDashboard } from "./useDashboard";
import type { Entry, Post } from "./types";

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

const THREAD_URL = "https://www.reddit.com/r/pebble/comments/1sjk3c7/shipping_mega_thread";

/* Editorial palette — must mirror index.css custom props */
const ink = {
  ink: "#0e0e0e",
  inkSoft: "#4a463c",
  inkMute: "#7d7864",
  paper: "#f2ede0",
  paper2: "#ebe4d2",
  flame: "#ff5722",
  acid: "#f5ff50",
  bolt: "#1f4dff",
  moss: "#00b86b",
  siren: "#ff3d7f",
  sun: "#ffb400",
  plum: "#6f3ff5",
};

const colors = {
  shipped: ink.moss,
  confirmed: ink.bolt,
  waiting: ink.sun,
  unknown: ink.inkMute,
  flame: ink.flame,
  bolt: ink.bolt,
  moss: ink.moss,
  siren: ink.siren,
  plum: ink.plum,
  sun: ink.sun,
  acid: ink.acid,
};

/* Each watch-color label gets its real-world appearance.
   Borders are inked, so even pale silver reads cleanly on cream paper. */
const watchColors: Record<string, string> = {
  "Black/Grey": "#2a2a2a",
  "Silver":     "#a8a8b0",
  "Black/Blue": "#1d4ed8",
  "Black/Red":  "#dc2626",
  "Unknown":    "#8a8478",
};

const monoFont = "ui-monospace, SF Mono, Menlo, JetBrains Mono, monospace";

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: ink.ink,
        boxWidth: 10,
        usePointStyle: true,
        font: { family: monoFont, size: 10, weight: 700 as const },
      },
    },
    tooltip: {
      backgroundColor: ink.ink,
      titleColor: ink.acid,
      bodyColor: ink.paper,
      borderColor: ink.ink,
      borderWidth: 0,
      padding: 10,
      titleFont: { family: monoFont, size: 11, weight: 700 as const },
      bodyFont: { family: monoFont, size: 11 },
      cornerRadius: 0,
    },
  },
  scales: {
    x: {
      ticks: { color: ink.inkSoft, font: { family: monoFont, size: 10 } },
      grid: { color: "rgba(14,14,14,.07)", drawTicks: false },
      border: { color: ink.ink, width: 1.5 },
    },
    y: {
      ticks: { color: ink.inkSoft, precision: 0, font: { family: monoFont, size: 10 } },
      grid: { color: "rgba(14,14,14,.07)", drawTicks: false },
      border: { color: ink.ink, width: 1.5 },
    },
  },
};

function countBy(data: Entry[], getter: (entry: Entry) => string) {
  return data.reduce<Record<string, number>>((acc, entry) => {
    const key = getter(entry) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function postInfo(post: Post, source: string) {
  const parts: string[] = ["Filed from r/pebble"];
  if (post.numComments) parts.push(`${post.numComments.toLocaleString()} comments scanned`);
  if (post.created) parts.push(`thread opened ${new Date(post.created).toLocaleDateString()}`);
  if (source === "loading") parts.push("loading live data…");
  if (source === "failed") parts.push("live fetch failed — bundled snapshot");
  if (source === "live") parts.push("live");
  return parts.join(" · ");
}

function todayStamp() {
  const now = new Date();
  return now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function Wire({ post, source, total, shipped }: { post: Post; source: string; total: number; shipped: number }) {
  const sourceLabel = source === "live" ? "LIVE FEED" : source === "loading" ? "BOOTING…" : "BUNDLED SNAPSHOT";
  const items = [
    <span key="src" className="blink">{sourceLabel}</span>,
    <span key="reports">REPORTS · {total.toLocaleString()}</span>,
    <span key="shipped">SHIPPED · {shipped.toLocaleString()}</span>,
    <span key="comments">COMMENTS · {post.numComments?.toLocaleString() ?? "—"}</span>,
    <span key="thread">THREAD · r/pebble · MEGA</span>,
    <span key="stamp">{todayStamp().toUpperCase()}</span>,
  ];
  return <div className="wire">{items}</div>;
}

function Masthead({ post, source, filtered }: { post: Post; source: string; filtered: Entry[] }) {
  const total = filtered.length;
  const shipped = filtered.filter((e) => e.status === "Shipped").length;
  const confirmed = filtered.filter((e) => e.status === "Confirmed").length;
  const waiting = filtered.filter((e) => e.status === "Waiting").length;

  return (
    <header className="masthead">
      <div className="masthead-grid">
        <div>
          <div className="masthead-eyebrow">
            <span className="pill">Pebble Telex</span>
            <span className="vol">VOL. 01 · ED. {(post.numComments % 99 || 1).toString().padStart(2, "0")}</span>
            <span>The Shipping Bulletin</span>
          </div>
          <h1 className="title">
            The <span className="ital">Pebble</span> Has<br />
            <span className="mark">Landed</span><span className="ital">.</span>
          </h1>
          <p className="subtitle">
            A field log of the 2026 Pebble rollout — every order, confirmation and tracking number, harvested live from r/pebble's mega-thread.
          </p>
          <p id="post-info">{postInfo(post, source)}</p>
        </div>
        <div className="masthead-meta">
          <Mark size={72} className="masthead-mark" />
          <div><strong>{todayStamp()}</strong></div>
          <div>Issued from the field</div>
          <div style={{ marginTop: ".5rem" }}>—</div>
          <div>Open · No paywall · No login</div>
        </div>
      </div>

      <Progress shipped={shipped} confirmed={confirmed} waiting={waiting} total={total} />
    </header>
  );
}

function Progress({ shipped, confirmed, waiting, total }: { shipped: number; confirmed: number; waiting: number; total: number }) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return (
    <div className="progress-wrap">
      <div className="progress-row">
        <span>Rollout · shipped + confirmed</span>
        <span><strong>{shipped + confirmed}</strong> / {total} reports</span>
      </div>
      <div className="progress-bar">
        <div className="progress-seg shipped"   style={{ width: `${pct(shipped)}%` }} />
        <div className="progress-seg confirmed" style={{ width: `${pct(confirmed)}%` }} />
        <div className="progress-seg waiting"   style={{ width: `${pct(waiting)}%` }} />
      </div>
      <div className="progress-row" style={{ marginTop: ".55rem", marginBottom: 0 }}>
        <span>● shipped {shipped}</span>
        <span>● confirmed {confirmed}</span>
        <span>● waiting {waiting}</span>
      </div>
    </div>
  );
}

function SectionRule({ num, title, tail }: { num: string; title: string; tail: string }) {
  return (
    <div className="section-rule">
      <span className="badge-num">§ {num}</span>
      <h2>{title}</h2>
      <span className="line" />
      <span className="tail">{tail}</span>
    </div>
  );
}

function ChartCard({ slot, num, title, hint, children }: { slot: string; num: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className={`card c-${slot}`}>
      <div className="card-head">
        <h3>{title}</h3>
        <span className="card-num">№ {num}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-.5rem", marginBottom: ".5rem" }}>
        <span className="card-hint">{hint}</span>
      </div>
      <div className="chart-wrap">{children}</div>
    </section>
  );
}

function ConversionFunnel({ data }: { data: Entry[] }) {
  const orders = data.length;
  const confirmed = data.filter((e) => e.status === "Confirmed" || e.status === "Shipped").length;
  const shipped = data.filter((e) => e.status === "Shipped").length;

  const stages = [
    { key: "orders",    label: "Orders",    count: orders },
    { key: "confirmed", label: "Confirmed", count: confirmed },
    { key: "shipped",   label: "Shipped",   count: shipped },
  ];
  const base = orders || 1;

  return (
    <div className="funnel">
      {stages.map((s) => {
        const pct = (s.count / base) * 100;
        return (
          <div key={s.key} className={`funnel-row s-${s.key}`}>
            <span className="funnel-label">{s.label}</span>
            <div className="funnel-track">
              <div className="funnel-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="funnel-num">{s.count.toLocaleString()}</span>
            <span className="funnel-pct">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
      <div className="funnel-summary">
        <span>Confirm rate · <strong>{Math.round((confirmed / base) * 100)}%</strong></span>
        <span>Ship rate · <strong>{Math.round((shipped / base) * 100)}%</strong></span>
      </div>
    </div>
  );
}

function leadTimeBins(data: Entry[]) {
  const leads = data
    .filter((e) => e.orderDate && e.confirmDate)
    .map((e) => Math.max(0, (new Date(e.confirmDate!).getTime() - new Date(e.orderDate!).getTime()) / 86400000));
  const bins: { label: string; test: (d: number) => boolean }[] = [
    { label: "≤1d",    test: (d) => d <= 1 },
    { label: "2–3d",   test: (d) => d > 1 && d <= 3 },
    { label: "4–7d",   test: (d) => d > 3 && d <= 7 },
    { label: "8–14d",  test: (d) => d > 7 && d <= 14 },
    { label: "15–30d", test: (d) => d > 14 && d <= 30 },
    { label: "30d+",   test: (d) => d > 30 },
  ];
  return {
    labels: bins.map((b) => b.label),
    counts: bins.map((b) => leads.filter(b.test).length),
    sample: leads.length,
  };
}

function shipVelocity(data: Entry[]) {
  const days: Record<string, number> = {};
  data.forEach((e) => {
    if (typeof e.shippingDate !== "string" || !e.shippingDate) return;
    const day = e.shippingDate.split("T")[0];
    days[day] = (days[day] || 0) + 1;
  });
  const labels = Object.keys(days).sort();
  return { labels, counts: labels.map((l) => days[l]) };
}

function Charts({ data }: { data: Entry[] }) {
  const statusCounts = countBy(data, (e) => e.status);
  const statusLabels = ["Shipped", "Confirmed", "Waiting", "Unknown"].filter((key) => statusCounts[key]);
  const devices = Array.from(new Set(data.map((e) => e.device))).filter((d) => d !== "Unknown");
  const countryRows = Object.entries(countBy(data.filter((e) => e.country !== "Unknown"), (e) => e.country))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const batches = ["Batch 1", "Batch 2", "Batch 3", "Batch 4", "Batch 5"].filter((batch) => data.some((e) => e.batch === batch));

  const groupByDate = (field: keyof Entry) => {
    const days: Record<string, number> = {};
    data.forEach((entry) => {
      const value = entry[field];
      if (typeof value !== "string" || !value) return;
      const day = value.split("T")[0];
      days[day] = (days[day] || 0) + 1;
    });
    return days;
  };
  const ordersByDay = groupByDate("orderDate");
  const confirmsByDay = groupByDate("confirmDate");
  const shipsByDay = groupByDate("shippingDate");
  const timelineLabels = Array.from(new Set([
    ...Object.keys(ordersByDay),
    ...Object.keys(confirmsByDay),
    ...Object.keys(shipsByDay),
  ])).sort();
  let orders = 0;
  let confirms = 0;
  let ships = 0;

  const lead = leadTimeBins(data);
  const velocity = shipVelocity(data);

  return (
    <div className="charts-grid">
      <ChartCard slot="status" num="01" title="Shipping Status" hint="Distribution">
        <Doughnut
          data={{
            labels: statusLabels,
            datasets: [{
              data: statusLabels.map((key) => statusCounts[key]),
              backgroundColor: [colors.shipped, colors.confirmed, colors.waiting, colors.unknown],
              borderColor: ink.ink,
              borderWidth: 2,
            }],
          }}
          options={{ responsive: true, maintainAspectRatio: false, plugins: chartOptions.plugins, cutout: "62%" }}
        />
      </ChartCard>

      <ChartCard slot="funnel" num="02" title="Order → Ship Funnel" hint="Stage conversion">
        <ConversionFunnel data={data} />
      </ChartCard>

      <ChartCard slot="leadtime" num="03" title="Lead Time" hint={`Order → confirm · ${lead.sample} samples`}>
        <Bar
          data={{
            labels: lead.labels,
            datasets: [{
              label: "Reports",
              data: lead.counts,
              backgroundColor: colors.sun,
              borderColor: ink.ink,
              borderWidth: 1,
            }],
          }}
          options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
        />
      </ChartCard>

      <ChartCard slot="model" num="04" title="Model × Color" hint="Stacked · real watch colors">
        <Bar
          data={{
            labels: devices,
            datasets: ["Black/Grey", "Silver", "Black/Blue", "Black/Red", "Unknown"].map((color) => ({
              label: color,
              data: devices.map((device) => data.filter((e) => e.device === device && e.color === color).length),
              backgroundColor: watchColors[color],
              borderColor: ink.ink,
              borderWidth: 1,
            })),
          }}
          options={{ ...chartOptions, scales: { x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true } } }}
        />
      </ChartCard>

      <ChartCard slot="country" num="05" title="Top Countries" hint="Top 12 reporting">
        <Bar
          data={{
            labels: countryRows.map(([country]) => country),
            datasets: [{
              label: "Reports",
              data: countryRows.map(([, count]) => count),
              backgroundColor: colors.flame,
              borderColor: ink.ink,
              borderWidth: 1,
            }],
          }}
          options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
        />
      </ChartCard>

      <ChartCard slot="batch" num="06" title="Batch × Status" hint="Grouped">
        <Bar
          data={{
            labels: batches,
            datasets: ["Shipped", "Confirmed", "Waiting"].map((status) => ({
              label: status,
              data: batches.map((batch) => data.filter((e) => e.batch === batch && e.status === status).length),
              backgroundColor: status === "Shipped" ? colors.moss : status === "Confirmed" ? colors.bolt : colors.sun,
              borderColor: ink.ink,
              borderWidth: 1,
            })),
          }}
          options={chartOptions}
        />
      </ChartCard>

      <ChartCard slot="timeline" num="07" title="Cumulative Timeline" hint="Orders → Confirmed → Shipped">
        <Line
          data={{
            labels: timelineLabels,
            datasets: [
              { label: "Orders",    data: timelineLabels.map((day) => (orders   += ordersByDay[day]   || 0)), borderColor: ink.ink,    backgroundColor: "rgba(14,14,14,.10)",  fill: true, tension: 0,   borderWidth: 2, pointRadius: 0 },
              { label: "Confirmed", data: timelineLabels.map((day) => (confirms += confirmsByDay[day] || 0)), borderColor: colors.bolt, backgroundColor: "rgba(31,77,255,.12)", fill: true, tension: 0,   borderWidth: 2, pointRadius: 0 },
              { label: "Shipped",   data: timelineLabels.map((day) => (ships    += shipsByDay[day]    || 0)), borderColor: colors.moss, backgroundColor: "rgba(0,184,107,.18)", fill: true, tension: 0,   borderWidth: 2, pointRadius: 0 },
            ],
          }}
          options={chartOptions}
        />
      </ChartCard>

      <ChartCard slot="velocity" num="08" title="Daily Ship Velocity" hint="Ships per day">
        <Bar
          data={{
            labels: velocity.labels,
            datasets: [{
              label: "Ships",
              data: velocity.counts,
              backgroundColor: colors.moss,
              borderColor: ink.ink,
              borderWidth: 1,
            }],
          }}
          options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
        />
      </ChartCard>

      <ChartCard slot="comments" num="09" title="Comment Activity" hint="Posts per day">
        <Line
          data={{
            labels: Object.keys(groupByDate("created")).sort(),
            datasets: [{
              label: "Comments",
              data: Object.entries(groupByDate("created")).sort((a, b) => a[0].localeCompare(b[0])).map(([, count]) => count),
              borderColor: colors.siren,
              backgroundColor: "rgba(255,61,127,.15)",
              fill: true,
              tension: 0.2,
              borderWidth: 2,
              pointRadius: 0,
            }],
          }}
          options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }}
        />
      </ChartCard>
    </div>
  );
}

function badgeClass(status: string) {
  return ({ Shipped: "badge-shipped", Confirmed: "badge-confirmed", Waiting: "badge-waiting", Unknown: "badge-unknown" } as Record<string, string>)[status] || "badge-unknown";
}

function batchClass(batch: string) {
  return ({ "Batch 1": "badge-batch1", "Batch 2": "badge-batch2", "Batch 3": "badge-batch3", "Batch 4": "badge-batch4", "Batch 5": "badge-batch5" } as Record<string, string>)[batch] || "";
}

function keyOf(entry: Entry) {
  return `${entry.author}|${entry.created}`;
}

function ReportsTable({ dashboard }: { dashboard: ReturnType<typeof useDashboard> }) {
  const headers: [keyof Entry, string][] = [
    ["author", "Author"],
    ["device", "Device"],
    ["color", "Color"],
    ["country", "Country"],
    ["batch", "Batch"],
    ["status", "Status"],
    ["orderDate", "Order"],
    ["confirmDate", "Confirmed"],
  ];
  const start = dashboard.filtered.length ? (dashboard.page - 1) * dashboard.pageSize + 1 : 0;
  const end = Math.min(dashboard.filtered.length, dashboard.page * dashboard.pageSize);

  return (
    <section className="table-wrap">
      <div className="table-head">
        <h3>Field Reports — verbatim</h3>
        <span className="count-badge">{dashboard.filtered.length.toLocaleString()} on file</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {headers.map(([column, label]) => (
                <th
                  key={column}
                  className={dashboard.sort.column === column ? "sorted" : ""}
                  onClick={() => dashboard.handleSort(column)}
                >
                  {label}{" "}
                  <span className="sort-icon">
                    {dashboard.sort.column === column ? (dashboard.sort.asc ? "↑" : "↓") : "↕"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dashboard.slice.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  No reports match the current filters.
                </td>
              </tr>
            ) : (
              dashboard.slice.map((entry) => {
                const key = keyOf(entry);
                const isOpen = dashboard.expandedRows.has(key);
                return (
                  <Fragment key={key}>
                    <tr className={`data-row${isOpen ? " expanded" : ""}`} onClick={() => dashboard.toggleExpanded(key)}>
                      <td>{entry.author}</td>
                      <td>{entry.device}</td>
                      <td>{entry.color}</td>
                      <td>{entry.country}</td>
                      <td><span className={`badge ${batchClass(entry.batch)}`}>{entry.batch}</span></td>
                      <td><span className={`badge ${badgeClass(entry.status)}`}>{entry.status}</span></td>
                      <td>{entry.orderDate || "—"}</td>
                      <td>{entry.confirmDate || "—"}</td>
                    </tr>
                    {isOpen && (
                      <tr className="expand-row">
                        <td colSpan={8}>
                          <div className="expand-body">
                            <div className="expand-meta">
                              <span><strong>Posted</strong> {new Date(entry.created).toLocaleString()}</span>
                              <span><strong>Score</strong> {entry.score}</span>
                              {entry.shippingDate && <span><strong>Shipped</strong> {entry.shippingDate}</span>}
                            </div>
                            {entry.body.trim() || "(no body)"}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>Showing <strong>{start}–{end}</strong> of <strong>{dashboard.filtered.length}</strong></span>
        <div className="pages">
          <button disabled={dashboard.page <= 1} onClick={() => dashboard.setPage(dashboard.page - 1)}>← Prev</button>
          <button className="active">{dashboard.page} / {dashboard.pageCount}</button>
          <button disabled={dashboard.page >= dashboard.pageCount} onClick={() => dashboard.setPage(dashboard.page + 1)}>Next →</button>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const dashboard = useDashboard();
  const total = dashboard.filtered.length;
  const shipped = dashboard.filtered.filter((e) => e.status === "Shipped").length;

  return (
    <>
      <Wire post={dashboard.post} source={dashboard.dataSource} total={total} shipped={shipped} />
      <Masthead post={dashboard.post} source={dashboard.dataSource} filtered={dashboard.filtered} />
      <StatCards data={dashboard.filtered} />
      <FilterBar
        filters={dashboard.filters}
        search={dashboard.search}
        entries={dashboard.entries}
        onFilter={dashboard.handleFilter}
        onSearch={dashboard.handleSearch}
        onReset={dashboard.resetFilters}
      />
      <main className="dashboard">
        <SectionRule num="01" title="The Numbers" tail="Six dispatches" />
        <Charts data={dashboard.filtered} />

        <SectionRule num="02" title="The Reports" tail="Click any row" />
        <ReportsTable dashboard={dashboard} />
      </main>
      <footer>
        <div className="footer-inner">
          <span className="footer-mark">
            Pebble <span className="mark">Telex</span> — set in Times & Mono.
          </span>
          <span>
            Data <a href={THREAD_URL} target="_blank" rel="noopener noreferrer">r/pebble · Shipping Mega Thread</a>
          </span>
          <span>Click any row to read the full dispatch.</span>
        </div>
      </footer>
    </>
  );
}

export default App;
