import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Calendar, 
  Search, 
  Filter, 
  Eye, 
  Download, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Store, 
  Tag, 
  Image as ImageIcon,
  DollarSign,
  ChevronRight,
  TrendingDown,
  Layers,
  ShoppingBag
} from 'lucide-react';
import { PurchaseBill, PurchaseLineItem } from '../types';
import { approvePurchaseBill, rejectPurchaseBill } from '../services/purchaseService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

interface PurchaseReportViewProps {
  purchases: PurchaseBill[];
  onOpenOcrScanner?: () => void;
}

type PeriodMode = 'day' | 'week' | 'month' | 'custom' | 'all';
type DateFieldFilter = 'billDate' | 'createdAt';

export const PurchaseReportView: React.FC<PurchaseReportViewProps> = ({
  purchases,
  onOpenOcrScanner,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);

  // Filters
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [dateField, setDateField] = useState<DateFieldFilter>('billDate');
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Drill-down Modal State
  const [selectedBillForDetail, setSelectedBillForDetail] = useState<PurchaseBill | null>(null);
  const [viewingReceiptFullImage, setViewingReceiptFullImage] = useState<string | null>(null);

  // Master Admin bill approval handler
  const handleApproveBillAction = async (bill: PurchaseBill) => {
    if (!isAdmin || !currentUser) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถอนุมัติบิลจัดซื้อได้');
      return;
    }

    try {
      setApprovingId(bill.id);
      const approverName = userProfile?.displayName || currentUser.displayName || 'Master Admin';
      await approvePurchaseBill(bill, currentUser.uid, approverName);

      await logAudit(
        'APPROVE_PURCHASE_BILL',
        'purchase',
        bill.id,
        currentUser.uid,
        currentUser.email || '',
        approverName,
        `อนุมัติบิลจัดซื้อ ${bill.billNumber || bill.id} ร้าน ${bill.supplierName} ยอด ฿${(bill.totalAmount || 0).toLocaleString()}`
      );

      // Update local modal state if open
      if (selectedBillForDetail && selectedBillForDetail.id === bill.id) {
        setSelectedBillForDetail({
          ...selectedBillForDetail,
          status: 'approved',
          approverId: currentUser.uid,
          approverName,
          approvedAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Approve bill failed:', err);
      alert('เกิดข้อผิดพลาดในการอนุมัติบิล: ' + err.message);
    } finally {
      setApprovingId(null);
    }
  };

  // Master Admin bill reject handler
  const handleRejectBillAction = async (bill: PurchaseBill) => {
    if (!isAdmin || !currentUser) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถปฏิเสธบิลจัดซื้อได้');
      return;
    }

    const reason = window.prompt('กรุณาระบุเหตุผลที่ไม่อนุมัติ / ส่งกลับแก้ไข (ถ้ามี):', 'ยอดเงินไม่ตรงกับใบเสร็จ หรือข้อมูลไม่ครบถ้วน');
    if (reason === null) return; // user cancelled

    try {
      setApprovingId(bill.id);
      const approverName = userProfile?.displayName || currentUser.displayName || 'Master Admin';
      await rejectPurchaseBill(bill.id, currentUser.uid, approverName, reason);

      await logAudit(
        'REJECT_PURCHASE_BILL',
        'purchase',
        bill.id,
        currentUser.uid,
        currentUser.email || '',
        approverName,
        `ปฏิเสธบิลจัดซื้อ ${bill.billNumber || bill.id} ร้าน ${bill.supplierName} เหตุผล: ${reason}`
      );

      // Update local modal state if open
      if (selectedBillForDetail && selectedBillForDetail.id === bill.id) {
        setSelectedBillForDetail({
          ...selectedBillForDetail,
          status: 'rejected',
          approverId: currentUser.uid,
          approverName,
          notes: reason,
        });
      }
    } catch (err: any) {
      console.error('Reject bill failed:', err);
      alert('เกิดข้อผิดพลาดในการปฏิเสธบิล: ' + err.message);
    } finally {
      setApprovingId(null);
    }
  };

  // Helper to get week start/end
  const currentWeekRange = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    const sunday = new Date(now.setDate(monday.getDate() + 6));
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  }, []);

  // Filter bills
  const filteredBills = useMemo(() => {
    return purchases.filter((bill) => {
      // 1. Target date to test
      const targetDateStr = dateField === 'billDate' 
        ? bill.date 
        : bill.createdAt.split('T')[0];

      // 2. Period check
      if (periodMode === 'day') {
        if (targetDateStr !== selectedDay) return false;
      } else if (periodMode === 'week') {
        if (targetDateStr < currentWeekRange.start || targetDateStr > currentWeekRange.end) return false;
      } else if (periodMode === 'month') {
        if (!targetDateStr.startsWith(selectedMonth)) return false;
      } else if (periodMode === 'custom') {
        if (targetDateStr < startDate || targetDateStr > endDate) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all' && bill.status !== statusFilter) return false;

      // 4. Category filter
      if (categoryFilter !== 'all' && bill.category !== categoryFilter) return false;

      // 5. Search query (bill number, supplier name, line items)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = (bill.billNumber || '').toLowerCase().includes(q);
        const matchesSupplier = (bill.supplierName || '').toLowerCase().includes(q);
        const matchesItems = (bill.items || []).some((it) => (it.itemName || '').toLowerCase().includes(q));
        if (!matchesNum && !matchesSupplier && !matchesItems) return false;
      }

      return true;
    });
  }, [
    purchases,
    periodMode,
    dateField,
    selectedDay,
    selectedMonth,
    startDate,
    endDate,
    currentWeekRange,
    statusFilter,
    categoryFilter,
    searchQuery,
  ]);

  // Aggregate Metrics
  const totalAmountSum = useMemo(() => {
    return filteredBills.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  }, [filteredBills]);

  const approvedBillsCount = useMemo(() => {
    return filteredBills.filter((b) => b.status === 'approved').length;
  }, [filteredBills]);

  const pendingBillsCount = useMemo(() => {
    return filteredBills.filter((b) => b.status === 'pending_approval').length;
  }, [filteredBills]);

  // Top suppliers in this filtered dataset
  const topSuppliers = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredBills.forEach((b) => {
      const name = b.supplierName || 'ไม่ระบุ';
      if (!map[name]) map[name] = { count: 0, total: 0 };
      map[name].count += 1;
      map[name].total += b.totalAmount || 0;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3);
  }, [filteredBills]);

  // Export CSV
  const exportCsv = () => {
    if (filteredBills.length === 0) {
      alert('ไม่มีรายการบิลสำหรับส่งออก');
      return;
    }

    const headers = [
      'เลขที่บิล',
      'วันที่ในบิล',
      'วันที่คีย์บันทึก',
      'ชื่อร้านค้า/ซัพพลายเออร์',
      'หมวดหมู่',
      'จำนวนรายการ',
      'ยอดรวมสุทธิ (฿)',
      'สถานะ',
      'ผู้จัดซื้อ/คีย์ข้อมูล',
      'ผู้อนุมัติ',
    ];

    const rows = filteredBills.map((b) => [
      `"${b.billNumber}"`,
      b.date,
      b.createdAt.split('T')[0],
      `"${b.supplierName}"`,
      b.category,
      (b.items || []).length,
      b.totalAmount || 0,
      b.status === 'approved' ? 'อนุมัติแล้ว' : b.status === 'rejected' ? 'ไม่อนุมัติ' : 'รออนุมัติ',
      `"${b.purchaserName || ''}"`,
      `"${b.approverName || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `65Seoul_Purchase_Report_${todayStr}.csv`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-lg sm:text-xl">
            <div className="p-2 rounded-xl bg-rose-50">
              <FileText className="w-5 h-5" />
            </div>
            <span>รายงานบิลจัดซื้อ & ตรวจสอบรายละเอียด (Purchase & Bill Reports)</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            ดูรายละเอียดในแต่ละบิล ย้อนดูเป็นรายวัน รายสัปดาห์ รายเดือน และเลือกค้นหาตามวันที่คีย์บิลหรือวันที่ในบิลได้
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenOcrScanner && (
            <button
              onClick={onOpenOcrScanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>สแกนบิลจัดซื้อใหม่</span>
            </button>
          )}

          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs"
            title="ส่งออกรายงานเป็น CSV"
          >
            <Download className="w-4 h-4 text-zinc-500" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-medium text-zinc-500">ยอดรวมการจัดซื้อทั้งหมด</span>
          <div className="text-2xl font-bold font-mono text-zinc-900 mt-1">
            ฿{totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            จากทั้งหมด {filteredBills.length} บิล ในช่วงเวลาที่เลือก
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-medium text-zinc-500">สถานะการอนุมัติบิล</span>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>อนุมัติแล้ว {approvedBillsCount}</span>
            </div>
            {pendingBillsCount > 0 && (
              <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                <span>รออนุมัติ {pendingBillsCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs sm:col-span-2">
          <span className="text-xs font-medium text-zinc-500">ซัพพลายเออร์/ร้านค้ายอดซื้อสูงสุด</span>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {topSuppliers.length === 0 ? (
              <span className="text-xs text-zinc-400">ไม่มีข้อมูล</span>
            ) : (
              topSuppliers.map(([name, stat], idx) => (
                <div
                  key={name}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1 text-xs flex items-center gap-1.5"
                >
                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-zinc-800 max-w-[120px] truncate">{name}</span>
                  <span className="font-mono text-zinc-500 text-[11px]">฿{stat.total.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-4">
        {/* Row 1: Period Mode & Date Field Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-700 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>ช่วงเวลา:</span>
            </span>

            <button
              onClick={() => setPeriodMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodMode === 'day' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              รายวัน (Daily)
            </button>
            <button
              onClick={() => setPeriodMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodMode === 'week' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              รายสัปดาห์นี้
            </button>
            <button
              onClick={() => setPeriodMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodMode === 'month' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              รายเดือน (Monthly)
            </button>
            <button
              onClick={() => setPeriodMode('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodMode === 'custom' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              กำหนดเอง
            </button>
            <button
              onClick={() => setPeriodMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                periodMode === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              ทั้งหมด
            </button>
          </div>

          {/* Date Field Switcher (วันที่ในบิล vs วันที่คีย์บิล) */}
          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs">
            <span className="font-semibold text-zinc-600">กรองตาม:</span>
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as DateFieldFilter)}
              className="bg-white px-2 py-1 border border-zinc-200 rounded-lg font-bold text-zinc-800 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
            >
              <option value="billDate">วันที่ในใบเสร็จ (Bill Date)</option>
              <option value="createdAt">วันที่คีย์บันทึกบิล (Created Date)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Selector Controls based on Period Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {periodMode === 'day' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-600">ระบุวันที่:</span>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs font-bold"
              />
            </div>
          )}

          {periodMode === 'week' && (
            <div className="text-xs text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
              สัปดาห์นี้: <strong>{currentWeekRange.start}</strong> ถึง <strong>{currentWeekRange.end}</strong>
            </div>
          )}

          {periodMode === 'month' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-600">ระบุเดือน:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs font-bold"
              />
            </div>
          )}

          {periodMode === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-600">ตั้งแต่:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs"
              />
              <span className="font-semibold text-zinc-600">ถึง:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white text-xs"
              />
            </div>
          )}

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="ค้นหาเลขที่บิล, ชื่อร้านค้า, สินค้าในบิล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-700"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="pending_approval">รออนุมัติ</option>
            <option value="rejected">ไม่อนุมัติ</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-700"
          >
            <option value="all">หมวดหมู่ทั้งหมด</option>
            <option value="raw_material">วัตถุดิบอาหาร</option>
            <option value="packaging">บรรจุภัณฑ์</option>
            <option value="consumable">ของใช้สิ้นเปลือง</option>
            <option value="equipment">อุปกรณ์ครัว</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>
      </div>

      {/* Bills Table with Drill-down capability */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-700">
            แสดง {filteredBills.length} รายการบิลจัดซื้อ
          </span>
          <span className="text-xs text-zinc-500">
            * คลิกที่แถวหรือปุ่ม &quot;ดูรายละเอียด&quot; เพื่อเปิดดูรายการสินค้าและภาพใบเสร็จ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
              <tr>
                <th className="p-3">เลขที่บิล</th>
                <th className="p-3">วันที่ในบิล</th>
                <th className="p-3">วันที่คีย์บิล</th>
                <th className="p-3">ร้านค้า / ซัพพลายเออร์</th>
                <th className="p-3 text-center">หมวดหมู่</th>
                <th className="p-3 text-center">จำนวนรายการ</th>
                <th className="p-3 text-right">ยอดเงินรวมสุทธิ (฿)</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center">ตรวจสอบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-400">
                    ไม่พบรายการบิลจัดซื้อในช่วงเวลาหรือเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    onClick={() => setSelectedBillForDetail(bill)}
                    className="hover:bg-rose-50/40 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-zinc-900">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                        {bill.billNumber}
                      </span>
                    </td>

                    <td className="p-3 text-zinc-700 font-medium">
                      {bill.date}
                    </td>

                    <td className="p-3 text-zinc-500 text-[11px]">
                      {bill.createdAt ? bill.createdAt.split('T')[0] : '-'}
                    </td>

                    <td className="p-3 font-bold text-zinc-900">
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{bill.supplierName}</span>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                        {bill.category === 'raw_material' ? 'วัตถุดิบ' : bill.category}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono">
                      {(bill.items || []).length} รายการ
                    </td>

                    <td className="p-3 text-right font-mono font-bold text-sm text-zinc-900">
                      ฿{(bill.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="p-3 text-center">
                      {bill.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" />
                          <span>อนุมัติแล้ว</span>
                        </span>
                      ) : bill.status === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" />
                          <span>ไม่อนุมัติ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3" />
                          <span>รออนุมัติ</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isAdmin && bill.status === 'pending_approval' && (
                          <button
                            type="button"
                            disabled={approvingId === bill.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveBillAction(bill);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors disabled:opacity-50"
                            title="กดอนุมัติบิลจัดซื้อทันที"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{approvingId === bill.id ? 'กำลังอนุมัติ...' : 'อนุมัติบิล'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBillForDetail(bill);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-500" />
                          <span>ดูรายละเอียด</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Drill-down Detail Modal */}
      {selectedBillForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-zinc-900 leading-tight">
                    รายละเอียดบิลจัดซื้อ [{selectedBillForDetail.billNumber}]
                  </h3>
                  <p className="text-xs text-zinc-500">
                    ร้านค้า: <strong>{selectedBillForDetail.supplierName}</strong> • วันที่บิล: {selectedBillForDetail.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBillForDetail(null)}
                className="text-zinc-400 hover:text-zinc-600 text-lg p-1.5 rounded-lg hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
                <div>
                  <span className="text-zinc-500 text-[11px] block">เลขที่บิล</span>
                  <span className="font-mono font-bold text-zinc-900 text-sm">{selectedBillForDetail.billNumber}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px] block">วันที่ในบิล</span>
                  <span className="font-bold text-zinc-800">{selectedBillForDetail.date}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px] block">วันที่คีย์ลงระบบ</span>
                  <span className="font-mono text-zinc-700">{selectedBillForDetail.createdAt.split('T')[0]}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[11px] block">สถานะ</span>
                  <span className="font-bold text-emerald-700">{selectedBillForDetail.status}</span>
                </div>
              </div>

              {/* Original Receipt Photo Preview */}
              {selectedBillForDetail.receiptImageUrl && (
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-bold text-zinc-800">มีรูปถ่ายต้นฉบับใบเสร็จ/บิล</span>
                  </div>
                  <button
                    onClick={() => setViewingReceiptFullImage(selectedBillForDetail.receiptImageUrl!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>เปิดดูรูปถ่ายบิลต้นฉบับ (ซูมดูตัวเลข)</span>
                  </button>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-zinc-900 mb-2 flex items-center justify-between">
                  <span>รายการสินค้าและวัตถุดิบทั้งหมด ({(selectedBillForDetail.items || []).length} รายการ)</span>
                </h4>
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                      <tr>
                        <th className="p-2.5">ลำดับ</th>
                        <th className="p-2.5">ชื่อสินค้า / วัตถุดิบ</th>
                        <th className="p-2.5 text-center">จำนวน</th>
                        <th className="p-2.5 text-center">หน่วย</th>
                        <th className="p-2.5 text-right">ราคาต่อหน่วย (฿)</th>
                        <th className="p-2.5 text-right">ยอดรวม (฿)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(selectedBillForDetail.items || []).map((it, idx) => (
                        <tr key={it.lineId || idx} className="hover:bg-zinc-50">
                          <td className="p-2.5 text-zinc-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-zinc-900">{it.itemName}</td>
                          <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-center text-zinc-600">{it.unit}</td>
                          <td className="p-2.5 text-right font-mono text-zinc-700">
                            ฿{(it.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-zinc-900">
                            ฿{(it.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200 space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between text-zinc-600">
                  <span>ยอดรวมสินค้า (Subtotal):</span>
                  <span className="font-mono">฿{(selectedBillForDetail.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>ส่วนลด (Discount):</span>
                  <span className="font-mono">฿{(selectedBillForDetail.discount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                  <span className="font-mono">฿{(selectedBillForDetail.tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-200 text-sm font-bold text-zinc-900">
                  <span>ยอดรวมสุทธิทั้งสิ้น (Total):</span>
                  <span className="text-base text-rose-600 font-mono">
                    ฿{(selectedBillForDetail.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Purchaser / Approver Info */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 flex flex-wrap items-center justify-between gap-2">
                <div>ผู้บันทึก/คีย์บิล: <strong>{selectedBillForDetail.purchaserName}</strong></div>
                {selectedBillForDetail.approverName && (
                  <div>ผู้อนุมัติบิล: <strong>{selectedBillForDetail.approverName}</strong></div>
                )}
                {selectedBillForDetail.notes && (
                  <div className="w-full text-zinc-500">หมายเหตุ: {selectedBillForDetail.notes}</div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <>
                    {selectedBillForDetail.status === 'pending_approval' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={approvingId === selectedBillForDetail.id}
                          onClick={() => handleApproveBillAction(selectedBillForDetail)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>{approvingId === selectedBillForDetail.id ? 'กำลังบันทึกอนุมัติ...' : '✓ อนุมัติบิลจัดซื้อนี้'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={approvingId === selectedBillForDetail.id}
                          onClick={() => handleRejectBillAction(selectedBillForDetail)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>✕ ไม่อนุมัติ / ส่งกลับ</span>
                        </button>
                      </div>
                    ) : selectedBillForDetail.status === 'approved' ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span>อนุมัติเรียบร้อยโดย {selectedBillForDetail.approverName || 'Master Admin'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRejectBillAction(selectedBillForDetail)}
                          className="text-[11px] text-zinc-500 hover:text-rose-600 underline font-medium"
                        >
                          ยกเลิกการอนุมัติ
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>บิลนี้ไม่ผ่านการอนุมัติ</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApproveBillAction(selectedBillForDetail)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          เปลี่ยนเป็นอนุมัติ
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-zinc-500">
                    * สถานะบิล: {selectedBillForDetail.status === 'approved' ? 'อนุมัติแล้ว' : 'รอ Master Admin ตรวจสอบ'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedBillForDetail(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-zinc-800 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Receipt Image Viewer */}
      {viewingReceiptFullImage && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setViewingReceiptFullImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-zinc-300 font-bold text-sm bg-zinc-800/80 px-3 py-1 rounded-full"
            >
              ✕ ปิด
            </button>
            <img
              src={viewingReceiptFullImage}
              alt="ภาพถ่ายใบเสร็จ"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
