// Open Banking Simulator — generates realistic Indonesian transaction data

interface TxTemplate {
  description: string;
  merchant?: string;
  category: string;
  subcategory?: string;
  type: "INCOME" | "EXPENSE";
  minAmount: number;
  maxAmount: number;
  weight: number;
}

// ─── Templates per bank category ─────────────────────────────────────────────

const BANK_TEMPLATES: TxTemplate[] = [
  // Income
  { description: "KREDIT GAJI", category: "Gaji", type: "INCOME", minAmount: 5000000, maxAmount: 7000000, weight: 1 },
  { description: "TRF MASUK", category: "Lainnya", type: "INCOME", minAmount: 100000, maxAmount: 400000, weight: 1 },
  // Food & Drink
  { description: "ALFAMART", merchant: "Alfamart", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 18000, maxAmount: 120000, weight: 9 },
  { description: "INDOMARET", merchant: "Indomaret", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 15000, maxAmount: 100000, weight: 9 },
  { description: "WARUNG MAKAN", merchant: "Warung", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 12000, maxAmount: 55000, weight: 11 },
  { description: "KFC INDONESIA", merchant: "KFC", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 38000, maxAmount: 100000, weight: 3 },
  { description: "MCDONALD'S", merchant: "McDonald's", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 35000, maxAmount: 95000, weight: 3 },
  { description: "STARBUCKS", merchant: "Starbucks", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 40000, maxAmount: 75000, weight: 2 },
  { description: "SUPERMARKET", merchant: "Superindo", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 80000, maxAmount: 250000, weight: 3 },
  // Transport
  { description: "SPBU PERTAMINA", merchant: "Pertamina", category: "Transportasi", type: "EXPENSE", minAmount: 50000, maxAmount: 200000, weight: 5 },
  { description: "GOJEK", merchant: "Gojek", category: "Transportasi", type: "EXPENSE", minAmount: 10000, maxAmount: 55000, weight: 6 },
  { description: "GRAB", merchant: "Grab", category: "Transportasi", type: "EXPENSE", minAmount: 10000, maxAmount: 60000, weight: 6 },
  { description: "PARKIR", category: "Transportasi", type: "EXPENSE", minAmount: 3000, maxAmount: 20000, weight: 4 },
  // Shopping
  { description: "TOKOPEDIA", merchant: "Tokopedia", category: "Belanja", type: "EXPENSE", minAmount: 35000, maxAmount: 200000, weight: 4 },
  { description: "SHOPEE", merchant: "Shopee", category: "Belanja", type: "EXPENSE", minAmount: 35000, maxAmount: 200000, weight: 4 },
  { description: "LAZADA", merchant: "Lazada", category: "Belanja", type: "EXPENSE", minAmount: 45000, maxAmount: 150000, weight: 2 },
  // Bills
  { description: "PLN PREPAID", merchant: "PLN", category: "Tagihan & Utilitas", type: "EXPENSE", minAmount: 100000, maxAmount: 250000, weight: 1 },
  { description: "INDIHOME", merchant: "Telkom", category: "Tagihan & Utilitas", type: "EXPENSE", minAmount: 300000, maxAmount: 400000, weight: 1 },
  { description: "BPJS KESEHATAN", merchant: "BPJS", category: "Kesehatan", type: "EXPENSE", minAmount: 50000, maxAmount: 100000, weight: 1 },
  { description: "SPOTIFY PREMIUM", merchant: "Spotify", category: "Hiburan", type: "EXPENSE", minAmount: 54990, maxAmount: 54990, weight: 1 },
  // ATM
  { description: "TARIK TUNAI ATM", category: "Lainnya", type: "EXPENSE", minAmount: 200000, maxAmount: 400000, weight: 2 },
];

