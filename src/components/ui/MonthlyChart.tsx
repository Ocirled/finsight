"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

export interface MonthDataPoint {
  label: string;
  income: number;
  expense: number;
}

function formatShort(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { dataKey: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 shadow-clay"
      style={{
        background: "#ffffff",
        border: "1px solid #dad4c8",
        boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset",
      }}
    >
      <p className="text-xs font-semibold mb-1.5" style={{ color: "#55534e" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.fill }}>
          {p.dataKey === "income" ? "Pemasukan" : "Pengeluaran"}: {formatShort(p.value)}
        </p>
      ))}
    </div>
  );
}

export function MonthlyChart({ data }: { data: MonthDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="32%" barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee9df" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#9f9b93", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(218,212,200,0.3)" }}
        />
        <Bar dataKey="income" fill="#078a52" radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="expense" fill="#fc7981" radius={[4, 4, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}
