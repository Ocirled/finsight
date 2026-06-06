"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { DateRangePicker, DateRange, formatDateRange } from "@/components/ui/DateRangePicker";
import type { Finding } from "@/lib/insights-compute";

// ─── Types ────────────────────────────────────────────────────────
interface TxDetail { date: string; description: string; amount: number }
interface CategoryTransaction { date: string; description: string; amount: number }
interface CategoryBreakdown {
  category: string; amount: number; count: number; percentage: number;
  transactions: CategoryTransaction[];
}
interface HeatmapPoint { date: string; amount: number; txs: TxDetail[] }
interface MerchantPoint { merchant: string; amount: number; count: number; transactions: TxDetail[] }

interface InsightsData {
  totalIncome: number; totalExpense: number; net: number;
  savingsRate: number; transactionCount: number;
  categoryBreakdown: CategoryBreakdown[];
  findings: Finding[];
  heatmap: HeatmapPoint[];
  topMerchants: MerchantPoint[];
  prevPeriod: {
    totalIncome: number; totalExpense: number; net: number;
    categoryBreakdown: { category: string; amount: number; percentage: number }[];
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────
const CATEGORY_HEX: Record<string, string> = {
  "Makanan & Minuman": "#f97316",
  "Transportasi": "#3b82f6",
  "Belanja": "#a855f7",
  "Hiburan": "#ec4899",
  "Kesehatan": "#22c55e",
  "Pendidikan": "#06b6d4",
  "Tagihan & Utilitas": "#eab308",
  "Investasi": "#10b981",
  "Pemasukan": "#14b8a6",
  "Lainnya": "#9f9b93",
};
const CATEGORY_BG: Record<string, string> = {
  "Makanan & Minuman": "bg-orange-500",
  "Transportasi": "bg-blue-500",
  "Belanja": "bg-purple-500",
  "Hiburan": "bg-pink-500",
  "Kesehatan": "bg-green-500",
  "Pendidikan": "bg-cyan-500",
  "Tagihan & Utilitas": "bg-yellow-500",
  "Investasi": "bg-emerald-500",
  "Pemasukan": "bg-teal-500",
  "Lainnya": "bg-[#9f9b93]",
};
const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "16px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};
const CAL_DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
// JS getDay(): 0=Sun…6=Sat → column index Mon=0…Sun=6
function calColIndex(jsDay: number) { return jsDay === 0 ? 6 : jsDay - 1; }

// ─── Helpers ─────────────────────────────────────────────────────
function toDateParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function diffPct(curr: number, prev: number) {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 100);
}
const _dayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "short" });
const _dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
function fmtTxDate(iso: string) {
  const d = new Date(iso);
  return `${_dayFmt.format(d)}, ${_dateFmt.format(d)}`;
}

// ─── Markdown renderer ────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#000000", fontWeight: 600 }}>{part.slice(2, -2)}</strong>
      : part
  );
}
function MarkdownBlock({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <p key={i} className="font-semibold text-sm mt-4 first:mt-0" style={{ color: "#000000" }}>{line.slice(3)}</p>;
        if (line.startsWith("### ")) return <p key={i} className="font-medium text-sm mt-3" style={{ color: "#55534e" }}>{line.slice(4)}</p>;
        if (line.startsWith("- ") || line.startsWith("• ")) return (
          <div key={i} className="flex gap-2 text-sm">
            <span className="shrink-0 mt-0.5" style={{ color: "#078a52" }}>•</span>
            <span className="leading-relaxed" style={{ color: "#55534e" }}>{parseInline(line.slice(2))}</span>
          </div>
        );
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i} className="text-sm leading-relaxed" style={{ color: "#55534e" }}>{parseInline(line)}</p>;
      })}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────