const GOPAY_TEMPLATES: TxTemplate[] = [
  { description: "TOP UP GOPAY", category: "Lainnya", type: "INCOME", minAmount: 100000, maxAmount: 300000, weight: 4 },
  { description: "GOFOOD", merchant: "GoFood", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 18000, maxAmount: 90000, weight: 14 },
  { description: "GORIDE", merchant: "GoRide", category: "Transportasi", type: "EXPENSE", minAmount: 8000, maxAmount: 40000, weight: 10 },
  { description: "GOCAR", merchant: "GoCar", category: "Transportasi", type: "EXPENSE", minAmount: 25000, maxAmount: 100000, weight: 4 },
  { description: "GOSEND", merchant: "GoSend", category: "Transportasi", type: "EXPENSE", minAmount: 12000, maxAmount: 35000, weight: 3 },
  { description: "TOKOPEDIA", merchant: "Tokopedia", category: "Belanja", type: "EXPENSE", minAmount: 35000, maxAmount: 200000, weight: 5 },
  { description: "ALFAMART QR", merchant: "Alfamart", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 15000, maxAmount: 80000, weight: 6 },
  { description: "INDOMARET QR", merchant: "Indomaret", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 15000, maxAmount: 70000, weight: 5 },
  { description: "PEMBAYARAN QR", merchant: "Merchant", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 12000, maxAmount: 120000, weight: 7 },
  { description: "GOTAGIHAN PLN", merchant: "PLN", category: "Tagihan & Utilitas", type: "EXPENSE", minAmount: 100000, maxAmount: 250000, weight: 1 },
];

const OVO_TEMPLATES: TxTemplate[] = [
  { description: "TOP UP OVO", category: "Lainnya", type: "INCOME", minAmount: 100000, maxAmount: 300000, weight: 4 },
  { description: "GRAB FOOD", merchant: "GrabFood", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 18000, maxAmount: 90000, weight: 14 },
  { description: "GRAB BIKE", merchant: "GrabBike", category: "Transportasi", type: "EXPENSE", minAmount: 8000, maxAmount: 40000, weight: 10 },
  { description: "GRAB CAR", merchant: "GrabCar", category: "Transportasi", type: "EXPENSE", minAmount: 25000, maxAmount: 110000, weight: 4 },
  { description: "TOKOPEDIA", merchant: "Tokopedia", category: "Belanja", type: "EXPENSE", minAmount: 35000, maxAmount: 200000, weight: 7 },
  { description: "OVO MERCHANT", merchant: "Merchant", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 12000, maxAmount: 120000, weight: 8 },
  { description: "TRANSFER OVO", category: "Lainnya", type: "EXPENSE", minAmount: 50000, maxAmount: 200000, weight: 2 },
  { description: "PEMBAYARAN PLN", merchant: "PLN", category: "Tagihan & Utilitas", type: "EXPENSE", minAmount: 100000, maxAmount: 250000, weight: 1 },
];

const DANA_TEMPLATES: TxTemplate[] = [
  { description: "TOP UP DANA", category: "Lainnya", type: "INCOME", minAmount: 100000, maxAmount: 300000, weight: 4 },
  { description: "SHOPEE", merchant: "Shopee", category: "Belanja", type: "EXPENSE", minAmount: 35000, maxAmount: 200000, weight: 10 },
  { description: "TOKOPEDIA", merchant: "Tokopedia", category: "Belanja", type: "EXPENSE", minAmount: 35000, maxAmount: 180000, weight: 6 },
  { description: "DANA MERCHANT", merchant: "Merchant", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 12000, maxAmount: 120000, weight: 10 },
  { description: "TRANSFER DANA", category: "Lainnya", type: "EXPENSE", minAmount: 50000, maxAmount: 250000, weight: 4 },
  { description: "PEMBAYARAN PLN", merchant: "PLN", category: "Tagihan & Utilitas", type: "EXPENSE", minAmount: 100000, maxAmount: 250000, weight: 1 },
  { description: "BPJS KESEHATAN", merchant: "BPJS", category: "Kesehatan", type: "EXPENSE", minAmount: 50000, maxAmount: 100000, weight: 1 },
];

const SHOPEEPAY_TEMPLATES: TxTemplate[] = [
  { description: "TOP UP SHOPEEPAY", category: "Lainnya", type: "INCOME", minAmount: 100000, maxAmount: 300000, weight: 4 },
  { description: "SHOPEE BELANJA", merchant: "Shopee", category: "Belanja", type: "EXPENSE", minAmount: 35000, maxAmount: 250000, weight: 14 },
  { description: "SHOPEEFOOD", merchant: "ShopeeFood", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 18000, maxAmount: 85000, weight: 10 },
  { description: "PEMBAYARAN QR", merchant: "Merchant", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 12000, maxAmount: 100000, weight: 7 },
  { description: "PEMBAYARAN PLN", merchant: "PLN", category: "Tagihan & Utilitas", type: "EXPENSE", minAmount: 100000, maxAmount: 250000, weight: 1 },
];

