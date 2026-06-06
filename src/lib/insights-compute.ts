import { formatCurrency } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// Deterministic insight engine (Fase A of PLAN.md).
//
// Produces structured "findings" from already-aggregated period data. The goal
// is insight that a user CANNOT get just by reading the category chart:
// comparisons vs the previous period, concentration/anomaly risk, recurring
// subscriptions, spend projection, weekend timing, and budget adherence.
//
// Pure & serializable: no DB, no Prisma types. The route computes the inputs
// and feeds them here; results are rendered as cards AND handed to the AI as
// pre-computed facts (so the LLM interprets, never does the arithmetic).
// ─────────────────────────────────────────────────────────────────────────

export type FindingType =
  | "comparison"
  | "savings"
  | "concentration"
  | "anomaly"
  | "recurring"
  | "projection"
  | "timing"
  | "budget";

export type FindingSeverity = "info" | "good" | "warning";

export interface Finding {
  type: FindingType;
  severity: FindingSeverity;
  title: string; // already contains the rupiah / percent figure
  detail: string;
  potentialSaving?: number; // estimated annual/period saving, in rupiah
}

export interface ComputeExpenseTx {
  date: Date;
  description: string;
  merchant: string | null;
  amount: number;
  category: string;
}

export interface ComputeInput {
  start: Date;
  end: Date;
  now: Date;
  totalIncome: number;
  totalExpense: number;
  net: number;
  savingsRate: number;
  categoryBreakdown: Array<{ category: string; amount: number; count: number; percentage: number }>;
  expenseTxs: ComputeExpenseTx[];
  prevPeriod: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  } | null;
  /** Expense rows over a multi-month lookback window, for subscription detection. */
  recurringHistory?: Array<{ key: string; monthKey: string; amount: number }>;
  /** Current calendar-month budgets, only when the period is exactly one month. */
  budgets?: Array<{ category: string; limitAmount: number; spent: number }>;
}

const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 3_600_000;

const _shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

function rupiah(n: number): string {
  return formatCurrency(Math.round(n));
}
function pct(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return Math.round((part / whole) * 100);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS) + 1;
}
function fmtDate(d: Date): string {
  return _shortDate.format(d);
}

