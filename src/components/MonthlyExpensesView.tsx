import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  Droplets, 
  Zap, 
  Home, 
  TrendingDown, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Download,
  Calculator
} from 'lucide-react';
import { MonthlyExpenseRecord, MonthlyExpenseLineItem, MonthlyExpenseCategory } from '../types';
import { saveMonthlyExpense, deleteMonthlyExpense } from '../services/financialService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

interface MonthlyExpensesViewProps {
  expenses: MonthlyExpenseRecord[];
}

const DEFAULT_EXPENSES: MonthlyExpenseLineItem[] = [
  {
    id: 'exp-1',
    category: 'rent',
    name: 'ค่าเช่าพื้นที่อาคารและหน้าร้าน',
    amount: 35000,
    paymentStatus: 'paid',
    notes: 'ชำระทุกวันที่ 1 ของเดือน',
  },
  {
    id: 'exp-2',
    category: 'electricity',
    name: 'ค่าไฟฟ้า (ตู้แช่, แอร์ห้องอาหาร, ฮูดดูดควัน)',
    amount: 18500,
    paymentStatus: 'paid',
    notes: 'การไฟฟ้านครหลวง/ส่วนภูมิภาค',
  },
  {
    id: 'exp-3',
    category: 'water',
    name: 'ค่าน้ำประปา (ล้างจาน, ประกอบอาหาร, ห้องน้ำ)',
    amount: 3200,
    paymentStatus: 'paid',
    notes: 'การประปา',
  },
  {
    id: 'exp-4',
    category: 'depreciation',
    name: 'ค่าเสื่อมราคาอุปกรณ์ (เตาปิ้งย่าง, ตู้แช่แข็ง, แอร์, ระบบ POS)',
    amount: 8500,
    paymentStatus: 'paid',
    notes: 'คิดเฉลี่ยอายุการใช้งาน 5 ปี',
  },
  {
    id: 'exp-5',
    category: 'other',
    name: 'ค่าอินเทอร์เน็ต ไฟเบอร์ & ระบบความปลอดภัย',
    amount: 1200,
    paymentStatus: 'paid',
    notes: 'เน็ตความเร็วสูง',
  },
];

