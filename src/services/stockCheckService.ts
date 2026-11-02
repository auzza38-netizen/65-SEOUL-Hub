import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { StockCheckSession, StockStatusType, StockCheckLineItem, ItemMaster } from '../types';

const STOCK_CHECKS_COLLECTION = 'stockChecks';
const ITEMS_COLLECTION = 'items';

export const computeStockStatus = (remaining: number, minStock: number): StockStatusType => {
  if (remaining <= 0) return 'out_of_stock';
  if (remaining < minStock) return 'need_purchase';
  if (remaining <= minStock * 1.3) return 'low';
  return 'sufficient';
};

export const subscribeStockChecks = (
  onSuccess: (checks: StockCheckSession[]) => void,
  onError?: (error: Error) => void
) => {
  if (!auth.currentUser) {
    onSuccess([]);
    return () => {};
  }

  const q = query(collection(db, STOCK_CHECKS_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: StockCheckSession[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<StockCheckSession, 'id'>) });
      });
      onSuccess(list);
    },
    (err) => {
      console.warn('Stock checks subscription notice:', err.message);
      onSuccess([]);
      if (onError) onError(err);
    }
  );
};

export const saveStockCheckDraft = async (check: StockCheckSession) => {
  try {
    const docRef = doc(db, STOCK_CHECKS_COLLECTION, check.id);
    await setDoc(docRef, {
      ...check,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${STOCK_CHECKS_COLLECTION}/${check.id}`);
  }
};

export const submitStockCheck = async (checkId: string) => {
  try {
    const docRef = doc(db, STOCK_CHECKS_COLLECTION, checkId);
    await updateDoc(docRef, {
      status: 'submitted',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STOCK_CHECKS_COLLECTION}/${checkId}`);
  }
};

export const approveStockCheck = async (
  check: StockCheckSession,
  approverId: string,
  approverName: string
) => {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Update stock check status
    const checkRef = doc(db, STOCK_CHECKS_COLLECTION, check.id);
    batch.update(checkRef, {
      status: 'approved',
      approverId,
      approverName,
      approvedAt: now,
      updatedAt: now,
    });

    // 2. Update item current stocks with the approved counted stock
    check.items.forEach((line) => {
      const itemRef = doc(db, ITEMS_COLLECTION, line.itemId || line.itemCode);
      batch.update(itemRef, {
        currentStock: line.remainingStock,
        updatedAt: now,
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STOCK_CHECKS_COLLECTION);
  }
};

export const rejectStockCheck = async (
  checkId: string,
  approverId: string,
  approverName: string,
  notes?: string
) => {
  try {
    const checkRef = doc(db, STOCK_CHECKS_COLLECTION, checkId);
    const now = new Date().toISOString();
    await updateDoc(checkRef, {
      status: 'rejected',
      approverId,
      approverName,
      notes: notes || 'ไม่อนุมัติ - กรุณาตรวจสอบจำนวนและนับใหม่อีกครั้ง',
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${STOCK_CHECKS_COLLECTION}/${checkId}`);
  }
};

export const deleteStockCheck = async (checkId: string) => {
  try {
    await deleteDoc(doc(db, STOCK_CHECKS_COLLECTION, checkId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${STOCK_CHECKS_COLLECTION}/${checkId}`);
  }
};
