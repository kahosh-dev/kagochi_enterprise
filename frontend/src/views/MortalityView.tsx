import { useEffect, useState, useCallback } from "react";
import type { MortalitySummary, MortalityPoint } from "../types/farm";
import { loadMortalitySummary } from "../services/storage";

type Granularity = "daily" | "weekly" | "monthly" | "yearly";

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function getPreset(preset: string): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "today": {
      const t = formatDate(today);
      return { from: t, to: t };
    }
    case "week": {
      // ISO Monday of the current week
      const day = today.getUTCDay(); // 0=Sun, 1=Mon, ...
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      const monday = addDays(today, diffToMonday);
      return { from: formatDate(monday), to: formatDate(today) };
    }
    case "month": {
      const y = today.getUTCFullYear();
      const m = String(today.getUTCMonth() + 1).padStart(2, "0");
      return { from: `${y}-${m}-01`, to: formatDate(today) };
    }
    case "year": {
      const y = today.getUTCFullYear();
      return { from: `${y}-01-01`, to: formatDate(today) };
    }
    default: {
      const m2 = String(today.getUTCMonth() + 1).padStart(2, "0");
      return { from: `${today.getUTCFullYear()}-${m2}-01`, to: formatDate(today) };
    }
  }
}

// Simple SVG bar chart
function SvgBarChart({ points, maxVal }: { points: MortalityPoint[]; maxVal: number }) {
  const W = 800;
  const H = 180;
  const PAD_LEFT = 50;
  const PAD_BOTTOM = 36;
  const PAD_TOP = 16;
  const chartW = W - PAD_LEFT - 8;
  const chartH = H - PAD_BOTTOM - PAD_TOP;
  const barW = Math.max(4, Math.floor(chartW / Math.max(points.length, 1)) - 2);

  if (points.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
        No data for this period.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: `${W}px`, height: `${H}px`, display: 'block' }} aria-label="Mortality rate chart">
        {/* Y-axis label */}
        <text x={12} y={H / 2} fontSize={11} fill="#64748b" transform={`rotate(-90, 12, ${H / 2})`} textAnchor="middle">
          Deaths
        </text>
        {/* Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD_TOP + chartH * (1 - frac);
          const val = Math.round(maxVal * frac);
          return (
            <g key={frac}>
              <line x1={PAD_LEFT} y1={y} x2={W - 8} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD_LEFT - 4} y={y + 4} fontSize={10} fill="#94a3b8" textAnchor="end">{val}</text>
            </g>
          );
        })}
        {/* Bars */}
        {points.map((pt, i) => {
          const x = PAD_LEFT + (chartW / points.length) * i + (chartW / points.length - barW) / 2;
          const barH = maxVal > 0 ? (pt.deaths / maxVal) * chartH : 0;
          const y = PAD_TOP + chartH - barH;
          const fill = pt.cannotCalculate ? '#cbd5e1' : '#ef4444';
          const labelX = x + barW / 2;
          const labelText = pt.label.length > 8 ? pt.label.slice(5) : pt.label; // trim for space
          return (
            <g key={pt.label}>
              <rect x={x} y={y} width={barW} height={barH} fill={fill} rx={2}>
                <title>
                  {pt.label}: {pt.deaths} deaths
                  {pt.cannotCalculate ? ' (cannot calculate rate — no population data)' : pt.mortalityRatePercent !== null ? ` (${pt.mortalityRatePercent.toFixed(2)}% rate)` : ''}
                </title>
              </rect>
              <text x={labelX} y={H - 4} fontSize={9} fill="#64748b" textAnchor="middle" transform={`rotate(-40, ${labelX}, ${H - 4})`}>
                {labelText}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MortalityView() {
  const today = formatDate(new Date());
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${d.getUTCFullYear()}-${m}-01`;
  });
  const [customTo, setCustomTo] = useState(today);
  const [isCustom, setIsCustom] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [species, setSpecies] = useState<"" | "poultry" | "cattle">("");

  const [summary, setSummary] = useState<MortalitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const from = isCustom ? customFrom : getPreset(preset).from;
  const to   = isCustom ? customTo   : getPreset(preset).to;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loadMortalitySummary({
        from,
        to,
        period: granularity,
        species: species || undefined,
      });
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mortality data.");
    } finally {
      setLoading(false);
    }
  }, [from, to, granularity, species]);

  useEffect(() => { fetch(); }, [fetch]);

  const series = summary?.series ?? [];
  const maxDeaths = Math.max(...series.map((p) => p.deaths), 1);
  const totalDeaths = series.reduce((s, p) => s + p.deaths, 0);
  const knowable = series.filter((p) => !p.cannotCalculate && p.deaths > 0);
  const avgRate = knowable.length > 0
    ? (knowable.reduce((s, p) => s + (p.mortalityRatePercent ?? 0), 0) / knowable.length)
    : null;

  return (
    <div className="management-page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>Animal Deaths &amp; Mortality Rates</h2>
        <p style={{ color: '#64748b', margin: 0 }}>Monitor deaths and mortality rate trends over time.</p>
      </div>

      {/* Period Filter Bar */}
      <div className="dashboard-filter-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        {[
          { key: "today", label: "Today" },
          { key: "week",  label: "This Week" },
          { key: "month", label: "This Month" },
          { key: "year",  label: "This Year" },
          { key: "custom", label: "Custom" },
        ].map((p) => (
          <button
            key={p.key}
            className={`filter-chip ${(p.key === "custom" ? isCustom : (!isCustom && preset === p.key)) ? "filter-chip-active" : ""}`}
            onClick={() => {
              if (p.key === "custom") { setIsCustom(true); }
              else { setIsCustom(false); setPreset(p.key); }
            }}
            style={{ fontWeight: (p.key === "custom" ? isCustom : (!isCustom && preset === p.key)) ? 700 : 400 }}
          >
            {p.label}
          </button>
        ))}

        {isCustom && (
          <>
            <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
            <span style={{ color: '#64748b' }}>to</span>
            <input type="date" value={customTo} min={customFrom} max={today} onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} />
          </>
        )}
      </div>

      {/* Granularity + Species */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {(["daily","weekly","monthly","yearly"] as Granularity[]).map((g) => (
            <button
              key={g}
              className={`filter-chip ${granularity === g ? "filter-chip-active" : ""}`}
              onClick={() => setGranularity(g)}
              style={{ textTransform: 'capitalize', fontWeight: granularity === g ? 700 : 400 }}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        <select
          className="filter-chip"
          value={species}
          onChange={(e) => setSpecies(e.target.value as any)}
          style={{ padding: '0.35rem 0.75rem' }}
        >
          <option value="">All animals</option>
          <option value="poultry">Poultry only</option>
          <option value="cattle">Livestock only</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="summary-card">
          <p className="card-label">Animals that died</p>
          <h3>{totalDeaths.toLocaleString()}</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{from} to {to}</p>
        </div>
        <div className="summary-card">
          <p className="card-label">Avg Mortality Rate</p>
          {avgRate !== null
            ? <h3>{avgRate.toFixed(2)}%</h3>
            : <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: '0.5rem 0' }}>Cannot calculate</p>
          }
        </div>
        <div className="summary-card">
          <p className="card-label">Periods Tracked</p>
          <h3>{series.length}</h3>
        </div>
      </div>

      {error && (
        <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: '#64748b', textAlign: 'center' }}>Loading…</p>}

      {!loading && summary && (
        <>
          {/* Bar Chart */}
          <div className="management-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="card-heading">Animals that died — by {granularity} period</h3>
            <SvgBarChart points={series} maxVal={maxDeaths} />
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              Grey bars indicate periods where starting population is unknown and mortality rate cannot be calculated.
            </p>
          </div>

          {/* Data Table */}
          <div className="management-card">
            <h3 className="card-heading">Detailed Summary</h3>
            {series.length === 0
              ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>No deaths recorded in this period.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th style={{ textAlign: 'right' }}>Animals that died</th>
                        <th style={{ textAlign: 'right' }}>Starting Population</th>
                        <th style={{ textAlign: 'right' }}>Mortality Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {series.map((pt) => (
                        <tr key={pt.label}>
                          <td>{pt.label}</td>
                          <td style={{ textAlign: 'right' }}>{pt.deaths}</td>
                          <td style={{ textAlign: 'right' }}>
                            {pt.startPopulation !== null ? pt.startPopulation.toLocaleString() : <span style={{ color: '#94a3b8' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {pt.cannotCalculate
                              ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Cannot calculate</span>
                              : pt.mortalityRatePercent !== null
                                ? `${pt.mortalityRatePercent.toFixed(2)}%`
                                : '0.00%'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </>
      )}
    </div>
  );
}

export default MortalityView;