function SkeletonCard({ rows = 1 }: { rows?: number }) {
  return (
    <div style={cardStyle} className="p-5 space-y-3 animate-pulse">
      <div className="h-3 w-24 rounded" style={{ background: "#eee9df" }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-6 rounded" style={{ background: "#eee9df", width: `${60 + i * 10}%` }} />
      ))}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, diff, goodWhenPositive = false }: {
  label: string; value: string; sub?: string;
  color: "green" | "red" | "slate";
  diff?: number | null;
  goodWhenPositive?: boolean;
}) {
  const valueColor = { green: "#078a52", red: "#c0393f", slate: "#55534e" }[color];
  const diffStyle = diff === null || diff === undefined || diff === 0
    ? { color: "#9f9b93", background: "#eee9df" }
    : (diff > 0) === goodWhenPositive
      ? { color: "#078a52", background: "rgba(7,138,82,0.08)" }
      : { color: "#c0393f", background: "rgba(252,121,129,0.1)" };
  return (
    <div style={cardStyle} className="p-5">
      <p className="text-sm mb-2" style={{ color: "#9f9b93" }}>{label}</p>
      <p className="text-xl font-semibold tabular-nums" style={{ color: valueColor }}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs" style={{ color: "#9f9b93" }}>{sub}</p>}
        {diff !== null && diff !== undefined && (
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={diffStyle}>
            {diff > 0 ? "+" : ""}{diff}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Category item ────────────────────────────────────────────────
function CategoryItem({ item }: { item: CategoryBreakdown }) {
  const [expanded, setExpanded] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const hex = CATEGORY_HEX[item.category] ?? "#9f9b93";
  const bg = CATEGORY_BG[item.category] ?? "bg-[#9f9b93]";
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #dad4c8" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-3 pt-3 pb-2 transition-colors duration-150 cursor-pointer hover:bg-[#faf9f7]"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${bg}`} />
        <span className="text-sm flex-1 text-left" style={{ color: "#55534e" }}>{item.category}</span>
        <span className="text-xs tabular-nums hidden sm:inline" style={{ color: "#9f9b93" }}>{item.count}x</span>
        <span className="text-xs w-7 sm:w-8 text-right tabular-nums" style={{ color: "#9f9b93" }}>{item.percentage}%</span>
        <span className="text-sm font-semibold tabular-nums w-20 sm:w-28 text-right" style={{ color: "#000000" }}>
          {formatCurrency(item.amount)}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} style={{ color: "#9f9b93" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div className="px-3 pb-2.5">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
          <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, background: hex, opacity: 0.7, transition: "width 0.6s ease" }} />
        </div>
      </div>
      <div style={{
        maxHeight: expanded ? (item.transactions.length > 3 ? "112px" : `${detailRef.current?.scrollHeight ?? 9999}px`) : "0px",
        overflowY: expanded && item.transactions.length > 3 ? "auto" : "hidden",
        transition: "max-height 0.25s ease",
      }}>
        <div ref={detailRef} style={{ borderTop: "1px solid #dad4c8" }}>
          {item.transactions.map((tx, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: i > 0 ? "1px solid rgba(218,212,200,0.6)" : undefined }}>
              <div className="flex items-center gap-2.5 min-w-0 mr-3">
                <span className="text-xs tabular-nums whitespace-nowrap shrink-0" style={{ color: "#9f9b93" }}>{formatShortDate(tx.date)}</span>
                <span className="text-xs truncate" style={{ color: "#55534e" }}>{tx.description}</span>
              </div>
              <span className="text-xs font-medium tabular-nums shrink-0" style={{ color: "#c0393f" }}>-{formatCurrency(tx.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Heatmap ────────────────────────────────────────────
type TooltipState = { key: string; x: number; y: number; above: boolean };

function SpendingHeatmap({ data, startDate, endDate }: {
  data: HeatmapPoint[];
  startDate: Date;
  endDate: Date;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const dayMap = new Map<string, { amount: number; txs: TxDetail[] }>();
  for (const { date, amount, txs } of data) {
    dayMap.set(date.substring(0, 10), { amount, txs });
  }
  const maxVal = Math.max(...Array.from(dayMap.values()).map(c => c.amount), 1);

  // Build list of calendar months covered by the date range
  const months: Date[] = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cur <= lastMonth) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  const tooltipCell = tooltip ? dayMap.get(tooltip.key) : null;

  return (
    <>
      <div className="space-y-5">
        {months.map((monthStart) => {
          const y = monthStart.getFullYear();
          const m = monthStart.getMonth();
          const daysInMonth = new Date(y, m + 1, 0).getDate();
          const firstCol = calColIndex(new Date(y, m, 1).getDay());
          const monthLabel = monthStart.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

          // Pad start with empty slots, pad end to complete last row
          const cells: (number | null)[] = Array(firstCol).fill(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div key={`${y}-${m}`}>
              <p className="text-xs font-semibold mb-2 capitalize" style={{ color: "#55534e" }}>{monthLabel}</p>
              <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                {CAL_DAY_LABELS.map(d => (
                  <div key={d} className="text-center py-0.5 text-xs" style={{ color: "#9f9b93" }}>{d}</div>
                ))}
                {cells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} />;
                  const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayDate = new Date(y, m, day);
                  const inRange = dayDate >= startDate && dayDate <= endDate;
                  const cell = dayMap.get(dateKey);
                  const intensity = inRange && cell ? cell.amount / maxVal : 0;
                  const hasData = inRange && !!(cell && cell.txs.length > 0);

                  return (
                    <div
                      key={dateKey}
                      className={`relative rounded-md flex items-center justify-center select-none ${hasData ? "cursor-pointer" : "cursor-default"}`}
                      style={{
                        aspectRatio: "1",
                        background: !inRange ? "transparent" : intensity === 0 ? "#eee9df" : `rgba(7,138,82,${0.15 + intensity * 0.8})`,
                        opacity: inRange ? 1 : 0.25,
                      }}
                      onMouseEnter={(e) => {
                        if (!hasData) return;
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const x = Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2));
                        const above = rect.top > 280;
                        setTooltip({ key: dateKey, x, y: above ? rect.top : rect.bottom, above });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span style={{
                        fontSize: "10px",
                        fontWeight: hasData ? 600 : 400,
                        color: intensity > 0.55 ? "#ffffff" : "#55534e",
                        lineHeight: 1,
                      }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs" style={{ color: "#9f9b93" }}>Rendah</span>
          {[0.15, 0.32, 0.55, 0.75, 0.95].map(v => (
            <div key={v} className="w-5 h-3 rounded-sm" style={{ background: `rgba(7,138,82,${v})` }} />
          ))}
          <span className="text-xs" style={{ color: "#9f9b93" }}>Tinggi</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltipCell && tooltipCell.txs.length > 0 && (() => {
        const [ty, tm, td] = tooltip.key.split("-").map(Number);
        const dateLabel = new Date(ty, tm - 1, td).toLocaleDateString("id-ID", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        });
        return (
          <div
            className="pointer-events-none"
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.above ? tooltip.y - 8 : tooltip.y + 8,
              transform: tooltip.above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
              zIndex: 9999,
              minWidth: "220px",
              maxWidth: "300px",
              background: "#ffffff",
              border: "1px solid #dad4c8",
              borderRadius: "12px",
              boxShadow: "rgba(0,0,0,0.12) 0px 8px 24px",
              padding: "10px 12px",
            }}
          >
            <p className="text-xs font-semibold capitalize" style={{ color: "#000000" }}>{dateLabel}</p>
            <p className="text-xs mb-2" style={{ color: "#9f9b93" }}>{formatCurrency(tooltipCell.amount)} pengeluaran</p>
            <div className="space-y-1.5">
              {tooltipCell.txs.slice(0, 6).map((tx, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <p className="text-xs truncate" style={{ color: "#55534e" }}>{tx.description}</p>
                  <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "#c0393f" }}>
                    -{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
              {tooltipCell.txs.length > 6 && (
                <p className="text-xs" style={{ color: "#9f9b93" }}>+{tooltipCell.txs.length - 6} transaksi lainnya</p>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ─── Top Merchants ────────────────────────────────────────────────
function MerchantItem({ m, rank, maxAmount }: { m: MerchantPoint; rank: number; maxAmount: number }) {
  const [expanded, setExpanded] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const barColor = rank === 0 ? "#078a52" : rank === 1 ? "#3bd3fd" : rank === 2 ? "#fbbd41" : "#dad4c8";

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #dad4c8" }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-3 pt-3 pb-2.5 transition-colors duration-150 cursor-pointer hover:bg-[#faf9f7]"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs w-4 tabular-nums text-right shrink-0" style={{ color: "#9f9b93" }}>{rank + 1}</span>
          <span className="text-sm font-medium flex-1 text-left truncate" style={{ color: "#000000" }}>{m.merchant}</span>
          <span className="text-xs shrink-0" style={{ color: "#9f9b93" }}>{m.count}x</span>
          <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: "#c0393f" }}>
            {formatCurrency(m.amount)}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} style={{ color: "#9f9b93" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div className="ml-6 h-1.5 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(m.amount / maxAmount) * 100}%`, background: barColor }}
          />
        </div>
      </button>

      <div style={{ maxHeight: expanded ? `${detailRef.current?.scrollHeight ?? 9999}px` : "0px", overflow: "hidden", transition: "max-height 0.25s ease" }}>
        <div ref={detailRef} style={{ borderTop: "1px solid #dad4c8" }}>
          {m.transactions.map((tx, j) => (
            <div
              key={j}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{ borderTop: j > 0 ? "1px solid rgba(218,212,200,0.6)" : undefined }}
            >
              <span className="text-xs tabular-nums whitespace-nowrap shrink-0 w-24" style={{ color: "#9f9b93" }}>
                {fmtTxDate(tx.date)}
              </span>
              <span className="text-xs flex-1 truncate" style={{ color: "#55534e" }}>{tx.description}</span>
              <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "#c0393f" }}>
                -{formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopMerchants({ data }: { data: MerchantPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: "#9f9b93" }}>Tidak ada data merchant</p>;
  }
  const maxAmount = data[0].amount;

  return (
    <div className="space-y-1">
      {data.map((m, i) => (
        <MerchantItem key={m.merchant} m={m} rank={i} maxAmount={maxAmount} />
      ))}
    </div>
  );
}

// ─── Comparison ───────────────────────────────────────────────────
function ComparisonView({ curr, prev }: {
  curr: { totalIncome: number; totalExpense: number; net: number; categoryBreakdown: CategoryBreakdown[] };
  prev: { totalIncome: number; totalExpense: number; net: number; categoryBreakdown: { category: string; amount: number; percentage: number }[] };
}) {
  const allCats = new Set([
    ...curr.categoryBreakdown.map(c => c.category),
    ...prev.categoryBreakdown.map(c => c.category),
  ]);

  const rows = Array.from(allCats).map(cat => {
    const c = curr.categoryBreakdown.find(x => x.category === cat);
    const p = prev.categoryBreakdown.find(x => x.category === cat);
    const currAmt = c?.amount ?? 0;
    const prevAmt = p?.amount ?? 0;
    const d = diffPct(currAmt, prevAmt);
    return { cat, currAmt, prevAmt, diff: d };
  }).sort((a, b) => b.currAmt - a.currAmt);

  const incomeDiff = diffPct(curr.totalIncome, prev.totalIncome);
  const expenseDiff = diffPct(curr.totalExpense, prev.totalExpense);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Pemasukan", curr: curr.totalIncome, prev: prev.totalIncome, diff: incomeDiff, color: "#078a52" },
          { label: "Pengeluaran", curr: curr.totalExpense, prev: prev.totalExpense, diff: expenseDiff, color: "#fc7981" },
          { label: curr.net >= 0 ? "Surplus" : "Defisit", curr: Math.abs(curr.net), prev: Math.abs(prev.net), diff: diffPct(curr.net, prev.net), color: curr.net >= 0 ? "#078a52" : "#c0393f" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-3.5" style={{ background: "#faf9f7", border: "1px solid #dad4c8" }}>
            <p className="text-xs mb-1.5" style={{ color: "#9f9b93" }}>{item.label}</p>
            <p className="text-base font-semibold tabular-nums" style={{ color: item.color }}>
              {formatCurrency(item.curr)}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <p className="text-xs tabular-nums" style={{ color: "#9f9b93" }}>
                vs {formatCurrency(item.prev)}
              </p>
              {item.diff !== null && (
                <span
                  className="text-xs font-medium px-1 py-0.5 rounded"
                  style={item.diff > 0
                    ? { color: item.label === "Pengeluaran" ? "#c0393f" : "#078a52", background: item.label === "Pengeluaran" ? "rgba(252,121,129,0.1)" : "rgba(7,138,82,0.08)" }
                    : item.diff < 0
                      ? { color: item.label === "Pengeluaran" ? "#078a52" : "#c0393f", background: item.label === "Pengeluaran" ? "rgba(7,138,82,0.08)" : "rgba(252,121,129,0.1)" }
                      : { color: "#9f9b93", background: "#eee9df" }
                  }
                >
                  {item.diff > 0 ? "+" : ""}{item.diff}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #dad4c8" }}>
          <div className="overflow-x-auto">
          <div className="min-w-[420px]">
          <div className="grid px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ gridTemplateColumns: "1fr 110px 110px 60px", color: "#9f9b93", background: "#faf9f7", borderBottom: "1px solid #dad4c8" }}>
            <span>Kategori</span>
            <span className="text-right">Periode Ini</span>
            <span className="text-right">Sebelumnya</span>
            <span className="text-right">%</span>
          </div>
          {rows.slice(0, 8).map((row, i) => (
            <div
              key={row.cat}
              className="grid px-3 py-2.5 items-center"
              style={{ gridTemplateColumns: "1fr 110px 110px 60px", borderTop: i > 0 ? "1px solid #eee9df" : undefined }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CATEGORY_HEX[row.cat] ?? "#9f9b93" }} />
                <span className="text-xs truncate" style={{ color: "#55534e" }}>{row.cat}</span>
              </div>
              <span className="text-xs font-medium tabular-nums text-right" style={{ color: "#000000" }}>
                {row.currAmt > 0 ? formatCurrency(row.currAmt) : "—"}
              </span>
              <span className="text-xs tabular-nums text-right" style={{ color: "#9f9b93" }}>
                {row.prevAmt > 0 ? formatCurrency(row.prevAmt) : "—"}
              </span>
              <div className="flex justify-end">
                {row.diff !== null ? (
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={row.diff > 0
                      ? { color: "#c0393f", background: "rgba(252,121,129,0.1)" }
                      : row.diff < 0
                        ? { color: "#078a52", background: "rgba(7,138,82,0.08)" }
                        : { color: "#9f9b93", background: "#eee9df" }
                    }
                  >
                    {row.diff > 0 ? "+" : ""}{row.diff}%
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "#dad4c8" }}>—</span>
                )}
              </div>
            </div>
          ))}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Findings (deterministic signals) ─────────────────────────────
const SEVERITY_STYLE: Record<Finding["severity"], { color: string; bg: string; border: string }> = {
  warning: { color: "#c0393f", bg: "rgba(252,121,129,0.07)", border: "rgba(252,121,129,0.25)" },
  good: { color: "#078a52", bg: "rgba(7,138,82,0.07)", border: "rgba(7,138,82,0.22)" },
  info: { color: "#43089f", bg: "rgba(67,8,159,0.05)", border: "rgba(67,8,159,0.18)" },
};

function FindingIcon({ severity }: { severity: Finding["severity"] }) {
  const { color } = SEVERITY_STYLE[severity];
  const p = { xmlns: "http://www.w3.org/2000/svg", width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (severity === "warning") return (
    <svg {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  );
  if (severity === "good") return (
    <svg {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  );
  return (
    <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const s = SEVERITY_STYLE[f.severity];
  return (
    <div className="flex gap-3 p-3 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#ffffff", border: `1px solid ${s.border}` }}>
        <FindingIcon severity={f.severity} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug" style={{ color: "#000000" }}>{f.title}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#55534e" }}>{f.detail}</p>
      </div>
      {f.potentialSaving ? (
        <div className="shrink-0 self-start text-right">
          <p className="text-[10px] uppercase tracking-wide" style={{ color: "#9f9b93" }}>Potensi</p>
          <p className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>{formatCurrency(f.potentialSaving)}</p>
        </div>
      ) : null}
    </div>
  );
}

function FindingsCard({ findings, loading }: { findings: Finding[]; loading: boolean }) {
  return (
    <div style={cardStyle} className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(7,138,82,0.08)" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
          </svg>
        </div>
        <h2 className="font-medium" style={{ color: "#000000" }}>Temuan Utama</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: "#9f9b93" }}>Sinyal terhitung otomatis — perubahan, risiko, dan peluang yang tidak terlihat dari grafik</p>
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "#eee9df" }} />
          ))}
        </div>
      ) : findings.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {findings.map((f, i) => <FindingRow key={i} f={f} />)}
        </div>
      ) : (
        <p className="text-sm py-6 text-center" style={{ color: "#9f9b93" }}>
          Belum ada sinyal menonjol untuk periode ini — biasanya karena transaksi masih sedikit.
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function InsightsPage() {
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(now),
    end: endOfMonth(now),
  });
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  // AI narrative is fetched separately so findings + numbers render instantly
  // while the (slower) LLM call streams in afterwards.
  const fetchNarrative = useCallback(async (d: InsightsData, range: DateRange) => {
    if (d.transactionCount === 0) { setNarrative(null); return; }
    setNarrativeLoading(true);
    try {
      const res = await fetch("/api/insights/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: toDateParam(range.start),
          end: toDateParam(range.end),
          totalIncome: d.totalIncome, totalExpense: d.totalExpense, net: d.net,
          savingsRate: d.savingsRate, transactionCount: d.transactionCount,
          categoryBreakdown: d.categoryBreakdown.map(c => ({
            category: c.category, amount: c.amount, percentage: c.percentage, count: c.count,
          })),
          prevPeriod: d.prevPeriod,
          topMerchants: d.topMerchants.map(m => ({ merchant: m.merchant, amount: m.amount, count: m.count })),
          findings: d.findings,
        }),
      });
      const j = res.ok ? await res.json() : { insight: null };
      setNarrative(j.insight ?? null);
    } catch {
      setNarrative(null);
    } finally {
      setNarrativeLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setData(null);
    setNarrative(null);
    try {
      const res = await fetch(`/api/insights?start=${toDateParam(dateRange.start)}&end=${toDateParam(dateRange.end)}`);
      if (res.ok) {
        const json: InsightsData = await res.json();
        setData(json);
        fetchNarrative(json, dateRange);
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange, fetchNarrative]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const empty = !loading && data && data.transactionCount === 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#000000" }}>AI Insights</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>Analisis keuangan berbasis kecerdasan buatan</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary / Comparison cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : data?.prevPeriod ? (
        <div style={cardStyle} className="p-5">
          <h2 className="font-medium mb-1" style={{ color: "#000000" }}>Perbandingan Periode</h2>
          <p className="text-xs mb-4" style={{ color: "#9f9b93" }}>Periode ini vs periode sebelumnya (durasi sama)</p>
          <ComparisonView
            curr={{ totalIncome: data.totalIncome, totalExpense: data.totalExpense, net: data.net, categoryBreakdown: data.categoryBreakdown }}
            prev={data.prevPeriod}
          />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div style={cardStyle} className="p-5">
            <p className="text-sm mb-2" style={{ color: "#9f9b93" }}>Total Pemasukan</p>
            <p className="text-xl font-semibold tabular-nums" style={{ color: "#078a52" }}>{formatCurrency(data.totalIncome)}</p>
            <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>{data.transactionCount} transaksi</p>
          </div>
          <div style={cardStyle} className="p-5">
            <p className="text-sm mb-2" style={{ color: "#9f9b93" }}>Total Pengeluaran</p>
            <p className="text-xl font-semibold tabular-nums" style={{ color: "#c0393f" }}>{formatCurrency(data.totalExpense)}</p>
          </div>
          <div style={cardStyle} className="p-5">
            <p className="text-sm mb-2" style={{ color: "#9f9b93" }}>{data.net >= 0 ? "Surplus" : "Defisit"}</p>
            <p className="text-xl font-semibold tabular-nums" style={{ color: data.net >= 0 ? "#078a52" : "#c0393f" }}>{formatCurrency(Math.abs(data.net))}</p>
            <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>Savings Rate {data.savingsRate}%</p>
          </div>
        </div>
      ) : null}

      {/* Empty state */}
      {empty && (
        <div style={cardStyle} className="p-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "#eee9df" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <p className="font-medium text-sm" style={{ color: "#55534e" }}>Tidak ada transaksi</p>
          <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>
            Belum ada data untuk {formatDateRange(dateRange.start, dateRange.end)}
          </p>
        </div>
      )}

      {/* Main content */}
      {!empty && (
        <>
          {/* Findings — instant, deterministic (Fase A) */}
          <FindingsCard findings={data?.findings ?? []} loading={loading} />

          {/* Row 1: Category + AI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <div style={cardStyle} className="p-5">
              <h2 className="font-medium mb-4" style={{ color: "#000000" }}>Pengeluaran per Kategori</h2>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5 animate-pulse">
                    <div className="h-3 w-32 rounded" style={{ background: "#eee9df" }} />
                    <div className="h-2 rounded-full" style={{ background: "#eee9df" }} />
                  </div>
                ))}</div>
              ) : data && data.categoryBreakdown.length > 0 ? (
                <div className="space-y-2">
                  {data.categoryBreakdown.map(item => <CategoryItem key={item.category} item={item} />)}
                </div>
              ) : (
                <p className="text-sm py-8 text-center" style={{ color: "#9f9b93" }}>Tidak ada pengeluaran untuk rentang ini</p>
              )}
            </div>

            <div style={cardStyle} className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(67,8,159,0.08)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#43089f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  </svg>
                </div>
                <h2 className="font-medium" style={{ color: "#000000" }}>Analisis AI</h2>
              </div>
              {loading || narrativeLoading ? (
                <div className="space-y-2.5 animate-pulse">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`h-3 rounded ${i % 3 === 2 ? "w-2/3" : "w-full"}`} style={{ background: "#eee9df" }} />
                  ))}
                </div>
              ) : narrative ? (
                <div className="overflow-y-auto pr-1" style={{ maxHeight: "500px" }}>
                  <MarkdownBlock text={narrative} />
                </div>
              ) : (
                <p className="text-sm py-8 text-center" style={{ color: "#9f9b93" }}>Tidak ada insight AI tersedia</p>
              )}
            </div>
          </div>

          {/* Row 2: Top merchants + Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <div style={cardStyle} className="p-5">
              <h2 className="font-medium mb-1" style={{ color: "#000000" }}>Top Merchant</h2>
              <p className="text-xs mb-4" style={{ color: "#9f9b93" }}>Klik untuk melihat detail transaksi per merchant</p>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-1.5">
                      <div className="h-3 rounded" style={{ background: "#eee9df", width: `${75 - i * 8}%` }} />
                      <div className="h-1.5 rounded-full" style={{ background: "#eee9df", width: `${80 - i * 8}%` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <TopMerchants data={data?.topMerchants ?? []} />
              )}
            </div>

            <div style={cardStyle} className="p-5">
              <h2 className="font-medium mb-1" style={{ color: "#000000" }}>Pola Pengeluaran</h2>
              <p className="text-xs mb-4" style={{ color: "#9f9b93" }}>Arahkan kursor ke kotak untuk melihat transaksi</p>
              {loading ? (
                <div className="h-36 rounded-xl animate-pulse" style={{ background: "#eee9df" }} />
              ) : (data?.heatmap?.length ?? 0) > 0 ? (
                <div className="overflow-y-auto" style={{ maxHeight: "615px" }}>
                  <SpendingHeatmap data={data!.heatmap} startDate={dateRange.start} endDate={dateRange.end} />
                </div>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: "#9f9b93" }}>Belum ada data pola pengeluaran</p>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
