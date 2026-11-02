import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ItemMaster } from '../types';
import { MASTER_ITEMS_173 } from '../data/masterCatalog173';

const ITEMS_COLLECTION = 'items';

const DELETED_ITEMS_KEY = '65seoul_deleted_item_codes';

// 47 items removed by store management prior to 23/10/2569
export const KNOWN_REMOVED_CODES = [
  'EQUP-009', 'EQUP-010', 'MEAT-004', 'MEAT-005',
  'MEAT-007', 'MEAT-008', 'MEAT-009', 'MEAT-010',
  'MEAT-011', 'MEAT-013', 'MEAT-014', 'MEAT-015',
  'MEAT-016', 'MEAT-017', 'MEAT-018', 'MEAT-019',
  'MEAT-020', 'MEAT-021', 'MEAT-022', 'NOOD-003',
  'NOOD-004', 'NOOD-009', 'SAUC-004', 'SAUC-016',
  'SAUC-017', 'SAUC-019', 'SAUC-020', 'SAUC-021',
  'SAUC-022', 'SAUC-025', 'SAUC-026', 'SAUC-028',
  'SEAF-001', 'SEAF-002', 'SEAF-003', 'SEAF-004',
  'SEAF-005', 'SEAF-006', 'SEAF-007', 'SEAF-008',
  'SEAF-009', 'SEAF-010', 'SEAF-011', 'SEAF-012',
  'SEAF-014', 'VEG-013', 'VEG-017'
];

export const getDeletedLocalSet = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    KNOWN_REMOVED_CODES.forEach((c) => {
      set.add(c);
      set.add(c.toLowerCase());
    });
    return set;
  } catch {
    const set = new Set<string>();
    KNOWN_REMOVED_CODES.forEach((c) => {
      set.add(c);
      set.add(c.toLowerCase());
    });
    return set;
  }
};

export const markItemDeletedLocally = (idOrCode: string) => {
  try {
    const set = getDeletedLocalSet();
    set.add(idOrCode);
    set.add(idOrCode.toLowerCase());
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
};

export const getLocalMasterFallback = (): ItemMaster[] => {
  const deleted = getDeletedLocalSet();
  return MASTER_ITEMS_173
    .filter((m) => !deleted.has(m.code) && !deleted.has(m.code.toLowerCase()))
    .map((m) => ({
      id: m.code,
      code: m.code,
      nameTh: m.nameTh,
      nameKo: m.nameKo,
      category: m.category,
      unit: m.unit,
      minStock: m.minStock,
      parLevel: m.parLevel,
      currentStock: m.baseStock,
      baseStock: m.baseStock,
      baseStockConfirmed: false,
      status: 'active',
      averageCost: m.averageCost,
      lastPurchasePrice: m.averageCost,
      lastSupplier: m.lastSupplier,
    }));
};

export const subscribeItems = (
  onSuccess: (items: ItemMaster[]) => void,
  onError?: (error: Error) => void
) => {
  const q = query(collection(db, ITEMS_COLLECTION), orderBy('code', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const deleted = getDeletedLocalSet();
      if (snapshot.empty) {
        // If empty, provide default master catalog filtered by deleted items
        onSuccess(getLocalMasterFallback());
        return;
      }
      const items: ItemMaster[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<ItemMaster, 'id'>;
        if (!deleted.has(doc.id) && !deleted.has(data.code || '')) {
          items.push({ id: doc.id, ...data });
        }
      });
      onSuccess(items);
    },
    (err) => {
      console.warn('Items subscription notice:', err.message);
      // Fallback to local catalog so UI remains functional
      onSuccess(getLocalMasterFallback());
      if (onError) onError(err);
    }
  );
};