const CREDIT_TEMPLATES: TxTemplate[] = [
  { description: "PEMBAYARAN TAGIHAN CC", category: "Lainnya", type: "INCOME", minAmount: 1000000, maxAmount: 3000000, weight: 1 },
  { description: "RESTORAN", merchant: "Restoran", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 80000, maxAmount: 300000, weight: 7 },
  { description: "SUPERMARKET", merchant: "Giant/Transmart", category: "Makanan & Minuman", type: "EXPENSE", minAmount: 150000, maxAmount: 400000, weight: 5 },
  { description: "BELANJA ONLINE", merchant: "Tokopedia", category: "Belanja", type: "EXPENSE", minAmount: 100000, maxAmount: 500000, weight: 6 },
  { description: "SPOTIFY", merchant: "Spotify", category: "Hiburan", type: "EXPENSE", minAmount: 54990, maxAmount: 54990, weight: 1 },
  { description: "NETFLIX", merchant: "Netflix", category: "Hiburan", type: "EXPENSE", minAmount: 54000, maxAmount: 186000, weight: 1 },
  { description: "APOTEK/FARMASI", merchant: "Apotek", category: "Kesehatan", type: "EXPENSE", minAmount: 40000, maxAmount: 200000, weight: 2 },
  { description: "PERTAMINA", merchant: "Pertamina", category: "Transportasi", type: "EXPENSE", minAmount: 50000, maxAmount: 200000, weight: 4 },
  { description: "GRAB/GOJEK", merchant: "Grab", category: "Transportasi", type: "EXPENSE", minAmount: 15000, maxAmount: 100000, weight: 5 },
];

function getTemplates(bankName: string, accountType: string): TxTemplate[] {
  if (accountType === "credit") return CREDIT_TEMPLATES;
  const bn = bankName.toLowerCase();
  if (bn === "gopay") return GOPAY_TEMPLATES;
  if (bn === "ovo") return OVO_TEMPLATES;
  if (bn === "dana") return DANA_TEMPLATES;
  if (bn === "shopeepay") return SHOPEEPAY_TEMPLATES;
  return BANK_TEMPLATES; // BCA, Mandiri, BNI, BRI, CIMB Niaga, Lainnya
}

// Avg transactions per month by account category
function txPerMonth(bankName: string, accountType: string): number {
  if (accountType === "credit") return 14;
  const bn = bankName.toLowerCase();
  if (["gopay", "ovo", "dana", "shopeepay"].includes(bn)) return 18;
  return 20; // general bank
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick(templates: TxTemplate[]): TxTemplate {
  const total = templates.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of templates) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return templates[templates.length - 1];
}

function roundToThousand(n: number): number {
  return Math.round(n / 1000) * 1000;
}

export interface SimulatedTransaction {
  userId: string;
  bankAccountId: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  category: string;
  subcategory: string | null;
  description: string;
  merchant: string | null;
  date: Date;
  aiCategorized: boolean;
  aiInsight: string | null;
}