export function computeFindings(input: ComputeInput): Finding[] {
  const findings: Finding[] = [];
  const categories = input.categoryBreakdown ?? [];
  const expenseTxs = input.expenseTxs ?? [];
  const topCat = categories[0] ?? null;

  // ── Comparison vs previous period ───────────────────────────────────────
  if (input.prevPeriod && input.prevPeriod.totalExpense > 0) {
    const prev = input.prevPeriod;

    const delta = input.totalExpense - prev.totalExpense;
    const p = pct(delta, prev.totalExpense);
    if (p !== null && Math.abs(p) >= 5) {
      const up = delta > 0;
      findings.push({
        type: "comparison",
        severity: up ? "warning" : "good",
        title: `Pengeluaran ${up ? "naik" : "turun"} ${Math.abs(p)}% vs periode sebelumnya`,
        detail: `${rupiah(input.totalExpense)} periode ini dibanding ${rupiah(prev.totalExpense)} sebelumnya (selisih ${rupiah(Math.abs(delta))}).`,
      });
    }

    // Single biggest category mover (the line that actually drove the change).
    let mover: { cat: string; delta: number; currAmt: number; prevAmt: number } | null = null;
    const allCats = new Set([
      ...categories.map((c) => c.category),
      ...prev.categoryBreakdown.map((c) => c.category),
    ]);
    for (const cat of allCats) {
      const currAmt = categories.find((c) => c.category === cat)?.amount ?? 0;
      const prevAmt = prev.categoryBreakdown.find((c) => c.category === cat)?.amount ?? 0;
      const d = currAmt - prevAmt;
      if (!mover || Math.abs(d) > Math.abs(mover.delta)) {
        mover = { cat, delta: d, currAmt, prevAmt };
      }
    }
    if (mover && Math.abs(mover.delta) >= 50_000) {
      const up = mover.delta > 0;
      if (mover.prevAmt === 0 && up) {
        findings.push({
          type: "comparison",
          severity: "info",
          title: `Kategori baru: ${mover.cat} ${rupiah(mover.currAmt)}`,
          detail: `Tidak ada pengeluaran ${mover.cat} di periode sebelumnya.`,
        });
      } else {
        const mp = pct(mover.delta, mover.prevAmt);
        findings.push({
          type: "comparison",
          severity: up ? "warning" : "good",
          title: `${mover.cat} ${up ? "naik" : "turun"} ${rupiah(Math.abs(mover.delta))}${mp !== null ? ` (${up ? "+" : "-"}${Math.abs(mp)}%)` : ""}`,
          detail: `${rupiah(mover.prevAmt)} menjadi ${rupiah(mover.currAmt)} dibanding periode sebelumnya.`,
        });
      }
    }

    // Savings-rate trajectory.
    const prevSr = prev.totalIncome > 0 ? Math.round((prev.net / prev.totalIncome) * 100) : null;
    if (prevSr !== null && input.totalIncome > 0) {
      const diff = input.savingsRate - prevSr;
      if (Math.abs(diff) >= 3) {
        const up = diff > 0;
        findings.push({
          type: "savings",
          severity: up ? "good" : "warning",
          title: `Savings rate ${input.savingsRate}% (${up ? "naik" : "turun"} dari ${prevSr}%)`,
          detail: up
            ? "Porsi pemasukan yang kamu sisihkan lebih besar dibanding periode lalu."
            : "Porsi pemasukan yang tersisa mengecil dibanding periode lalu.",
        });
      }
    }
  }

  // ── Concentration risk ──────────────────────────────────────────────────
  if (topCat && input.totalExpense > 0) {
    const share = Math.round((topCat.amount / input.totalExpense) * 100);
    if (share >= 50) {
      findings.push({
        type: "concentration",
        severity: share >= 70 ? "warning" : "info",
        title: `${share}% pengeluaran terpusat di ${topCat.category}`,
        detail:
          `${rupiah(topCat.amount)} dari total ${rupiah(input.totalExpense)}. ` +
          (share >= 70
            ? "Konsentrasi tinggi pada satu kategori menambah risiko jika biaya ini naik."
            : "Sebagian besar anggaran bergantung pada satu kategori."),
      });
    }
  }

  // ── Single large transaction (anomaly) ──────────────────────────────────
  if (expenseTxs.length >= 2 && input.totalExpense > 0) {
    const largest = expenseTxs.reduce((a, b) => (b.amount > a.amount ? b : a));
    const share = Math.round((largest.amount / input.totalExpense) * 100);
    // Avoid duplicating the concentration finding when it's the same single line.
    const dupOfConcentration =
      !!topCat &&
      topCat.count === 1 &&
      topCat.category === largest.category &&
      topCat.amount === largest.amount &&
      topCat.amount / input.totalExpense >= 0.5;
    if (share >= 40 && !dupOfConcentration) {
      const label = (largest.merchant || largest.description || "Transaksi").trim();
      findings.push({
        type: "anomaly",
        severity: share >= 60 ? "warning" : "info",
        title: `Transaksi besar: ${rupiah(largest.amount)} (${share}% dari total)`,
        detail: `${label} pada ${fmtDate(largest.date)} mendominasi pengeluaran periode ini.`,
      });
    }
  }

  // ── Recurring subscriptions (needs multi-month history) ─────────────────
  if (input.recurringHistory && input.recurringHistory.length > 0) {
    const byKey = new Map<string, { months: Set<string>; amounts: number[] }>();
    for (const r of input.recurringHistory) {
      const key = r.key.trim();
      if (!key) continue;
      const entry = byKey.get(key) ?? { months: new Set<string>(), amounts: [] };
      entry.months.add(r.monthKey);
      entry.amounts.push(r.amount);
      byKey.set(key, entry);
    }
    const recurring: Array<{ key: string; monthly: number }> = [];
    for (const [key, entry] of byKey) {
      if (entry.months.size < 3) continue; // present in ≥3 distinct months
      const sorted = [...entry.amounts].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median <= 0) continue;
      // Amounts must be stable to count as a subscription (±35% of median).
      const stable = entry.amounts.every((a) => Math.abs(a - median) <= median * 0.35);
      if (!stable) continue;
      recurring.push({ key, monthly: median });
    }
    recurring.sort((a, b) => b.monthly - a.monthly);
    for (const r of recurring.slice(0, 2)) {
      const annual = r.monthly * 12;
      findings.push({
        type: "recurring",
        severity: "info",
        title: `Langganan terdeteksi: ${r.key} sekitar ${rupiah(r.monthly)}/bln`,
        detail: `Muncul rutin tiap bulan — setara ${rupiah(annual)}/tahun. Tinjau apakah masih terpakai.`,
        potentialSaving: annual,
      });
    }
  }

  // ── Projection (only for an ongoing period with a stable run-rate) ──────
  const ongoing = input.now >= input.start && input.now <= input.end;
  if (ongoing && expenseTxs.length >= 5 && input.totalExpense > 0) {
    const totalDays = daysBetween(input.start, input.end);
    const daysElapsed = Math.max(1, Math.min(daysBetween(input.start, input.now), totalDays));
    const largestShare = Math.max(...expenseTxs.map((t) => t.amount)) / input.totalExpense;
    // Skip lumpy data — a single dominant transaction makes daily extrapolation lie.
    if (daysElapsed >= 3 && daysElapsed < totalDays && largestShare < 0.5) {
      const perDay = input.totalExpense / daysElapsed;
      const projected = Math.round(perDay * totalDays);
      const overIncome = input.totalIncome > 0 && projected > input.totalIncome;
      findings.push({
        type: "projection",
        severity: overIncome ? "warning" : "info",
        title: `Proyeksi pengeluaran sekitar ${rupiah(projected)} di akhir periode`,
        detail:
          `Berdasarkan laju ${rupiah(perDay)}/hari dari ${daysElapsed} hari pertama.` +
          (overIncome ? ` Melebihi pemasukan ${rupiah(input.totalIncome)} — waspadai defisit.` : ""),
      });
    }
  }

  // ── Weekend timing pattern ──────────────────────────────────────────────
  if (expenseTxs.length >= 6 && input.totalExpense > 0) {
    let weekend = 0;
    for (const t of expenseTxs) {
      const wibDow = new Date(t.date.getTime() + WIB_OFFSET_MS).getUTCDay();
      if (wibDow === 0 || wibDow === 6) weekend += t.amount;
    }
    const share = Math.round((weekend / input.totalExpense) * 100);
    if (share >= 45) {
      findings.push({
        type: "timing",
        severity: "info",
        title: `${share}% pengeluaran terjadi di akhir pekan`,
        detail: "Pengeluaran cenderung menumpuk Sabtu–Minggu — titik yang mudah ditekan jika ingin berhemat.",
      });
    }
  }

  // ── Budget adherence (only when the period is one calendar month) ───────
  if (input.budgets && input.budgets.length > 0) {
    const over = input.budgets
      .filter((b) => b.limitAmount > 0)
      .map((b) => ({ ...b, ratio: b.spent / b.limitAmount }))
      .filter((b) => b.ratio >= 0.9)
      .sort((a, b) => b.ratio - a.ratio);
    for (const b of over.slice(0, 2)) {
      const p = Math.round(b.ratio * 100);
      const exceeded = b.ratio >= 1;
      findings.push({
        type: "budget",
        severity: exceeded ? "warning" : "info",
        title: `Budget ${b.category} ${p}% terpakai`,
        detail:
          `${rupiah(b.spent)} dari ${rupiah(b.limitAmount)}` +
          (exceeded ? " — sudah melewati batas." : " — mendekati batas."),
        potentialSaving: exceeded ? Math.round(b.spent - b.limitAmount) : undefined,
      });
    }
  }

  // ── Rank (warnings first) and cap ───────────────────────────────────────
  const sevRank: Record<FindingSeverity, number> = { warning: 2, good: 1, info: 0 };
  findings.sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
  return findings.slice(0, 6);
}
