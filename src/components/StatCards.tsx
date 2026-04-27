import type { Entry } from "../types";

interface StatCardsProps {
  data: Entry[];
}

export function StatCards({ data }: StatCardsProps) {
  const shipped = data.filter((e) => e.status === "Shipped").length;
  const confirmed = data.filter((e) => e.status === "Confirmed").length;
  const waiting = data.filter((e) => e.status === "Waiting").length;
  const countries = new Set(data.map((e) => e.country).filter((c) => c !== "Unknown")).size;
  const devices = new Set(data.map((e) => e.device).filter((d) => d !== "Unknown")).size;
  const shipRate = data.length ? Math.round((shipped / data.length) * 100) : 0;

  const leads = data
    .filter((e) => e.orderDate && e.confirmDate)
    .map((e) => (new Date(e.confirmDate!).getTime() - new Date(e.orderDate!).getTime()) / 86400000);
  const avgLead = leads.length ? Math.round(leads.reduce((a, b) => a + b, 0) / leads.length) : 0;

  const cards = [
    { value: data.length.toLocaleString(),         label: "Reports",   hint: "matching filters",   color: "var(--ink)" },
    { value: shipped.toLocaleString(),             label: "Shipped",   hint: `${shipRate}% of feed`, color: "var(--moss)" },
    { value: confirmed.toLocaleString(),           label: "Confirmed", hint: "awaiting label",     color: "var(--bolt)" },
    { value: waiting.toLocaleString(),             label: "Waiting",   hint: "no email yet",       color: "var(--sun)" },
    { value: countries.toString(),                 label: "Countries", hint: `${devices} models`,  color: "var(--plum)" },
    { value: avgLead ? `${avgLead}d` : "—",        label: "Avg Lead",  hint: "order → confirm",    color: "var(--flame)" },
  ];

  return (
    <div className="stat-cards">
      {cards.map((c) => (
        <div
          key={c.label}
          className="stat-card"
          style={{ "--stat-color": c.color } as React.CSSProperties}
        >
          <div className="label">{c.label}</div>
          <div className="value">{c.value}</div>
          <div className="hint">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}
