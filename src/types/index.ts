export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
}

export interface BankAccount {
  id: string;
  userId: string;
  name: string;
  bankName: string;
  accountType: string;
  balance: number;
  currency: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  bankAccountId: string | null;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory: string | null;
  description: string;
  merchant: string | null;
  date: Date;
  aiCategorized: boolean;
  aiInsight: string | null;
  createdAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  targetAmount: number;
  savedAmount: number;
  deadline: Date | null;
  status: GoalStatus;
  emoji: string | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export const EXPENSE_CATEGORIES = [
  "Makanan & Minuman",
  "Transportasi",
  "Belanja",
  "Hiburan",
  "Kesehatan",
  "Pendidikan",
  "Tagihan & Utilitas",
  "Investasi",
  "Lainnya",
] as const;

export const INCOME_CATEGORIES = [
  "Gaji",
  "Freelance",
  "Investasi",
  "Hadiah",
  "Lainnya",
] as const;

export const BANK_LIST = [
  { name: "BCA", color: "#003087" },
  { name: "Mandiri", color: "#003087" },
  { name: "BNI", color: "#f26522" },
  { name: "BRI", color: "#00529b" },
  { name: "CIMB Niaga", color: "#e31e24" },
  { name: "GoPay", color: "#00AED6" },
  { name: "OVO", color: "#4C3494" },
  { name: "Dana", color: "#108BE3" },
  { name: "ShopeePay", color: "#EE4D2D" },
  { name: "Lainnya", color: "#6B7280" },
] as const;
