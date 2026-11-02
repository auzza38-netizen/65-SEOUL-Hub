import React, { useState, useMemo, useRef } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2,
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  XCircle,
  Download, 
  Upload, 
  ShieldCheck, 
  ShieldAlert, 
  RotateCcw,
  Tag,
  DollarSign,
  Truck
} from 'lucide-react';
import { ItemMaster } from '../types';
import { CATEGORIES_11 } from '../data/masterCatalog173';
import { 
  updateItem, 
  createItem, 
  deleteItem,
  confirmBaseStock, 
  bulkConfirmAllBaseStocks, 
  exportCatalogToCSV, 
  parseCSVToItems 
} from '../services/itemService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

interface ItemMasterViewProps {
  items: ItemMaster[];
  onRefresh?: () => void;
}

export const ItemMasterView: React.FC<ItemMasterViewProps> = ({ items }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ItemMaster | null>(null);

  // New Item State
  const [newItem, setNewItem] = useState<Omit<ItemMaster, 'id'>>({
    code: '',
    nameTh: '',
    nameKo: '',
    category: CATEGORIES_11[0],
    unit: 'กก.',
    minStock: 5,
    parLevel: 15,
    currentStock: 10,
    baseStock: 10,
    baseStockConfirmed: false,
    status: 'active',
    averageCost: 100,
    lastPurchasePrice: 100,
    lastSupplier: 'ผู้จำหน่ายหลัก',
  });

  // Track items deleted in current session for immediate UI update
  const [locallyDeletedIds, setLocallyDeletedIds] = useState<Set<string>>(new Set());

  // Base stock confirmation banner state
  const unconfirmedCount = useMemo(() => {
    return items.filter((i) => !locallyDeletedIds.has(i.id) && !locallyDeletedIds.has(i.code) && !i.baseStockConfirmed).length;
  }, [items, locallyDeletedIds]);

  // Overall catalog stock statistics
  const stockStats = useMemo(() => {
    const validItems = items.filter((i) => !locallyDeletedIds.has(i.id) && !locallyDeletedIds.has(i.code));
    const total = validItems.length;
    const low = validItems.filter((i) => i.currentStock <= i.minStock * 1.3 && i.currentStock > 0).length;
    const out = validItems.filter((i) => i.currentStock <= 0).length;
    const sufficient = validItems.filter((i) => i.currentStock > i.minStock * 1.3).length;
    return { total, low, out, sufficient };
  }, [items, locallyDeletedIds]);

  const tableRef = useRef<HTMLDivElement>(null);

  // Click counter card to filter and smooth-scroll to table
  const handleFilterStatus = (status: string) => {
    setStockStatusFilter((prev) => (prev === status ? 'all' : status));
    setTimeout(() => {
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items
      .filter((i) => !locallyDeletedIds.has(i.id) && !locallyDeletedIds.has(i.code))
      .filter((item) => {
        const matchCat =
          selectedCategory === 'ทั้งหมด' || item.category === selectedCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          item.code.toLowerCase().includes(q) ||
          item.nameTh.toLowerCase().includes(q) ||
          (item.nameKo && item.nameKo.toLowerCase().includes(q)) ||
          (item.lastSupplier && item.lastSupplier.toLowerCase().includes(q));

        let matchStock = true;
        if (stockStatusFilter === 'low') {
          matchStock = item.currentStock <= item.minStock * 1.3 && item.currentStock > 0;
        } else if (stockStatusFilter === 'out') {
          matchStock = item.currentStock <= 0;
        } else if (stockStatusFilter === 'unconfirmed') {
          matchStock = !item.baseStockConfirmed;
        } else if (stockStatusFilter === 'inactive') {
          matchStock = item.status === 'inactive';
        }

        return matchCat && matchSearch && matchStock;
      });
  }, [items, locallyDeletedIds, selectedCategory, searchQuery, stockStatusFilter]);

  const handleOpenEdit = (item: ItemMaster) => {
    setEditingItem({ ...item });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      await updateItem(editingItem.id, editingItem);

      if (currentUser) {
        await logAudit(
          'UPDATE_ITEM',
          'item',
          editingItem.id,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'User',
          `แก้ไขข้อมูลสินค้า ${editingItem.code} (${editingItem.nameTh})`
        );
      }

      setIsEditModalOpen(false);
      alert('บันทึกการแก้ไขข้อมูลสินค้าสำเร็จ');
    } catch (error) {
      console.error('Update item error:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไขสินค้า');
    }
  };

  const handleConfirmSingleBaseStock = async (item: ItemMaster) => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถยืนยันยอดตั้งต้นได้');
      return;
    }

    try {
      await confirmBaseStock(item.id, item.baseStock, userProfile?.displayName || 'Master Admin');

      if (currentUser) {
        await logAudit(
          'CONFIRM_BASE_STOCK',
          'item',
          item.id,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'Master Admin',
          `ยืนยันยอดตั้งต้น ${item.code} (${item.nameTh}) เป็นจำนวน ${item.baseStock} ${item.unit}`
        );
      }

      alert(`ยืนยันยอดตั้งต้นของ ${item.nameTh} เรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Confirm base stock error:', error);
    }
  };

  const handleBulkConfirmAll = async () => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถยืนยันยอดตั้งต้นได้');
      return;
    }

    const unconfirmed = items.filter((i) => !i.baseStockConfirmed);
    if (unconfirmed.length === 0) {
      alert('ยอดตั้งต้นทุกรายการได้รับการยืนยันครบถ้วนแล้ว');
      return;
    }

    const proceed = window.confirm(
      `Master Admin: ยืนยันยอดตั้งต้นสำหรับสินค้าทั้ง ${unconfirmed.length} รายการที่ยังค้างอยู่หรือไม่?`
    );
    if (!proceed) return;

    try {
      await bulkConfirmAllBaseStocks(unconfirmed);

      if (currentUser) {
        await logAudit(
          'BULK_CONFIRM_BASE_STOCK',
          'item',
          'all',
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'Master Admin',
          `ยืนยันยอดตั้งต้นสินค้าทั้งหมด ${unconfirmed.length} รายการ`
        );
      }

      alert('ยืนยันยอดตั้งต้นสินค้าทั้งหมดเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Bulk confirm error:', error);
      alert('เกิดข้อผิดพลาดในการยืนยันยอดตั้งต้น');
    }
  };

  const handleOpenCreateModal = () => {
    // Generate next suggested code
    const count = items.length + 1;
    const defaultCode = `ITEM-${String(count).padStart(3, '0')}`;
    setNewItem({
      code: defaultCode,
      nameTh: '',
      nameKo: '',
      category: CATEGORIES_11[0],
      unit: 'กก.',
      minStock: 5,
      parLevel: 15,
      currentStock: 10,
      baseStock: 10,
      baseStockConfirmed: isAdmin,
      status: 'active',
      averageCost: 100,
      lastPurchasePrice: 100,
      lastSupplier: 'ผู้จำหน่ายหลัก',
    });
    setIsCreateModalOpen(true);
  };

  const handleDeleteItem = async (item: ItemMaster) => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการลบรายการ');
      return;
    }

    const confirmDelete = window.confirm(
      `ยืนยันการลบรายการวัตถุดิบ/สินค้า:\n[${item.code}] ${item.nameTh} ${item.nameKo ? `(${item.nameKo})` : ''}\n\nต้องการลบรายการนี้ออกจากฐานข้อมูลอย่างถาวรหรือไม่?`
    );
    if (!confirmDelete) return;

    // 1. Optimistically hide immediately from screen
    setLocallyDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      if (item.code) next.add(item.code);
      return next;
    });

    try {
      // 2. Perform deletion in Firestore and local fallback cache
      await deleteItem(item.id, item.code);

      if (currentUser) {
        await logAudit(
          'DELETE_ITEM',
          'item',
          item.id,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'User',
          `ลบรายการสินค้า [${item.code}] ${item.nameTh}`
        );
      }

      if (isEditModalOpen && editingItem?.id === item.id) {
        setIsEditModalOpen(false);
        setEditingItem(null);
      }

      alert(`ลบรายการ [${item.code}] ${item.nameTh} เรียบร้อยแล้ว`);
    } catch (error: any) {
      console.error('Delete item error:', error);
      // Revert if failed
      setLocallyDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        if (item.code) next.delete(item.code);
        return next;
      });
      alert(`เกิดข้อผิดพลาดในการลบสินค้า: ${error?.message || 'ไม่มีสิทธิ์หรือระบบขัดข้อง'}`);
    }
  };

  const handleCreateNewItem = async () => {
    if (!newItem.code.trim() || !newItem.nameTh.trim()) {
      alert('กรุณาระบุรหัสสินค้าและชื่อสินค้า');
      return;
    }

    try {
      await createItem(newItem);

      if (currentUser) {
        await logAudit(
          'CREATE_ITEM',
          'item',
          newItem.code,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'User',
          `สร้างสินค้าใหม่ ${newItem.code} (${newItem.nameTh})`
        );
      }

      setIsCreateModalOpen(false);
      alert('เพิ่มสินค้าใหม่เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Create item error:', error);
      alert('เกิดข้อผิดพลาดในการสร้างสินค้า');
    }
  };

  const handleExportCSV = () => {
    const csvStr = exportCatalogToCSV(items);
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `65Seoul_item_master_173_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const parsed = parseCSVToItems(text);
      if (parsed.length === 0) {
        alert('ไม่สามารถอ่านข้อมูลสินค้าจากไฟล์ CSV ได้ กรุณาตรวจสอบรูปแบบคอลัมน์');
        return;
      }

      const proceed = confirm(
        `พบข้อมูลสินค้า ${parsed.length} รายการจากไฟล์ ${file.name}\nต้องการนำเข้าข้อมูลและอัปเดตลงในระบบหรือไม่?\n(ยอดตั้งต้นจะต้องได้รับการยืนยันโดย Master Admin เสมอ)`
      );
      if (!proceed) return;

      try {
        let count = 0;
        for (const item of parsed) {
          if (item.code) {
            await createItem({
              code: item.code,
              nameTh: item.nameTh || 'สินค้า',
              nameKo: item.nameKo || '',
              category: item.category || 'อื่นๆ',
              unit: item.unit || 'ชิ้น',
              minStock: item.minStock || 5,
              parLevel: item.parLevel || 15,
              currentStock: item.currentStock || item.baseStock || 10,
              baseStock: item.baseStock || 10,
              baseStockConfirmed: false,
              status: item.status || 'active',
              averageCost: item.averageCost || 0,
              lastPurchasePrice: item.lastPurchasePrice || 0,
              lastSupplier: item.lastSupplier || '',
            });
            count++;
          }
        }

        if (currentUser) {
          await logAudit(
            'IMPORT_CSV_ITEMS',
            'system',
            file.name,
            currentUser.uid,
            currentUser.email || '',
            userProfile?.displayName || 'User',
            `นำเข้ารายการสินค้าจากไฟล์ CSV จำนวน ${count} รายการ`
          );
        }

        alert(`นำเข้ารายการสินค้าเรียบร้อยแล้วจำนวน ${count} รายการ`);
        setIsImportModalOpen(false);
      } catch (err) {
        console.error('Import CSV error:', err);
        alert('เกิดข้อผิดพลาดในการนำเข้า CSV');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Boxes className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                Item Master • คลังสินค้ามาตรฐาน 173 รายการ
              </h1>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              ฐานข้อมูลสินค้า 11 หมวดสำหรับร้านอาหารเกาหลี 65 Seoul พร้อมระบบควบคุมยอดตั้งต้น (Base Stock)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!currentUser) {
                  alert('กรุณาเข้าสู่ระบบ Google ก่อนเพิ่มรายการวัตถุดิบ');
                  return;
                }
                handleOpenCreateModal();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-bold shadow-sm ring-2 ring-rose-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ เพิ่มรายการวัตถุดิบใหม่</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-xs"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-xs"
            >
              <Upload className="w-4 h-4 text-zinc-500" />
              <span>นำเข้า CSV</span>
            </button>
          </div>
        </div>

        {/* Master Admin Base Stock Confirmation Alert Banner */}
        {unconfirmedCount > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  มียอดตั้งต้น {unconfirmedCount} รายการ ที่ยังรอการยืนยันจาก Master Admin
                </h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  ตามข้อกำหนดระบบ: &quot;ยอดตั้งต้นต้องได้รับการยืนยันจาก Master Admin ห้ามนำข้อมูลประวัติมาใช้เป็นยอดปัจจุบันอัตโนมัติ&quot;
                </p>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={handleBulkConfirmAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-xs shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>ยืนยันยอดตั้งต้นทั้งหมด ({unconfirmedCount})</span>
              </button>
            )}
          </div>
        )}

        {/* Live Counters Banner - Clickable with Smooth Scroll & Table Filter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => handleFilterStatus('all')}
            className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
              stockStatusFilter === 'all'
                ? 'bg-zinc-100 border-2 border-zinc-400 ring-2 ring-zinc-300 shadow-sm'
                : 'bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500">ทั้งหมดในคลัง</span>
              {stockStatusFilter === 'all' && (
                <span className="text-[10px] text-zinc-600 font-bold bg-zinc-200 px-1.5 py-0.5 rounded">แสดงอยู่</span>
              )}
            </div>
            <div className="text-lg font-bold text-zinc-900">{stockStats.total} รายการ</div>
            <span className="text-[10px] text-zinc-400 block mt-0.5">จิ้มดูทั้งหมดในตาราง ⬇</span>
          </button>

          <button
            type="button"
            onClick={() => handleFilterStatus('all')}
            className="p-3 rounded-xl text-left transition-all cursor-pointer bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/60 hover:shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-700">พอใช้งาน</span>
            </div>
            <div className="text-lg font-bold text-emerald-800">{stockStats.sufficient} รายการ</div>
            <span className="text-[10px] text-emerald-600 block mt-0.5">สถานะปกติ</span>
          </button>

          <button
            type="button"
            onClick={() => handleFilterStatus('low')}
            className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
              stockStatusFilter === 'low'
                ? 'bg-amber-100/90 border-2 border-amber-500 ring-2 ring-amber-300 shadow-sm scale-[1.01]'
                : 'bg-amber-50 border border-amber-200 hover:bg-amber-100/60 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                ใกล้หมด
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                stockStatusFilter === 'low' ? 'bg-amber-300 text-amber-950' : 'bg-amber-200/80 text-amber-900'
              }`}>
                {stockStatusFilter === 'low' ? 'กำลังกรอง ⬇' : 'จิ้มดู ⬇'}
              </span>
            </div>
            <div className="text-lg font-bold text-amber-800">{stockStats.low} รายการ</div>
            <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
              คลิกเพื่อดูรายการใกล้หมดในตาราง
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleFilterStatus('out')}
            className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
              stockStatusFilter === 'out'
                ? 'bg-rose-100/90 border-2 border-rose-500 ring-2 ring-rose-300 shadow-sm scale-[1.01]'
                : 'bg-rose-50 border border-rose-200 hover:bg-rose-100/60 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                หมด / ต้องซื้อ
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                stockStatusFilter === 'out' ? 'bg-rose-300 text-rose-950' : 'bg-rose-200/80 text-rose-900'
              }`}>
                {stockStatusFilter === 'out' ? 'กำลังกรอง ⬇' : 'จิ้มดู ⬇'}
              </span>
            </div>
            <div className="text-lg font-bold text-rose-800">{stockStats.out} รายการ</div>
            <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
              คลิกเพื่อดูรายการสินค้าหมดในตาราง
            </span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-100">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              หมวดหมู่ (11 หมวด)
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="ทั้งหมด">ทั้งหมด (173 รายการ)</option>
              {CATEGORIES_11.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              กรองสถานะสต็อก
            </label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="low">สินค้าใกล้หมด (Low Stock)</option>
              <option value="out">สินค้าหมด (Out of Stock)</option>
              <option value="unconfirmed">รอยืนยันยอดตั้งต้น</option>
              <option value="inactive">ปิดใช้งาน (Inactive)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              ค้นหารหัส / ชื่อสินค้า / ซัพพลายเออร์
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="เช่น หมูสามชั้น, 고추장, Makro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div ref={tableRef} id="item-master-table" className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden scroll-mt-24">
        {stockStatusFilter !== 'all' && (
          <div className="px-4 py-2.5 bg-zinc-100 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 font-medium">ตัวกรองจากปุ่มสรุป:</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-white border border-zinc-300 text-zinc-900 shadow-2xs">
                {stockStatusFilter === 'low'
                  ? '⚠️ แสดงเฉพาะรายการใกล้หมด'
                  : stockStatusFilter === 'out'
                  ? '🚨 แสดงเฉพาะรายการสินค้าหมด'
                  : stockStatusFilter === 'unconfirmed'
                  ? '🔒 รอยืนยันยอดตั้งต้น'
                  : 'ปิดใช้งาน'}{' '}
                ({filteredItems.length} รายการ)
              </span>
            </div>
            <button
              onClick={() => setStockStatusFilter('all')}
              className="text-rose-600 hover:text-rose-800 font-bold underline text-xs cursor-pointer"
            >
              แสดงทั้งหมด 173 รายการ (ยกเลิกตัวกรอง)
            </button>
          </div>
        )}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-700">
            แสดง {filteredItems.length} จากทั้งหมด {items.length} รายการ
          </span>
          <span className="text-xs text-zinc-500">
            * สต็อกปัจจุบันเชื่อมโยงกับการนับประจำวันและบิลซื้อที่ได้รับอนุมัติแล้ว
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/70 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3">รหัส</th>
                <th className="p-3">ชื่อสินค้า (ไทย / เกาหลี)</th>
                <th className="p-3">หมวดหมู่</th>
                <th className="p-3 text-center">หน่วย</th>
                <th className="p-3 text-center">Min / Par</th>
                <th className="p-3 text-center">ยอดตั้งต้น</th>
                <th className="p-3 text-center">สต็อกปัจจุบัน</th>
                <th className="p-3 text-right">ต้นทุนเฉลี่ย</th>
                <th className="p-3">ผู้จัดจำหน่ายล่าสุด</th>
                <th className="p-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="p-3 font-mono font-bold text-zinc-900">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                      {item.code}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="font-bold text-zinc-900 text-sm">{item.nameTh}</div>
                    {item.nameKo && (
                      <div className="text-zinc-500 text-[11px]">{item.nameKo}</div>
                    )}
                  </td>

                  <td className="p-3 text-zinc-600 max-w-[150px] truncate">{item.category}</td>

                  <td className="p-3 text-center font-medium text-zinc-700">{item.unit}</td>

                  <td className="p-3 text-center">
                    <span className="font-mono text-zinc-600">{item.minStock}</span>
                    <span className="text-zinc-400 mx-1">/</span>
                    <span className="font-mono text-zinc-900 font-semibold">{item.parLevel}</span>
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-mono font-bold text-zinc-800">{item.baseStock}</span>
                      {item.baseStockConfirmed ? (
                        <span title="ยืนยันแล้ว">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </span>
                      ) : (
                        <button
                          onClick={() => handleConfirmSingleBaseStock(item)}
                          disabled={!isAdmin}
                          className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200 hover:bg-amber-100"
                          title="คลิกเพื่อยืนยันยอดตั้งต้น"
                        >
                          ยืนยัน
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                        item.currentStock <= 0
                          ? 'bg-zinc-900 text-white'
                          : item.currentStock < item.minStock
                          ? 'bg-rose-100 text-rose-800'
                          : item.currentStock <= item.minStock * 1.3
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.currentStock} {item.unit}
                    </span>
                  </td>

                  <td className="p-3 text-right font-mono font-medium text-zinc-800">
                    ฿{item.averageCost.toLocaleString()}
                  </td>

                  <td className="p-3 text-zinc-600 max-w-[140px] truncate">
                    {item.lastSupplier || '-'}
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        title="แก้ไขข้อมูลวัตถุดิบ/สินค้า"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบรายการวัตถุดิบนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-bold text-base text-zinc-900">
                แก้ไขสินค้า [{editingItem.code}]
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">ชื่อสินค้า (ไทย)</label>
                <input
                  type="text"
                  value={editingItem.nameTh}
                  onChange={(e) => setEditingItem({ ...editingItem, nameTh: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">ชื่อสินค้า (เกาหลี)</label>
                <input
                  type="text"
                  value={editingItem.nameKo || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, nameKo: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">หมวดหมู่</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white"
                  >
                    {CATEGORIES_11.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={editingItem.minStock}
                    onChange={(e) => setEditingItem({ ...editingItem, minStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Par Level</label>
                  <input
                    type="number"
                    value={editingItem.parLevel}
                    onChange={(e) => setEditingItem({ ...editingItem, parLevel: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg bg-white text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">ยอดตั้งต้น (Base)</label>
                  <input
                    type="number"
                    value={editingItem.baseStock}
                    onChange={(e) => setEditingItem({ ...editingItem, baseStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg bg-white text-center"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.baseStockConfirmed}
                      onChange={(e) => setEditingItem({ ...editingItem, baseStockConfirmed: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-zinc-800">
                      ยืนยันยอดตั้งต้นนี้ (Master Admin Confirmed)
                    </span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">ราคาเฉลี่ย (฿)</label>
                  <input
                    type="number"
                    value={editingItem.averageCost}
                    onChange={(e) => setEditingItem({ ...editingItem, averageCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">สถานะ</label>
                  <select
                    value={editingItem.status}
                    onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg bg-white"
                  >
                    <option value="active">เปิดใช้งาน (Active)</option>
                    <option value="inactive">ปิดใช้งาน (Inactive)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteItem(editingItem)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบรายการนี้</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Item Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-bold text-base text-zinc-900">เพิ่มสินค้าใหม่เข้าระบบ</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400">✕</button>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">รหัสสินค้า</label>
                  <input
                    type="text"
                    placeholder="เช่น MEAT-023"
                    value={newItem.code}
                    onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    placeholder="เช่น กก., ลัง, ถุง"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">ชื่อสินค้า (ไทย)</label>
                <input
                  type="text"
                  placeholder="ชื่อภาษาไทย"
                  value={newItem.nameTh}
                  onChange={(e) => setNewItem({ ...newItem, nameTh: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">ชื่อสินค้า (เกาหลี)</label>
                <input
                  type="text"
                  placeholder="한국어 상품명 (ถ้ามี)"
                  value={newItem.nameKo}
                  onChange={(e) => setNewItem({ ...newItem, nameKo: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">หมวดหมู่</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg"
                >
                  {CATEGORIES_11.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    value={newItem.minStock}
                    onChange={(e) => setNewItem({ ...newItem, minStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Par Level</label>
                  <input
                    type="number"
                    value={newItem.parLevel}
                    onChange={(e) => setNewItem({ ...newItem, parLevel: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">ยอดตั้งต้น (Base)</label>
                  <input
                    type="number"
                    value={newItem.baseStock}
                    onChange={(e) => setNewItem({ ...newItem, baseStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">สต็อกคงเหลือปัจจุบัน</label>
                  <input
                    type="number"
                    value={newItem.currentStock}
                    onChange={(e) => setNewItem({ ...newItem, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">ราคาต้นทุนเฉลี่ย (฿)</label>
                  <input
                    type="number"
                    value={newItem.averageCost}
                    onChange={(e) => setNewItem({ ...newItem, averageCost: parseFloat(e.target.value) || 0, lastPurchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 border border-zinc-200 rounded-lg text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">ผู้จัดจำหน่าย / แหล่งซื้อ (Supplier)</label>
                <input
                  type="text"
                  placeholder="เช่น Makro, ตลาดสด, ซัพพลายเออร์เกาหลี"
                  value={newItem.lastSupplier}
                  onChange={(e) => setNewItem({ ...newItem, lastSupplier: e.target.value })}
                  className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-200 flex justify-end gap-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateNewItem}
                className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800"
              >
                บันทึกสินค้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="font-bold text-base text-zinc-900">
                นำเข้ารายการสินค้าจากไฟล์ CSV
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-zinc-400">✕</button>
            </div>

            <div className="space-y-4 mt-4">
              <p className="text-xs text-zinc-600">
                เลือกไฟล์ <span className="font-mono font-bold text-zinc-900">65Seoul_item_master_173.csv</span> หรือไฟล์ CSV มาตรฐานที่มีคอลัมน์:
                <br />
                <code className="text-[11px] bg-zinc-100 p-1 rounded block mt-1 text-zinc-700">
                  code, nameTh, nameKo, category, unit, minStock, parLevel, baseStock...
                </code>
              </p>

              <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center bg-zinc-50 hover:bg-zinc-100/70 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
                <label className="cursor-pointer">
                  <span className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 inline-block shadow-xs">
                    เลือกไฟล์ CSV จากเครื่อง
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-zinc-400 mt-2">
                  รองรับไฟล์ CSV ภาษาไทยและภาษาเกาหลี UTF-8
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
