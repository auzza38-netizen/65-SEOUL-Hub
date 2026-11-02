export type UserRole = 'master_admin' | 'staff' | 'viewer';
export type UserStatus = 'active' | 'pending' | 'disabled' | 'rejected';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  photoURL?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type StockStatusType = 'sufficient' | 'low' | 'out_of_stock' | 'need_purchase';

export interface ItemMaster {
  id: string;
  code: string;
  nameTh: string;
  nameKo: string;
  category: string;
  unit: string;
  minStock: number;
  parLevel: number;
  currentStock: number;
  baseStock: number;
  baseStockConfirmed: boolean;
  status: 'active' | 'inactive';
  averageCost: number;
  lastPurchasePrice: number;
  lastSupplier: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockCheckLineItem {
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  itemNameKo?: string;
  category: string;
  unit: string;
  openingStock: number;   // ยอดยกมา
  receivedStock: number;  // ยอดรับเข้า
  remainingStock: number; // จำนวนคงเหลือ
  status: StockStatusType; // พอ / ใกล้หมด / หมด / ต้องซื้อ
  notes?: string;
}

export type StockCheckStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ShiftType = 'evening' | 'night' | 'morning' | 'full_day';

export interface StockCheckSession {
  id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  category: string; // specific category or 'all'
  status: StockCheckStatus;
  checkerId: string;
  checkerName: string;
  checkerEmail: string;
  approverId?: string;
  approverName?: string;
  notes?: string;
  items: StockCheckLineItem[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export type PurchaseCategoryType = 'raw_material' | 'packaging' | 'consumable' | 'equipment' | 'other';
export type PurchaseStatus = 'pending_approval' | 'approved' | 'rejected';

export interface PurchaseLineItem {
  lineId: string;
  itemId?: string; // matched to ItemMaster
  matchedItemCode?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  date: string; // YYYY-MM-DD
  supplierName: string;
  category: PurchaseCategoryType;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  status: PurchaseStatus;
  hasStockApplied: boolean;
  receiptImageUrl?: string;
  ocrRawText?: string;
  items: PurchaseLineItem[];
  purchaserId: string;
  purchaserName: string;
  approverId?: string;
  approverName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: 'item' | 'stock_check' | 'purchase' | 'user' | 'system' | 'sale' | 'wage' | 'expense';
  entityId: string;
  userId: string;
  userEmail: string;
  userName: string;
  details: string;
  timestamp: string;
}

// 1. Daily Sales
export type SalesCategoryType = 'buffet' | 'food' | 'other';

export interface SalesLineItem {
  id: string;
  category: SalesCategoryType;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface DailySalesRecord {
  id: string;
  date: string; // YYYY-MM-DD
  items: SalesLineItem[];
  buffetTotal: number;
  foodTotal: number;
  otherTotal: number;
  grossSales: number;
  discount: number;
  netSales: number;
  customerCount?: number;
  recorderId: string;
  recorderName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 2. Daily Wages
export interface WageLineItem {
  id: string;
  staffName: string;
  role: string; // e.g. ครัว, เสิร์ฟ, บาร์, ล้างจาน, แคชเชียร์, ผู้จัดการ
  wageType: 'daily' | 'hourly' | 'shift';
  rate: number;
  hoursOrUnits: number;
  otAmount: number;
  bonusOrAllowance: number;
  deductions: number;
  totalWage: number;
  paymentStatus: 'paid' | 'pending';
  notes?: string;
}

export interface DailyWageRecord {
  id: string;
  date: string; // YYYY-MM-DD
  items: WageLineItem[];
  totalStaffCount: number;
  totalWages: number;
  recorderId: string;
  recorderName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 3. Monthly Expenses (Water, Electricity, Rent, Depreciation, Others)
export type MonthlyExpenseCategory = 'water' | 'electricity' | 'rent' | 'depreciation' | 'other';

export interface MonthlyExpenseLineItem {
  id: string;
  category: MonthlyExpenseCategory;
  name: string;
  amount: number;
  billNumber?: string;
  paymentStatus: 'paid' | 'pending';
  notes?: string;
}

export interface MonthlyExpenseRecord {
  id: string; // e.g. "EXP-2026-10"
  month: string; // YYYY-MM
  daysInMonth: number;
  items: MonthlyExpenseLineItem[];
  waterTotal: number;
  electricityTotal: number;
  rentTotal: number;
  depreciationTotal: number;
  otherTotal: number;
  totalMonthlyExpense: number;
  dailyAverageExpense: number; // totalMonthlyExpense / daysInMonth
  recorderId: string;
  recorderName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 4. Financial Dashboard & AI Analysis
export interface FinancialAnalysisResult {
  period: string;
  summary: string;
  healthScore: number; // 0 - 100
  foodCostPct: number;
  laborCostPct: number;
  overheadPct: number;
  profitMarginPct: number;
  strengths: string[];
  warnings: string[];
  recommendations: string[];
  analyzedAt: string;
}