export function generateSimulatedTransactions(
  bankName: string,
  accountType: string,
  fromDate: Date,
  toDate: Date,
  userId: string,
  bankAccountId: string
): SimulatedTransaction[] {
  const templates = getTemplates(bankName, accountType);
  const monthlyRate = txPerMonth(bankName, accountType);
  const results: SimulatedTransaction[] = [];

  const current = new Date(fromDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(23, 59, 59, 999);

  const salaryTemplate = templates.find((t) => t.category === "Gaji");
  const topUpTemplate = templates.find((t) => t.description.startsWith("TOP UP") || t.description.includes("KREDIT GAJI"));
  const expenseTemplates = templates.filter((t) => t.type === "EXPENSE" && t.category !== "Gaji");
  const incomeTemplates = templates.filter((t) => t.type === "INCOME" && t.category !== "Gaji");

  const paidMonths = new Set<string>();
  const billedMonths = new Set<string>();

  const dailyProb = monthlyRate / 30;

  while (current <= end) {
    const dayOfMonth = current.getDate();
    const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;

    // ── Monthly salary on the 5th ──
    if (dayOfMonth === 5 && salaryTemplate && !paidMonths.has(monthKey)) {
      paidMonths.add(monthKey);
      const txDate = new Date(current);
      txDate.setHours(rand(8, 10), rand(0, 59), rand(0, 59));
      results.push(makeTx(salaryTemplate, txDate, userId, bankAccountId));
    }

    // ── Monthly top-up (e-wallets) on 1st–5th ──
    if (dayOfMonth <= 5 && topUpTemplate && !paidMonths.has(monthKey) && accountType !== "credit") {
      const bn = bankName.toLowerCase();
      if (!["bca", "mandiri", "bni", "bri", "cimb niaga", "lainnya"].includes(bn)) {
        paidMonths.add(monthKey);
        const txDate = new Date(current);
        txDate.setHours(rand(9, 12), rand(0, 59), rand(0, 59));
        results.push(makeTx(topUpTemplate, txDate, userId, bankAccountId));
      }
    }

    // ── Monthly bills: PLN on 10th, BPJS on 5th, Indihome on 15th, Spotify on 1st ──
    if (!billedMonths.has(`PLN-${monthKey}`) && dayOfMonth === 10) {
      const plnT = templates.find((t) => t.merchant === "PLN");
      if (plnT) {
        billedMonths.add(`PLN-${monthKey}`);
        const txDate = new Date(current);
        txDate.setHours(rand(9, 14), rand(0, 59), rand(0, 59));
        results.push(makeTx(plnT, txDate, userId, bankAccountId));
      }
    }
    if (!billedMonths.has(`BPJS-${monthKey}`) && dayOfMonth === 5) {
      const bpjsT = templates.find((t) => t.merchant === "BPJS");
      if (bpjsT) {
        billedMonths.add(`BPJS-${monthKey}`);
        const txDate = new Date(current);
        txDate.setHours(rand(9, 14), rand(0, 59), rand(0, 59));
        results.push(makeTx(bpjsT, txDate, userId, bankAccountId));
      }
    }
    if (!billedMonths.has(`Telkom-${monthKey}`) && dayOfMonth === 15) {
      const telkomT = templates.find((t) => t.merchant === "Telkom");
      if (telkomT) {
        billedMonths.add(`Telkom-${monthKey}`);
        const txDate = new Date(current);
        txDate.setHours(rand(9, 14), rand(0, 59), rand(0, 59));
        results.push(makeTx(telkomT, txDate, userId, bankAccountId));
      }
    }
    if (!billedMonths.has(`Spotify-${monthKey}`) && dayOfMonth === 1) {
      const spotifyT = templates.find((t) => t.merchant === "Spotify");
      if (spotifyT) {
        billedMonths.add(`Spotify-${monthKey}`);
        const txDate = new Date(current);
        txDate.setHours(rand(9, 11), rand(0, 59), rand(0, 59));
        results.push(makeTx(spotifyT, txDate, userId, bankAccountId));
      }
    }

    // ── Random daily transactions (weekends slightly higher) ──
    const modifier = isWeekend ? 1.2 : 1.0;
    const count = poissonApprox(dailyProb * modifier);

    for (let i = 0; i < count; i++) {
      const txDate = new Date(current);
      txDate.setHours(rand(8, 22), rand(0, 59), rand(0, 59));

      // 10% chance of an occasional small income (transfer masuk), rest expense
      const pool = Math.random() < 0.10 && incomeTemplates.length > 0 ? incomeTemplates : expenseTemplates;
      const tmpl = weightedPick(pool.length > 0 ? pool : templates);

      // Skip monthly recurring items
      if (["PLN", "BPJS", "Telkom", "Spotify"].includes(tmpl.merchant ?? "")) continue;
      if (tmpl.category === "Gaji") continue;
      if (tmpl.description.startsWith("TOP UP")) continue;

      results.push(makeTx(tmpl, txDate, userId, bankAccountId));
    }

    current.setDate(current.getDate() + 1);
  }

  return results;
}

function makeTx(
  t: TxTemplate,
  date: Date,
  userId: string,
  bankAccountId: string
): SimulatedTransaction {
  return {
    userId,
    bankAccountId,
    type: t.type,
    amount: roundToThousand(rand(t.minAmount, t.maxAmount)),
    category: t.category,
    subcategory: t.subcategory ?? null,
    description: t.description,
    merchant: t.merchant ?? null,
    date: new Date(date),
    aiCategorized: true,
    aiInsight: null,
  };
}

// Approximate Poisson distribution
function poissonApprox(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}
