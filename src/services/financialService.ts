import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  DailySalesRecord,
  DailyWageRecord,
  MonthlyExpenseRecord,
  FinancialAnalysisResult,
} from '../types';

const DAILY_SALES_COLLECTION = 'dailySales';
const DAILY_WAGES_COLLECTION = 'dailyWages';
const MONTHLY_EXPENSES_COLLECTION = 'monthlyExpenses';

// ==========================================
// 1. Daily Sales Service
// ==========================================
export const subscribeDailySales = (
  onSuccess: (sales: DailySalesRecord[]) => void,
  onError?: (error: Error) => void
) => {
  if (!auth.currentUser) {
    onSuccess([]);
    return () => {};
  }

  const q = query(collection(db, DAILY_SALES_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DailySalesRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<DailySalesRecord, 'id'>) });
      });
      onSuccess(list);
    },
    (err) => {
      console.warn('Daily sales subscription notice:', err.message);
      onSuccess([]);
      if (onError) onError(err);
    }
  );
};

export const saveDailySales = async (record: DailySalesRecord) => {
  try {
    const docRef = doc(db, DAILY_SALES_COLLECTION, record.id);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...record,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DAILY_SALES_COLLECTION}/${record.id}`);
  }
};

export const deleteDailySales = async (id: string) => {
  try {
    const docRef = doc(db, DAILY_SALES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${DAILY_SALES_COLLECTION}/${id}`);
  }
};

// ==========================================
// 2. Daily Wages Service
// ==========================================
export const subscribeDailyWages = (
  onSuccess: (wages: DailyWageRecord[]) => void,
  onError?: (error: Error) => void
) => {
  if (!auth.currentUser) {
    onSuccess([]);
    return () => {};
  }

  const q = query(collection(db, DAILY_WAGES_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DailyWageRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<DailyWageRecord, 'id'>) });
      });
      onSuccess(list);
    },
    (err) => {
      console.warn('Daily wages subscription notice:', err.message);
      onSuccess([]);
      if (onError) onError(err);
    }
  );
};

export const saveDailyWages = async (record: DailyWageRecord) => {
  try {
    const docRef = doc(db, DAILY_WAGES_COLLECTION, record.id);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...record,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DAILY_WAGES_COLLECTION}/${record.id}`);
  }
};

export const deleteDailyWages = async (id: string) => {
  try {
    const docRef = doc(db, DAILY_WAGES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${DAILY_WAGES_COLLECTION}/${id}`);
  }
};

// ==========================================
// 3. Monthly Expenses Service
// ==========================================
export const subscribeMonthlyExpenses = (
  onSuccess: (expenses: MonthlyExpenseRecord[]) => void,
  onError?: (error: Error) => void
) => {
  if (!auth.currentUser) {
    onSuccess([]);
    return () => {};
  }

  const q = query(collection(db, MONTHLY_EXPENSES_COLLECTION), orderBy('month', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: MonthlyExpenseRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<MonthlyExpenseRecord, 'id'>) });
      });
      onSuccess(list);
    },
    (err) => {
      console.warn('Monthly expenses subscription notice:', err.message);
      onSuccess([]);
      if (onError) onError(err);
    }
  );
};

export const saveMonthlyExpense = async (record: MonthlyExpenseRecord) => {
  try {
    const docRef = doc(db, MONTHLY_EXPENSES_COLLECTION, record.id);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...record,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${MONTHLY_EXPENSES_COLLECTION}/${record.id}`);
  }
};

export const deleteMonthlyExpense = async (id: string) => {
  try {
    const docRef = doc(db, MONTHLY_EXPENSES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MONTHLY_EXPENSES_COLLECTION}/${id}`);
  }
};

// ==========================================
// 4. AI Financial Advisor Analysis
// ==========================================
export const requestAiFinancialAnalysis = async (payload: {
  periodType: 'day' | 'week' | 'month' | 'year';
  periodLabel: string;
  salesTotal: number;
  buffetSales: number;
  foodSales: number;
  otherSales: number;
  purchaseTotal: number;
  wagesTotal: number;
  overheadTotal: number;
  waterTotal: number;
  electricityTotal: number;
  rentTotal: number;
  depreciationTotal: number;
  netProfit: number;
  profitMargin: number;
}): Promise<FinancialAnalysisResult> => {
  const res = await fetch('/api/ai-financial-advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'ไม่สามารถวิเคราะห์ข้อมูลด้วย AI ได้');
  }

  return data.analysis;
};