export const MonthlyExpensesView: React.FC<MonthlyExpensesViewProps> = ({ expenses }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Form states
  const [items, setItems] = useState<MonthlyExpenseLineItem[]>(DEFAULT_EXPENSES);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [modalCategory, setModalCategory] = useState<MonthlyExpenseCategory>('other');
  const [modalName, setModalName] = useState<string>('');
  const [modalAmount, setModalAmount] = useState<string>('');
  const [modalBillNumber, setModalBillNumber] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');

  // Calculate days in selected month
  const daysInMonth = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    return new Date(year, month, 0).getDate(); // returns 28, 29, 30, or 31
  }, [selectedMonth]);

  // Find existing record
  const existingRecordForMonth = useMemo(() => {
    return expenses.find((e) => e.month === selectedMonth);
  }, [expenses, selectedMonth]);

  const handleSelectMonth = (monthVal: string) => {
    setSelectedMonth(monthVal);
    const found = expenses.find((e) => e.month === monthVal);
    if (found) {
      setItems(found.items);
      setNotes(found.notes || '');
    } else {
      setItems(DEFAULT_EXPENSES.map((exp, idx) => ({ ...exp, id: `exp-${Date.now()}-${idx}` })));
      setNotes('');
    }
    setSaveSuccess(false);
  };

  // Add custom item from modal
  const handleConfirmAddItemFromModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      alert('กรุณาระบุชื่อรายการค่าใช้จ่าย');
      return;
    }
    const amt = parseFloat(modalAmount) || 0;
    if (amt <= 0) {
      alert('กรุณาระบุยอดเงินที่มากกว่า 0');
      return;
    }

    const newItem: MonthlyExpenseLineItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: modalCategory,
      name: modalName.trim(),
      amount: amt,
      billNumber: modalBillNumber.trim() || undefined,
      paymentStatus: 'paid',
      notes: modalNotes.trim() || undefined,
    };

    setItems((prev) => [...prev, newItem]);
    // Reset modal fields
    setModalName('');
    setModalAmount('');
    setModalBillNumber('');
    setModalNotes('');
    setShowAddModal(false);
  };

  // Add line item
  const handleAddItem = (category: MonthlyExpenseCategory) => {
    const catLabels: Record<MonthlyExpenseCategory, string> = {
      water: 'ค่าน้ำประปาเพิ่มเติม',
      electricity: 'ค่าไฟฟ้าส่วนเสริม',
      rent: 'ค่าเช่าพื้นที่/ส่วนกลาง',
      depreciation: 'ค่าเสื่อมราคาอุปกรณ์ใหม่',
      other: 'ค่าใช้จ่ายคงที่อื่นๆ',
    };

    const newItem: MonthlyExpenseLineItem = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      name: catLabels[category],
      amount: 1000,
      paymentStatus: 'paid',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Update line item
  const handleUpdateItem = (id: string, field: keyof MonthlyExpenseLineItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, [field]: val };
      })
    );
  };

  // Remove line item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Category totals
  const waterTotal = useMemo(() => {
    return items.filter((i) => i.category === 'water').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  }, [items]);

  const electricityTotal = useMemo(() => {
    return items.filter((i) => i.category === 'electricity').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  }, [items]);

  const rentTotal = useMemo(() => {
    return items.filter((i) => i.category === 'rent').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  }, [items]);

  const depreciationTotal = useMemo(() => {
    return items.filter((i) => i.category === 'depreciation').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  }, [items]);

  const otherTotal = useMemo(() => {
    return items.filter((i) => i.category === 'other').reduce((sum, curr) => sum + (Number(curr.amount) || 0), 0);
  }, [items]);

  const totalMonthlyExpense = waterTotal + electricityTotal + rentTotal + depreciationTotal + otherTotal;

  // Daily average calculation (เอายอดมาเฉลี่ยเป็นรายวันให้ด้วย)
  const dailyAverageExpense = daysInMonth > 0 ? Math.round((totalMonthlyExpense / daysInMonth) * 100) / 100 : 0;

  // Save record
  const handleSave = async () => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนบันทึกค่าใช้จ่ายรายเดือน');
      return;
    }

    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการค่าใช้จ่ายอย่างน้อย 1 รายการ');
      return;
    }

    setIsSaving(true);
    try {
      const recordId = existingRecordForMonth ? existingRecordForMonth.id : `EXP-${selectedMonth}`;
      const payload: MonthlyExpenseRecord = {
        id: recordId,
        month: selectedMonth,
        daysInMonth,
        items,
        waterTotal,
        electricityTotal,
        rentTotal,
        depreciationTotal,
        otherTotal,
        totalMonthlyExpense,
        dailyAverageExpense,
        recorderId: currentUser.uid,
        recorderName: userProfile?.displayName || currentUser.displayName || 'พนักงาน',
        notes,
        createdAt: existingRecordForMonth ? existingRecordForMonth.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveMonthlyExpense(payload);

      await logAudit(
        'SAVE_MONTHLY_EXPENSES',
        'expense',
        recordId,
        currentUser.uid,
        currentUser.email || '',
        userProfile?.displayName || 'User',
        `บันทึกค่าใช้จ่ายประจำเดือน ${selectedMonth} รวม ฿${totalMonthlyExpense.toLocaleString()} (เฉลี่ยวันละ ฿${dailyAverageExpense.toLocaleString()})`
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert(`บันทึกค่าใช้จ่ายประจำเดือน ${selectedMonth} เรียบร้อยแล้ว (เฉลี่ยรายวัน: ฿${dailyAverageExpense.toLocaleString()}/วัน)`);
    } catch (err: any) {
      console.error('Save monthly expense error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete record
  const handleDeleteRecord = async (record: MonthlyExpenseRecord) => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถลบข้อมูลค่าใช้จ่ายรายเดือนได้');
      return;
    }
    if (!window.confirm(`ยืนยันการลบข้อมูลค่าใช้จ่ายเดือน ${record.month} หรือไม่?`)) return;

    try {
      await deleteMonthlyExpense(record.id);
      if (selectedMonth === record.month) {
        handleSelectMonth(selectedMonth);
      }
      alert('ลบข้อมูลค่าใช้จ่ายรายเดือนสำเร็จ');
    } catch (err: any) {
      console.error('Delete expense error:', err);
      alert('ลบข้อมูลไม่สำเร็จ: ' + err.message);
    }
  };

  // Export CSV
  const exportCsv = () => {
    if (expenses.length === 0) {
      alert('ยังไม่มีข้อมูลค่าใช้จ่ายสำหรับส่งออก');
      return;
    }

    const headers = [
      'เดือน (YYYY-MM)',
      'จำนวนวันในเดือน',
      'ค่าเช่า (฿)',
      'ค่าไฟ (฿)',
      'ค่าน้ำ (฿)',
      'ค่าเสื่อมราคา (฿)',
      'อื่นๆ (฿)',
      'รวมทั้งเดือน (฿)',
      'เฉลี่ยรายวัน (฿/วัน)',
      'ผู้บันทึก',
    ];
    const rows = expenses.map((e) => [
      e.month,
      e.daysInMonth,
      e.rentTotal,
      e.electricityTotal,
      e.waterTotal,
      e.depreciationTotal,
      e.otherTotal,
      e.totalMonthlyExpense,
      e.dailyAverageExpense,
      `"${e.recorderName}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `65Seoul_Monthly_Expenses_${selectedMonth}.csv`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 font-bold text-lg sm:text-xl">
            <div className="p-2 rounded-xl bg-cyan-50">
              <Building2 className="w-5 h-5" />
            </div>
            <span>บันทึก ค่าน้ำ ค่าไฟ ค่าเช่าสถานที่ ค่าเสื่อมราคา (Monthly Overhead Expenses)</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            บันทึกค่าใช้จ่ายคงที่รายเดือน โดยระบบจะนำยอดมาเฉลี่ยเป็นต้นทุนรายวันอัตโนมัติ เพื่อคำนวณกำไร-ขาดทุนที่แท้จริง
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="font-semibold text-zinc-700 whitespace-nowrap">เลือกเดือน:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleSelectMonth(e.target.value)}
              className="bg-white px-2.5 py-1 rounded-lg border border-zinc-300 font-bold text-zinc-800 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs shrink-0"
            title="ส่งออกรายงานเป็น CSV"
          >
            <Download className="w-4 h-4 text-zinc-500" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Left (2 Cols), Summary Right (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Category Line Items */}
        <div className="lg:col-span-2 space-y-5">
          {existingRecordForMonth ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  มีบันทึกค่าใช้จ่ายเดือน <strong>{selectedMonth}</strong> แล้ว (รวมทั้งเดือน ฿{existingRecordForMonth.totalMonthlyExpense.toLocaleString()} • เฉลี่ยวันละ ฿{existingRecordForMonth.dailyAverageExpense.toLocaleString()}) สามารถแก้ไขและบันทึกทับได้
                </span>
              </div>
              <span className="text-[11px] text-emerald-700">โดย {existingRecordForMonth.recorderName}</span>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                กำลังลงข้อมูลค่าใช้จ่ายใหม่สำหรับเดือน <strong>{selectedMonth}</strong> (เดือนนี้มี {daysInMonth} วัน)
              </span>
            </div>
          )}

          {/* Table of Monthly Expense Items */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-700" />
                <h3 className="font-bold text-sm text-zinc-900">
                  รายการค่าใช้จ่ายรายเดือน ({items.length} รายการ)
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow-xs transition-colors ring-2 ring-cyan-700/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ เพิ่มรายการค่าใช้จ่าย</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('rent')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-50"
                >
                  <Home className="w-3 h-3 text-purple-600" />
                  <span>+ ค่าเช่า</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('electricity')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-50"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>+ ค่าไฟ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('water')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-50"
                >
                  <Droplets className="w-3 h-3 text-cyan-600" />
                  <span>+ ค่าน้ำ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('depreciation')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-50"
                >
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                  <span>+ ค่าเสื่อม</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('other')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 px-2 py-1 rounded-lg hover:bg-zinc-50"
                >
                  <Plus className="w-3 h-3 text-zinc-500" />
                  <span>+ อื่นๆ</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100/70 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3 w-32">หมวดหมู่</th>
                    <th className="p-3 min-w-[200px]">ชื่อรายการค่าใช้จ่าย</th>
                    <th className="p-3 text-right w-36">ยอดเงินทั้งเดือน (฿)</th>
                    <th className="p-3 text-right w-28">เฉลี่ยต่อวัน (฿)</th>
                    <th className="p-3 text-center w-12">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map((item) => {
                    const itemDaily = daysInMonth > 0 ? Math.round(((item.amount || 0) / daysInMonth) * 100) / 100 : 0;
                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/60">
                        <td className="p-2.5">
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value as MonthlyExpenseCategory)}
                            className="w-full px-2 py-1 border border-zinc-200 rounded-lg text-xs bg-white font-semibold text-zinc-800"
                          >
                            <option value="rent">ค่าเช่าสถานที่</option>
                            <option value="electricity">ค่าไฟฟ้า</option>
                            <option value="water">ค่าน้ำประปา</option>
                            <option value="depreciation">ค่าเสื่อมราคา</option>
                            <option value="other">ค่าใช้จ่ายอื่นๆ</option>
                          </select>
                        </td>

                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            placeholder="รายละเอียดค่าใช้จ่าย"
                            className="w-full px-2.5 py-1 border border-zinc-200 rounded-lg text-xs text-zinc-900 bg-white"
                          />
                        </td>

                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-zinc-400 font-mono">฿</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => handleUpdateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-28 text-right font-mono font-bold px-2 py-1 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900"
                            />
                          </div>
                        </td>

                        <td className="p-2.5 text-right font-mono text-zinc-600 text-xs">
                          ฿{itemDaily.toLocaleString()}
                        </td>

                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Row Add Item Button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="w-full py-3 bg-zinc-50/80 hover:bg-cyan-50/50 border-t border-zinc-200 text-xs font-bold text-cyan-800 flex items-center justify-center gap-2 transition-colors cursor-pointer group"
            >
              <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:bg-cyan-700 group-hover:text-white transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>คลิกเพื่อเพิ่มรายการค่าใช้จ่ายใหม่ในเดือนนี้</span>
            </button>
          </div>
        </div>

        {/* Right Column (1 Col): Monthly Summary & Daily Average */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-600" />
              <span>สรุปค่าใช้จ่ายเดือน {selectedMonth}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-purple-600" />
                  <span>ค่าเช่าสถานที่:</span>
                </span>
                <span className="font-mono font-bold text-zinc-800">฿{rentTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>ค่าไฟฟ้า:</span>
                </span>
                <span className="font-mono font-bold text-zinc-800">฿{electricityTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                  <span>ค่าน้ำประปา:</span>
                </span>
                <span className="font-mono font-bold text-zinc-800">฿{waterTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  <span>ค่าเสื่อมราคา:</span>
                </span>
                <span className="font-mono font-bold text-zinc-800">฿{depreciationTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-600">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-500" />
                  <span>ค่าใช้จ่ายอื่นๆ:</span>
                </span>
                <span className="font-mono font-bold text-zinc-800">฿{otherTotal.toLocaleString()}</span>
              </div>

              <div className="border-t border-zinc-100 pt-2 flex justify-between items-center text-zinc-700 font-bold">
                <span>ยอดรวมทั้งเดือน ({daysInMonth} วัน):</span>
                <span className="font-mono text-base text-zinc-900">฿{totalMonthlyExpense.toLocaleString()}</span>
              </div>

              {/* Daily Averaged Cost Banner (เอายอดมาเฉลี่ยเป็นรายวันให้ด้วย) */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3.5 border border-cyan-200">
                <div className="flex items-center gap-1.5 text-cyan-900 font-bold text-xs mb-1">
                  <Calculator className="w-4 h-4 text-cyan-600" />
                  <span>ยอดเฉลี่ยเป็นรายวัน (Daily Overhead)</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-[11px] text-cyan-700">
                    ฿{totalMonthlyExpense.toLocaleString()} ÷ {daysInMonth} วัน
                  </span>
                  <span className="text-xl font-extrabold font-mono text-cyan-700">
                    ฿{dailyAverageExpense.toLocaleString()} <span className="text-xs font-normal">/วัน</span>
                  </span>
                </div>
                <p className="text-[10px] text-cyan-800/80 mt-1.5">
                  * ตัวเลขนี้จะถูกนำไปบวกเป็นต้นทุนรายวันอัตโนมัติในหน้า Dashboard เพื่อคำนวณกำไรสุทธิต่อวัน
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">หมายเหตุ:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ค่าไฟเดือนนี้เพิ่มขึ้นเนื่องจากหน้าร้อน..."
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-700 text-white font-bold text-xs hover:bg-cyan-800 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกค่าใช้จ่ายเดือนนี้'}</span>
            </button>
            {saveSuccess && (
              <p className="text-center text-xs font-semibold text-emerald-600 animate-pulse">
                ✓ บันทึกค่าใช้จ่ายรายเดือนเรียบร้อยแล้ว
              </p>
            )}
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>ประวัติค่าใช้จ่ายรายเดือนที่บันทึกแล้ว ({expenses.length} เดือน)</span>
            </h4>

            <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-zinc-100">
              {expenses.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 py-4">ยังไม่มีบันทึกค่าใช้จ่ายรายเดือน</p>
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className={`pt-2 flex items-center justify-between text-xs cursor-pointer p-2 rounded-xl transition-colors ${
                      selectedMonth === exp.month ? 'bg-cyan-50/70 border border-cyan-200' : 'hover:bg-zinc-50'
                    }`}
                    onClick={() => handleSelectMonth(exp.month)}
                  >
                    <div>
                      <div className="font-bold text-zinc-900 flex items-center gap-1">
                        <span>เดือน {exp.month}</span>
                        {selectedMonth === exp.month && (
                          <span className="text-[10px] bg-cyan-700 text-white px-1.5 rounded-sm">เลือกอยู่</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        เฉลี่ย ฿{exp.dailyAverageExpense.toLocaleString()}/วัน
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-800 text-xs">
                        ฿{exp.totalMonthlyExpense.toLocaleString()}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecord(exp);
                          }}
                          className="p-1 text-zinc-300 hover:text-rose-600"
                          title="ลบข้อมูลเดือนนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Line Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 leading-tight">
                    เพิ่มรายการค่าใช้จ่ายรายเดือน
                  </h3>
                  <p className="text-xs text-zinc-500">
                    สำหรับประจำเดือน {selectedMonth} (เฉลี่ยรายวันอัตโนมัติ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmAddItemFromModal} className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  หมวดหมู่ค่าใช้จ่าย <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value as MonthlyExpenseCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white font-medium text-zinc-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                >
                  <option value="rent">ค่าเช่าสถานที่ (Rent)</option>
                  <option value="electricity">ค่าไฟฟ้า (Electricity)</option>
                  <option value="water">ค่าน้ำประปา (Water)</option>
                  <option value="depreciation">ค่าเสื่อมราคาอุปกรณ์ (Depreciation)</option>
                  <option value="other">ค่าใช้จ่ายคงที่อื่นๆ (Other Overhead)</option>
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  ชื่อรายการค่าใช้จ่าย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าเช่าพื้นที่หน้าร้าน, ค่าไฟตู้แช่, ค่าเสื่อมเตาปิ้งย่าง"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  ยอดเงินทั้งเดือน (บาท) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-400 font-mono text-xs">฿</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono font-bold bg-white text-zinc-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
                {modalAmount && parseFloat(modalAmount) > 0 && daysInMonth > 0 && (
                  <p className="text-[11px] text-cyan-700 font-medium mt-1">
                    เฉลี่ยต่อวัน: ฿{(parseFloat(modalAmount) / daysInMonth).toFixed(2)} / วัน (คำนวณจาก {daysInMonth} วันในเดือนนี้)
                  </p>
                )}
              </div>

              {/* Bill/Invoice Number */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  เลขที่ใบเสร็จ / ใบแจ้งหนี้ (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น INV-2026-10-01"
                  value={modalBillNumber}
                  onChange={(e) => setModalBillNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <input
                  type="text"
                  placeholder="เช่น ชำระผ่านบัญชีกสิกรไทย, รวมภาษีหัก ณ ที่จ่ายแล้ว"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-900 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  + เพิ่มรายการลงตาราง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