// Seed or initialize catalog with 173 authentic Korean restaurant items
export const seedInitialCatalogIfEmpty = async (forceReset = false) => {
  try {
    // Only attempt write if authenticated
    if (!auth.currentUser) {
      return { seeded: false, count: 0, reason: 'unauthenticated' };
    }

    const existing = await getDocs(collection(db, ITEMS_COLLECTION));
    if (!existing.empty && !forceReset) {
      return { seeded: false, count: existing.size };
    }

    const now = new Date().toISOString();
    // Use batches of max 450 items
    const batch = writeBatch(db);
    MASTER_ITEMS_173.forEach((item) => {
      const itemDocRef = doc(db, ITEMS_COLLECTION, item.code);
      const data: Omit<ItemMaster, 'id'> = {
        code: item.code,
        nameTh: item.nameTh,
        nameKo: item.nameKo,
        category: item.category,
        unit: item.unit,
        minStock: item.minStock,
        parLevel: item.parLevel,
        currentStock: item.baseStock,
        baseStock: item.baseStock,
        baseStockConfirmed: false, // Must be explicitly confirmed by Master Admin
        status: 'active',
        averageCost: item.averageCost,
        lastPurchasePrice: item.averageCost,
        lastSupplier: item.lastSupplier,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(itemDocRef, data);
    });

    await batch.commit();
    return { seeded: true, count: MASTER_ITEMS_173.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ITEMS_COLLECTION);
  }
};

// Confirm Base Stock by Master Admin
export const confirmBaseStock = async (itemId: string, newBaseStock: number, adminName: string) => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    const now = new Date().toISOString();
    await updateDoc(itemRef, {
      baseStock: Number(newBaseStock),
      currentStock: Number(newBaseStock), // Sets the active initial stock to confirmed base stock
      baseStockConfirmed: true,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ITEMS_COLLECTION}/${itemId}`);
  }
};

// Bulk Confirm All Base Stocks by Master Admin
export const bulkConfirmAllBaseStocks = async (items: ItemMaster[]) => {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    items.forEach((item) => {
      const itemRef = doc(db, ITEMS_COLLECTION, item.id);
      batch.update(itemRef, {
        baseStockConfirmed: true,
        updatedAt: now,
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ITEMS_COLLECTION);
  }
};

// Update item details
export const updateItem = async (itemId: string, data: Partial<ItemMaster>) => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    await updateDoc(itemRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ITEMS_COLLECTION}/${itemId}`);
  }
};

// Create new custom item
export const createItem = async (data: Omit<ItemMaster, 'id'>) => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, data.code);
    await setDoc(itemRef, {
      ...data,
      baseStockConfirmed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ITEMS_COLLECTION}/${data.code}`);
  }
};

// Delete an item from Firestore
export const deleteItem = async (itemId: string, itemCode?: string) => {
  // 1. Instantly mark in local set so it vanishes immediately from local state
  markItemDeletedLocally(itemId);
  if (itemCode) markItemDeletedLocally(itemCode);

  try {
    // 2. Delete primary document by id
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    await deleteDoc(itemRef);

    // 3. If itemCode is provided and different from itemId, also delete by code
    if (itemCode && itemCode !== itemId) {
      try {
        await deleteDoc(doc(db, ITEMS_COLLECTION, itemCode));
      } catch {
        // Ignored if same or not present
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ITEMS_COLLECTION}/${itemId}`);
  }
};

// Export active catalog to CSV format
export const exportCatalogToCSV = (items: ItemMaster[]): string => {
  const headers = [
    'code',
    'nameTh',
    'nameKo',
    'category',
    'unit',
    'minStock',
    'parLevel',
    'baseStock',
    'currentStock',
    'baseStockConfirmed',
    'averageCost',
    'lastPurchasePrice',
    'lastSupplier',
    'status'
  ];

  const rows = items.map((i) => [
    `"${i.code}"`,
    `"${i.nameTh.replace(/"/g, '""')}"`,
    `"${(i.nameKo || '').replace(/"/g, '""')}"`,
    `"${i.category}"`,
    `"${i.unit}"`,
    i.minStock,
    i.parLevel,
    i.baseStock,
    i.currentStock,
    i.baseStockConfirmed ? 'TRUE' : 'FALSE',
    i.averageCost,
    i.lastPurchasePrice,
    `"${(i.lastSupplier || '').replace(/"/g, '""')}"`,
    `"${i.status}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

// Parse and import CSV
export const parseCSVToItems = (csvText: string): Partial<ItemMaster>[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const parsedItems: Partial<ItemMaster>[] = [];

  for (let idx = 1; idx < lines.length; idx++) {
    // Simple CSV parse with quote handling
    const line = lines[idx];
    const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    const cols = (match || line.split(',')).map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length >= 4) {
      const item: Partial<ItemMaster> = {
        code: cols[0] || `ITEM-${idx}`,
        nameTh: cols[1] || `สินค้า ${idx}`,
        nameKo: cols[2] || '',
        category: cols[3] || 'อื่นๆ',
        unit: cols[4] || 'ชิ้น',
        minStock: Number(cols[5]) || 5,
        parLevel: Number(cols[6]) || 15,
        baseStock: Number(cols[7]) || 10,
        currentStock: Number(cols[8]) || Number(cols[7]) || 10,
        averageCost: Number(cols[10]) || 0,
        lastPurchasePrice: Number(cols[11]) || Number(cols[10]) || 0,
        lastSupplier: cols[12] || '',
        status: (cols[13] === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        baseStockConfirmed: false, // Never auto-confirm from CSV without admin
      };
      parsedItems.push(item);
    }
  }

  return parsedItems;
};
