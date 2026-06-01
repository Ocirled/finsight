import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import { MonthlyChart } from "@/components/ui/MonthlyChart";
import type { MonthDataPoint } from "@/components/ui/MonthlyChart";

const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const DAYS_ID = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

function fmtTxDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  const day = DAYS_ID[d.getDay()];
  const dateNum = d.getDate();
  const month = MONTHS_ID[d.getMonth()];
  return isThisYear ? `${day}, ${dateNum} ${month}` : `${day}, ${dateNum} ${month} ${d.getFullYear()}`;
}

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #dad4c8",
  borderRadius: "16px",
  boxShadow: "rgba(0,0,0,0.1) 0px 1px 1px, rgba(0,0,0,0.04) 0px -1px 1px inset, rgba(0,0,0,0.05) 0px -0.5px 1px",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const now = new Date();
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [cumulativeStats, monthlyTransactions, activeGoals, recentTransactions, budgets, monthExpenseByCategory] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: sixMonthsAgo } },
      select: { date: true, type: true, amount: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, description: true, category: true, type: true, amount: true, date: true },
    }),
    prisma.budget.findMany({
      where: { userId, month: currentMonth, year: currentYear },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: { userId, type: "EXPENSE", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = Number(cumulativeStats.find(s => s.type === "INCOME")?._sum.amount ?? 0);
  const totalExpense = Number(cumulativeStats.find(s => s.type === "EXPENSE")?._sum.amount ?? 0);
  const netCumulative = totalIncome - totalExpense;

  const monthlyData: MonthDataPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const txs = monthlyTransactions.filter(t => {
      const td = new Date(t.date);
      return td.getFullYear() === year && td.getMonth() === month;
    });
    const income = txs.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense = txs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    return { label: MONTHS_ID[month], income, expense };
  });

  const activeMonths = monthlyData.filter(m => m.income > 0 || m.expense > 0).length || 1;
  const avgIncome = monthlyData.reduce((s, m) => s + m.income, 0) / activeMonths;
  const avgExpense = monthlyData.reduce((s, m) => s + m.expense, 0) / activeMonths;

  const thisMonth = monthlyData[5];
  const expenseDiff = avgExpense > 0 ? ((thisMonth.expense - avgExpense) / avgExpense) * 100 : 0;
  const hasThisMonthData = thisMonth.income > 0 || thisMonth.expense > 0;

  const goals = activeGoals.map(g => ({
    id: g.id,
    title: g.title,
    emoji: g.emoji ?? "🎯",
    targetAmount: Number(g.targetAmount),
    savedAmount: Number(g.savedAmount),
  }));

  const totalGoalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

  const spendingMap: Record<string, number> = Object.fromEntries(
    monthExpenseByCategory.map((g) => [g.category, Number(g._sum.amount ?? 0)])
  );
  const budgetData = budgets
    .map((b) => {
      const limit = Number(b.limitAmount);
      const spent = spendingMap[b.category] ?? 0;
      return { category: b.category, limit, spent, pct: limit > 0 ? Math.round((spent / limit) * 100) : 0 };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: "#9f9b93" }}>
          Selamat datang kembali, {session!.user.name}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Net Kumulatif */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: "#9f9b93" }}>Net Kumulatif</p>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: netCumulative >= 0 ? "rgba(7,138,82,0.1)" : "rgba(252,121,129,0.1)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={netCumulative >= 0 ? "#078a52" : "#fc7981"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl font-semibold" style={{ color: netCumulative >= 0 ? "#000000" : "#fc7981" }}>
            {netCumulative < 0 ? "-" : ""}{formatCurrency(Math.abs(netCumulative))}
          </p>
          <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>
            {netCumulative >= 0 ? "Surplus" : "Defisit"} dari semua transaksi tercatat
          </p>
        </div>

        {/* Rata-rata Pemasukan */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: "#9f9b93" }}>Rata-rata Pemasukan</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(7,138,82,0.1)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#078a52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#078a52" }}>{formatCurrency(avgIncome)}</p>
          <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>Per bulan · {activeMonths} bulan terakhir</p>
        </div>

        {/* Rata-rata Pengeluaran */}
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: "#9f9b93" }}>Rata-rata Pengeluaran</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(252,121,129,0.1)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fc7981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                <polyline points="17 18 23 18 23 12"/>
              </svg>
            </div>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#fc7981" }}>{formatCurrency(avgExpense)}</p>
          <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>Per bulan · {activeMonths} bulan terakhir</p>
        </div>
      </div>

      {/* Trend Chart + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 p-5" style={cardStyle}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold" style={{ fontSize: "15px" }}>Tren 6 Bulan Terakhir</h2>
              <p className="text-xs mt-0.5" style={{ color: "#9f9b93" }}>Pemasukan vs pengeluaran per bulan</p>
            </div>
            <div className="flex items-center gap-3 text-xs shrink-0" style={{ color: "#9f9b93" }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#078a52" }} />
                Masuk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#fc7981" }} />
                Keluar
              </span>
            </div>
          </div>

          {hasThisMonthData && avgExpense > 0 && (
            <div
              className="mb-4 px-3 py-2 rounded-xl text-xs flex items-center gap-2"
              style={
                expenseDiff > 20
                  ? { background: "rgba(252,121,129,0.08)", color: "#c0393f", border: "1px solid rgba(252,121,129,0.2)" }
                  : expenseDiff < -20
                    ? { background: "rgba(7,138,82,0.08)", color: "#078a52", border: "1px solid rgba(7,138,82,0.2)" }
                    : { background: "#eee9df", color: "#55534e", border: "1px solid #dad4c8" }
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {expenseDiff > 20
                ? `Pengeluaran bulan ini ${Math.abs(expenseDiff).toFixed(0)}% di atas rata-rata bulananmu`
                : expenseDiff < -20
                  ? `Pengeluaran bulan ini ${Math.abs(expenseDiff).toFixed(0)}% di bawah rata-rata — bagus!`
                  : "Pengeluaran bulan ini sesuai dengan rata-rata bulananmu"
              }
            </div>
          )}

          <MonthlyChart data={monthlyData} />
        </div>

        {/* Active Goals */}
        <div className="p-5 flex flex-col" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ fontSize: "15px" }}>Goals Aktif</h2>
            <Link
              href="/goals"
              className="text-xs font-medium transition-colors cursor-pointer"
              style={{ color: "#078a52" }}
            >
              Lihat semua
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "#eee9df" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "#55534e" }}>Belum ada goal aktif</p>
              <Link href="/goals" className="mt-2 text-xs font-medium transition-colors cursor-pointer" style={{ color: "#078a52" }}>
                Buat goal pertama →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4 flex-1">
                {goals.map(g => {
                  const pct = g.targetAmount > 0
                    ? Math.min((g.savedAmount / g.targetAmount) * 100, 100)
                    : 0;
                  const remaining = Math.max(g.targetAmount - g.savedAmount, 0);
                  return (
                    <div key={g.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm leading-none shrink-0">{g.emoji}</span>
                          <span className="text-sm font-medium truncate">{g.title}</span>
                        </div>
                        <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: "#078a52" }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: "#078a52" }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>
                        Sisa {formatCurrency(remaining)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #dad4c8" }}>
                <p className="text-xs" style={{ color: "#9f9b93" }}>
                  {goals.length} goal aktif · Tersimpan{" "}
                  <span className="font-semibold" style={{ color: "#078a52" }}>{formatCurrency(totalGoalSaved)}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Budget widget */}
      {budgetData.length > 0 && (
        <div className="p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ fontSize: "15px" }}>Anggaran Bulan Ini</h2>
            <Link href="/budget" className="text-xs font-medium transition-colors cursor-pointer" style={{ color: "#078a52" }}>
              Lihat semua
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {budgetData.map((b) => (
              <div key={b.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium truncate" style={{ color: "#55534e" }}>{b.category}</span>
                  <span
                    className="text-xs font-semibold tabular-nums ml-2 shrink-0"
                    style={{ color: b.pct >= 100 ? "#fc7981" : b.pct >= 80 ? "#d08a11" : "#9f9b93" }}
                  >
                    {b.pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#eee9df" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(b.pct, 100)}%`,
                      background: b.pct >= 100 ? "#fc7981" : b.pct >= 80 ? "#fbbd41" : "#078a52",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: "#9f9b93" }}>{formatCurrency(b.spent)}</span>
                  <span className="text-xs" style={{ color: "#9f9b93" }}>/ {formatCurrency(b.limit)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="overflow-hidden" style={{ ...cardStyle, padding: 0 }}>
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #dad4c8" }}
        >
          <h2 className="font-semibold" style={{ fontSize: "15px" }}>Transaksi Terbaru</h2>
          <Link href="/transactions" className="text-xs font-medium transition-colors cursor-pointer" style={{ color: "#078a52" }}>
            Lihat semua
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "#eee9df" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9f9b93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "#55534e" }}>Belum ada transaksi</p>
            <p className="text-xs mt-1" style={{ color: "#9f9b93" }}>Tambahkan transaksi pertamamu!</p>
          </div>
        ) : (
          <ul>
            {recentTransactions.map((t) => (
              <li
                key={t.id}
                className="px-5 py-3.5 flex items-center justify-between transition-colors cursor-default hover:bg-[#faf9f7]"
                style={{ borderBottom: "1px solid #eee9df" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: t.type === "INCOME" ? "rgba(7,138,82,0.1)" : "rgba(252,121,129,0.1)" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.type === "INCOME" ? "#078a52" : "#fc7981"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {t.type === "INCOME" ? (
                        <>
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                          <polyline points="17 6 23 6 23 12"/>
                        </>
                      ) : (
                        <>
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <polyline points="19 12 12 19 5 12"/>
                        </>
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.description}</p>
                    <p className="text-xs" style={{ color: "#9f9b93" }}>
                      {t.category} · {fmtTxDate(t.date)}
                    </p>
                  </div>
                </div>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: t.type === "INCOME" ? "#078a52" : "#fc7981" }}
                >
                  {t.type === "INCOME" ? "+" : "-"}{formatCurrency(Number(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
