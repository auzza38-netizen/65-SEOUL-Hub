import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  increment,
  getDocs,
  where
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { PurchaseBill, ItemMaster } from '../types';

const PURCHASES_COLLECTION = 'purchases';
const ITEMS_COLLECTION = 'items';

export const subscribePurchases = (
  onSuccess: (purchases: PurchaseBill[]) => void,
  onError?: (error: Error) => void
) => {
  if (!auth.currentUser) {
    onSuccess([]);
    return () => {};
  }

  const q = query(collection(db, PURCHASES_COLLECTION), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: PurchaseBill[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<PurchaseBill, 'id'>) });
      });
      onSuccess(list);
    },
    (err) => {
      console.warn('Purchases subscription notice:', err.message);
      onSuccess([]);
      if (onError) onError(err);
    }
  );
};

// Check for possible duplicate bill
export const checkForDuplicateBill = async (
  billNumber: string,
  supplierName: string,
  currentId?: string
): Promise<boolean> => {
  try {
    if (!billNumber || billNumber.trim() === '') return false;
    const q = query(
      collection(db, PURCHASES_COLLECTION),
      where('billNumber', '==', billNumber.trim())
    );
    const snap = await getDocs(q);
    if (snap.empty) return false;

    // Check if matching supplier and not current bill
    let isDup = false;
    snap.forEach((d) => {
      if (d.id !== currentId) {
        const data = d.data() as PurchaseBill;
        if (data.supplierName.trim().toLowerCase() === supplierName.trim().toLowerCase()) {
          isDup = true;
        }
      }
    });
    return isDup;
  } catch (error) {
    console.warn('Duplicate check warning:', error);
    return false;
  }
};

export const savePurchaseBill = async (bill: PurchaseBill) => {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, bill.id);
    await setDoc(docRef, {
      ...bill,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PURCHASES_COLLECTION}/${bill.id}`);
  }
};

// Master Admin approves purchase bill (does NOT alter 173 items stock)
export const approvePurchaseBill = async (
  bill: PurchaseBill,
  approverId: string,
  approverName: string,
  _itemsMaster?: ItemMaster[]
) => {
  try {
    const now = new Date().toISOString();
    const billRef = doc(db, PURCHASES_COLLECTION, bill.id);

    // Update bill status to approved
    await setDoc(
      billRef,
      {
        status: 'approved',
        hasStockApplied: false,
        approverId,
        approverName,
        approvedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PURCHASES_COLLECTION}/${bill.id}`);
  }
};

export const rejectPurchaseBill = async (
  billId: string,
  approverId: string,
  approverName: string,
  notes?: string
) => {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, billId);
    await updateDoc(docRef, {
      status: 'rejected',
      approverId,
      approverName,
      notes: notes || 'บิลไม่ผ่านการอนุมัติ กรุณาตรวจสอบยอดเงินหรือหลักฐาน',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PURCHASES_COLLECTION}/${billId}`);
  }
};

export const deletePurchaseBill = async (billId: string) => {
  try {
    await deleteDoc(doc(db, PURCHASES_COLLECTION, billId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PURCHASES_COLLECTION}/${billId}`);
  }
};
