import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ClipboardCheck, 
  Save, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  RotateCcw,
  Download,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  History,
  FileSpreadsheet
} from 'lucide-react';
import { ItemMaster, StockCheckSession, StockCheckLineItem, ShiftType, StockStatusType } from '../types';
import { CATEGORIES_11 } from '../data/masterCatalog173';
import { 
  computeStockStatus, 
  saveStockCheckDraft, 
  submitStockCheck, 
  approveStockCheck, 
  rejectStockCheck,
  deleteStockCheck
} from '../services/stockCheckService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

interface DailyStockCheckViewProps {
  items: ItemMaster[];
  stockChecks: StockCheckSession[];
  onRefresh?: () => void;
}

export const DailyStockCheckView: React.FC<DailyStockCheckViewProps> = ({
  items,
  stockChecks,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedShift, setSelectedShift] = useState<ShiftType>('evening');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'sufficient' | 'low' | 'out_or_need_purchase'>('all');
  const tableRef = useRef<HTMLDivElement>(null);

  // Active session state
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    `CHK-${todayStr}-${selectedShift}`
  );
  const [sessionStatus, setSessionStatus] = useState<'draft' | 'submitted' | 'approved' | 'rejected'>('draft');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [lineItems, setLineItems] = useState<{ [itemId: string]: StockCheckLineItem }>({});

  // Sync or load existing check session for date & shift
  useEffect(() => {
    const existing = stockChecks.find(
      (c) => c.date === selectedDate && (c.shift === selectedShift || (selectedShift === 'evening' && c.shift === 'night'))
    );

    if (existing) {
      setCurrentSessionId(existing.id);
      setSessionStatus(existing.status);
      setSessionNotes(existing.notes || '');

      const linesMap: { [itemId: string]: StockCheckLineItem } = {};
      existing.items.forEach((item) => {
        linesMap[item.itemId] = item;
      });

      // Merge with any newly added items in master
      items.filter(i => i.status === 'active').forEach((masterItem) => {
        if (!linesMap[masterItem.id]) {
          linesMap[masterItem.id] = {
            itemId: masterItem.id,
            itemCode: masterItem.code,
            itemNameTh: masterItem.nameTh,
            itemNameKo: masterItem.nameKo,
            category: masterItem.category,
            unit: masterItem.unit,
            openingStock: masterItem.currentStock,
            receivedStock: 0,
            remainingStock: masterItem.currentStock,
            status: computeStockStatus(masterItem.currentStock, masterItem.minStock),
          };
        }
      });

      setLineItems(linesMap);
    } else {
      // Build fresh worksheet based on current items
      const newId = `CHK-${selectedDate}-${selectedShift}`;
      setCurrentSessionId(newId);
      setSessionStatus('draft');
      setSessionNotes('');

      const freshLines: { [itemId: string]: StockCheckLineItem } = {};
      items.filter(i => i.status === 'active').forEach((m) => {
        freshLines[m.id] = {
          itemId: m.id,
          itemCode: m.code,
          itemNameTh: m.nameTh,
          itemNameKo: m.nameKo,
          category: m.category,
          unit: m.unit,
          openingStock: m.currentStock,
          receivedStock: 0,
          remainingStock: m.currentStock,
          status: computeStockStatus(m.currentStock, m.minStock),
        };
      });
      setLineItems(freshLines);
    }
  }, [selectedDate, selectedShift, stockChecks, items]);

  const handleStockChange = (itemId: string, newRemaining: number) => {
    if (sessionStatus === 'approved' && !isAdmin) return;

    setLineItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const targetMaster = items.find((i) => i.id === itemId);
      const minStock = targetMaster ? targetMaster.minStock : 5;
      const validVal = Math.max(0, Number(newRemaining) || 0);

      return {
        ...prev,
        [itemId]: {
          ...current,
          remainingStock: validVal,
          status: computeStockStatus(validVal, minStock),
        },
      };
    });
  };

  const handleNotesChange = (itemId: string, note: string) => {
    setLineItems((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          notes: note,
        },
      };
    });
  };

  // Filtered line items for display
  const displayedItems = useMemo(() => {
    return Object.values(lineItems).filter((line) => {
      const matchesCategory =
        selectedCategory === 'ทั้งหมด' || line.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        line.itemCode.toLowerCase().includes(q) ||
        line.itemNameTh.toLowerCase().includes(q) ||
        (line.itemNameKo && line.itemNameKo.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'sufficient') {
        matchesStatus = line.status === 'sufficient';
      } else if (statusFilter === 'low') {
        matchesStatus = line.status === 'low';
      } else if (statusFilter === 'out_or_need_purchase') {
        matchesStatus = line.status === 'out_of_stock' || line.status === 'need_purchase';
      }

      return matchesCategory && matchesSearch && matchesStatus;
    });
  }, [lineItems, selectedCategory, searchQuery, statusFilter]);

  // Click counter card to filter and smooth-scroll to table
  const handleFilterStatus = (filter: 'all' | 'sufficient' | 'low' | 'out_or_need_purchase') => {
    setStatusFilter((prev) => (prev === filter ? 'all' : filter));
    setTimeout(() => {
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Statistics
  const stats = useMemo(() => {
    const list = Object.values(lineItems);
    const total = list.length;
    const low = list.filter((l) => l.status === 'low').length;
    const out = list.filter((l) => l.status === 'out_of_stock').length;
    const needPurchase = list.filter((l) => l.status === 'need_purchase').length;
    const sufficient = list.filter((l) => l.status === 'sufficient').length;
    return { total, low, out, needPurchase, sufficient };
  }, [lineItems]);

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const sessionData: StockCheckSession = {
        id: currentSessionId,
        date: selectedDate,
        shift: selectedShift,
        category: selectedCategory,
        status: 'draft',
        checkerId: currentUser?.uid || 'guest-user',
        checkerName: userProfile?.displayName || currentUser?.displayName || 'พนักงาน',
        checkerEmail: currentUser?.email || '',
        notes: sessionNotes,
        items: Object.values(lineItems),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveStockCheckDraft(sessionData);
      setSessionStatus('draft');
      setSuccessMessage('บันทึกฉบับร่างเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Save draft error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกฉบับร่าง');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      setIsSaving(true);
      const sessionData: StockCheckSession = {
        id: currentSessionId,
        date: selectedDate,
        shift: selectedShift,
        category: selectedCategory,
        status: 'submitted',
        checkerId: currentUser?.uid || 'guest-user',
        checkerName: userProfile?.displayName || currentUser?.displayName || 'พนักงาน',
        checkerEmail: currentUser?.email || '',
        notes: sessionNotes,
        items: Object.values(lineItems),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveStockCheckDraft(sessionData);
      setSessionStatus('submitted');

      if (currentUser) {
        await logAudit(
          'SUBMIT_STOCK_CHECK',
          'stock_check',
          currentSessionId,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'User',
          `ส่งตรวจสต็อกรอบ ${selectedDate} (${selectedShift}) จำนวน ${Object.values(lineItems).length} รายการ`
        );
      }

      setSuccessMessage('ส่งรายงานตรวจสต็อกให้ Master Admin เรียบร้อยแล้ว');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (error) {
      console.error('Submit review error:', error);
      alert('เกิดข้อผิดพลาดในการส่งตรวจสต็อก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveSession = async () => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถอนุมัติสต็อกได้');
      return;
    }

    const confirmApprove = window.confirm(
      'ยืนยันการอนุมัติรอบตรวจนับสต็อกนี้? ยอดคงเหลือที่นับได้จะถูกอัปเดตเป็นสต็อกปัจจุบันของระบบทันที'
    );
    if (!confirmApprove) return;

    try {
      setIsSaving(true);
      const sessionData: StockCheckSession = {
        id: currentSessionId,
        date: selectedDate,
        shift: selectedShift,
        category: selectedCategory,
        status: 'submitted',
        checkerId: currentUser?.uid || 'admin',
        checkerName: userProfile?.displayName || 'Master Admin',
        checkerEmail: currentUser?.email || '',
        notes: sessionNotes,
        items: Object.values(lineItems),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await approveStockCheck(
        sessionData,
        currentUser?.uid || 'admin',
        userProfile?.displayName || 'Master Admin'
      );

      setSessionStatus('approved');

      if (currentUser) {
        await logAudit(
          'APPROVE_STOCK_CHECK',
          'stock_check',
          currentSessionId,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'Master Admin',
          `อนุมัติและปรับปรุงสต็อกเข้าระบบจริง รอบ ${selectedDate} (${selectedShift})`
        );
      }

      setSuccessMessage('อนุมัติสต็อกและปรับปรุงยอดคงเหลือในคลังสำเร็จแล้ว!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      console.error('Approve session error:', error);
      alert('เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectSession = async () => {
    if (!isAdmin) return;
    const reason = prompt('ระบุเหตุผลที่ไม่อนุมัติ (เช่น จำนวนนับไม่ถูกต้อง):');
    if (!reason) return;

    try {
      setIsSaving(true);
      await rejectStockCheck(
        currentSessionId,
        currentUser?.uid || 'admin',
        userProfile?.displayName || 'Master Admin',
        reason
      );
      setSessionStatus('rejected');
      setSessionNotes(reason);
      setSuccessMessage('ปฏิเสธรอบตรวจสต็อกเรียบร้อยแล้ว แจ้งพนักงานนับใหม่');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Reject session error:', error);
      alert('เกิดข้อผิดพลาดในการปฏิเสธ');
    } finally {
      setIsSaving(false);
    }
  };

  const exportCurrentCheckCSV = () => {
    const headers = [
      'รหัสสินค้า',
      'ชื่อภาษาไทย',
      'หมวดหมู่',
      'หน่วย',
      'ยอดยกมา',
      'ยอดรับเข้า',
      'จำนวนคงเหลือนับจริง',
      'สถานะ',
      'หมายเหตุ'
    ];
    const rows = displayedItems.map((item) => [
      `"${item.itemCode}"`,
      `"${item.itemNameTh.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.unit}"`,
      item.openingStock,
      item.receivedStock,
      item.remainingStock,
      `"${item.status}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `65Seoul_StockCheck_${selectedDate}_${selectedShift}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Status badge helper
  const renderStatusBadge = (status: StockStatusType) => {
    switch (status) {
      case 'sufficient':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            พอใช้งาน
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            ใกล้หมด
          </span>
        );
      case 'need_purchase':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            ต้องซื้อด่วน
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-white">
            <XCircle className="w-3 h-3 text-rose-400" />
            ของหมด (0)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                Daily Stock Check • ตรวจนับสต็อกประจำวัน
              </h1>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              ตรวจนับสต็อกรอบเย็นประจำวัน 173 รายการ เลือกจำนวน 0–30 หรือระบุเศษได้อย่างรวดเร็วบนมือถือ
            </p>
          </div>

          {/* Session Lifecycle Status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs text-zinc-500">สถานะเอกสาร:</span>
              {sessionStatus === 'draft' && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-zinc-200 text-zinc-800">
                  ฉบับร่าง (Draft)
                </span>
              )}
              {sessionStatus === 'submitted' && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                  รอ Master Admin อนุมัติ
                </span>
              )}
              {sessionStatus === 'approved' && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-600 text-white flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  อนุมัติแล้ว (Stock Synced)
                </span>
              )}
              {sessionStatus === 'rejected' && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  ปฏิเสธ (ให้นับใหม่)
                </span>
              )}
            </div>

            <button
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <History className="w-4 h-4 text-zinc-500" />
              <span>ประวัตินับย้อนหลัง</span>
            </button>

            <button
              onClick={exportCurrentCheckCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {/* Date, Shift, and Category Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-100">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              วันที่ตรวจนับ
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white text-zinc-800"
              />
              <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              รอบการทำงาน (Shift)
            </label>
            <div className="relative">
              <div className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🌙</span>
                  <span>รอบเย็น (Evening Shift)</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                  1 รอบ/วัน
                </span>
              </div>
              <Clock className="w-4 h-4 text-rose-600 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              หมวดหมู่สินค้า (11 หมวด)
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white text-zinc-800"
              >
                <option value="ทั้งหมด">ทั้งหมด (173 รายการ)</option>
                {CATEGORIES_11.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Filter className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              ค้นหารหัสหรือชื่อสินค้า
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="เช่น MEAT-001, สามชั้น, 삼겹살..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white text-zinc-800 placeholder-zinc-400"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Live Counters Banner - Clickable with Smooth Scroll & Table Filter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => handleFilterStatus('all')}
            className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-zinc-100 border-2 border-zinc-400 ring-2 ring-zinc-300 shadow-sm'
                : 'bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500">ทั้งหมดในรายการ</span>
              {statusFilter === 'all' && (
                <span className="text-[10px] text-zinc-600 font-bold bg-zinc-200 px-1.5 py-0.5 rounded">แสดงอยู่</span>
              )}
            </div>
            <div className="text-lg font-bold text-zinc-900">{stats.total} รายการ</div>
            <span className="text-[10px] text-zinc-400 block mt-0.5">จิ้มดูทั้งหมดในตาราง ⬇</span>
          </button>

          <button
            type="button"
            onClick={() => handleFilterStatus('sufficient')}
            className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
              statusFilter === 'sufficient'
                ? 'bg-emerald-100/80 border-2 border-emerald-500 ring-2 ring-emerald-300 shadow-sm'
                : 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/60 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-700">พอใช้งาน</span>
              {statusFilter === 'sufficient' && (
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-200 px-1.5 py-0.5 rounded">กำลังดู ⬇</span>
              )}
            </div>
            <div className="text-lg font-bold text-emerald-800">{stats.sufficient} รายการ</div>
            <span className="text-[10px] text-emerald-600 block mt-0.5">จิ้มดูในตาราง ⬇</span>
          </button>

          <button
            type="button"
            onClick={() => handleFilterStatus('low')}
            className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
              statusFilter === 'low'
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
                statusFilter === 'low' ? 'bg-amber-300 text-amber-950' : 'bg-amber-200/80 text-amber-900'
              }`}>
                {statusFilter === 'low' ? 'กำลังกรอง ⬇' : 'จิ้มดู ⬇'}
              </span>
            </div>
            <div className="text-lg font-bold text-amber-800">{stats.low} รายการ</div>
            <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
              คลิกเพื่อกรองและเลื่อนไปดูตาราง
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleFilterStatus('out_or_need_purchase')}
            className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
              statusFilter === 'out_or_need_purchase'
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
                statusFilter === 'out_or_need_purchase' ? 'bg-rose-300 text-rose-950' : 'bg-rose-200/80 text-rose-900'
              }`}>
                {statusFilter === 'out_or_need_purchase' ? 'กำลังกรอง ⬇' : 'จิ้มดู ⬇'}
              </span>
            </div>
            <div className="text-lg font-bold text-rose-800">
              {stats.out + stats.needPurchase} รายการ
            </div>
            <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
              คลิกเพื่อกรองและเลื่อนไปดูตาราง
            </span>
          </button>
        </div>

        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Stock Counting Worksheet (Mobile Cards & Desktop Table) */}
      <div ref={tableRef} id="stock-worksheet-table" className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden scroll-mt-24">
        {statusFilter !== 'all' && (
          <div className="px-4 py-2.5 bg-zinc-100 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 font-medium">ตัวกรองจากปุ่มสรุป:</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-white border border-zinc-300 text-zinc-900 shadow-2xs">
                {statusFilter === 'low'
                  ? '⚠️ แสดงเฉพาะรายการใกล้หมด'
                  : statusFilter === 'out_or_need_purchase'
                  ? '🚨 แสดงเฉพาะรายการหมด / ต้องซื้อ'
                  : '✅ แสดงเฉพาะรายการพอใช้งาน'}{' '}
                ({displayedItems.length} รายการ)
              </span>
            </div>
            <button
              onClick={() => setStatusFilter('all')}
              className="text-rose-600 hover:text-rose-800 font-bold underline text-xs cursor-pointer"
            >
              แสดงทั้งหมด (ยกเลิกตัวกรอง)
            </button>
          </div>
        )}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">
              รายการสินค้า ({displayedItems.length} รายการที่กำลังแสดง)
            </h2>
            <p className="text-xs text-zinc-500">
              กดเลือกจำนวนคงเหลือจาก Dropdown 0–30 หรือกดปุ่ม +/- เพื่อปรับจำนวนอย่างรวดเร็ว
            </p>
          </div>
          <div className="text-xs font-medium text-zinc-500">
            รอบ: {selectedDate} ({selectedShift === 'morning' ? 'รอบเช้า' : selectedShift === 'night' ? 'รอบค่ำ' : 'เต็มวัน'})
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Search className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
            <p className="font-semibold text-zinc-700">ไม่พบรายการสินค้าที่ค้นหา</p>
            <p className="text-xs text-zinc-400 mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {displayedItems.map((line) => {
              const targetItem = items.find((i) => i.id === line.itemId);
              const minStock = targetItem ? targetItem.minStock : 5;
              const parLevel = targetItem ? targetItem.parLevel : 15;

              return (
                <div
                  key={line.itemId}
                  className="p-4 sm:p-5 hover:bg-zinc-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {line.itemCode}
                      </span>
                      <span className="text-xs text-zinc-500">{line.category}</span>
                      {renderStatusBadge(line.status)}
                    </div>

                    <div className="mt-1">
                      <h3 className="text-base font-bold text-zinc-900 leading-tight">
                        {line.itemNameTh}
                      </h3>
                      {line.itemNameKo && (
                        <p className="text-xs font-medium text-zinc-500 tracking-wide mt-0.5">
                          {line.itemNameKo}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                      <span>
                        ยอดยกมา: <strong className="text-zinc-700">{line.openingStock}</strong> {line.unit}
                      </span>
                      <span>
                        ยอดรับเข้า: <strong className="text-zinc-700">{line.receivedStock}</strong> {line.unit}
                      </span>
                      <span>
                        จุดสั่งซื้อ (Min): <strong className="text-zinc-700">{minStock}</strong> {line.unit}
                      </span>
                      <span>
                        ระดับพาร์: <strong className="text-zinc-700">{parLevel}</strong> {line.unit}
                      </span>
                    </div>
                  </div>

                  {/* Right: Quantity Selector & Input */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                      <button
                        type="button"
                        onClick={() => handleStockChange(line.itemId, Math.max(0, line.remainingStock - 1))}
                        disabled={sessionStatus === 'approved' && !isAdmin}
                        className="w-8 h-8 rounded-lg bg-white text-zinc-700 shadow-xs flex items-center justify-center hover:bg-zinc-50 active:scale-95 disabled:opacity-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown for fast 0-30 selection */}
                      <select
                        value={line.remainingStock}
                        onChange={(e) => handleStockChange(line.itemId, parseFloat(e.target.value))}
                        disabled={sessionStatus === 'approved' && !isAdmin}
                        className="px-2 py-1 text-sm font-bold text-zinc-900 bg-white rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer min-w-[70px] text-center"
                      >
                        {[0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 28, 30, 35, 40, 50].map((val) => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                        {/* Custom value if not in standard list */}
                        {![0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20, 22, 24, 25, 28, 30, 35, 40, 50].includes(line.remainingStock) && (
                          <option value={line.remainingStock}>{line.remainingStock}</option>
                        )}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleStockChange(line.itemId, line.remainingStock + 1)}
                        disabled={sessionStatus === 'approved' && !isAdmin}
                        className="w-8 h-8 rounded-lg bg-white text-zinc-700 shadow-xs flex items-center justify-center hover:bg-zinc-50 active:scale-95 disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-xs font-semibold text-zinc-600 px-2">
                        {line.unit}
                      </span>
                    </div>

                    {/* Custom Exact Number Input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={line.remainingStock}
                        onChange={(e) => handleStockChange(line.itemId, parseFloat(e.target.value) || 0)}
                        disabled={sessionStatus === 'approved' && !isAdmin}
                        placeholder="กรอกเอง"
                        className="w-20 px-2.5 py-1.5 text-sm font-semibold rounded-xl border border-zinc-200 text-center focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Notes & Workflow Action Buttons */}
        <div className="p-5 bg-zinc-50 border-t border-zinc-200">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              หมายเหตุการตรวจนับรอบนี้ (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น ของในตู้ฟรีซ 2 มีน้ำแข็งเกาะ, เบคอนเหลือไม่พอเสิร์ฟรอบเย็น..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              disabled={sessionStatus === 'approved' && !isAdmin}
              className="w-full px-3 py-2 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white text-zinc-800"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">
              * ข้อมูลฉบับร่างจะถูกบันทึกไว้ใน Firebase สามารถกลับมาตรวจนับต่อได้ตลอดเวลา
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-800 text-sm font-semibold hover:bg-zinc-50 transition-colors shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-zinc-600" />
                <span>บันทึกฉบับร่าง</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors shadow-xs disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>ส่งตรวจเพื่อขออนุมัติ</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleApproveSession}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>อนุมัติสต็อก (Master Admin)</span>
                  </button>

                  {sessionStatus === 'submitted' && (
                    <button
                      type="button"
                      onClick={handleRejectSession}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>ปฏิเสธ (ให้นับใหม่)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-lg text-zinc-900">ประวัติการตรวจนับสต็อก</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-zinc-200 mt-4">
              {stockChecks.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-sm">
                  ยังไม่มีประวัติการเช็คสต็อกที่บันทึกไว้
                </div>
              ) : (
                stockChecks.map((sc) => (
                  <div key={sc.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900">{sc.date}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                          {sc.shift === 'evening' || sc.shift === 'night' ? 'รอบเย็น' : sc.shift === 'morning' ? 'รอบเช้า (เดิม)' : 'เต็มวัน'}
                        </span>
                        {sc.status === 'approved' ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            อนุมัติแล้ว
                          </span>
                        ) : sc.status === 'submitted' ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            รออนุมัติ
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                            ฉบับร่าง
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        ผู้ตรวจ: {sc.checkerName} • รายการนับ: {sc.items?.length || 0} รายการ
                        {sc.approverName && ` • ผู้อนุมัติ: ${sc.approverName}`}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDate(sc.date);
                        setSelectedShift(sc.shift);
                        setShowHistoryModal(false);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      โหลดดูรอบนี้
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
