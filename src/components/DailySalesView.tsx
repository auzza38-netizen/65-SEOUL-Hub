import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  UtensilsCrossed, 
  Flame, 
  Coffee, 
  Users, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Download
} from 'lucide-react';
import { DailySalesRecord, SalesLineItem, SalesCategoryType } from '../types';
import { saveDailySales, deleteDailySales } from '../services/financialService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

interface DailySalesViewProps {
  sales: DailySalesRecord[];
}

const DEFAULT_LINE_ITEMS: SalesLineItem[] = [
  {
    id: 'sale-item-1',
    category: 'buffet',
    name: 'บุฟเฟต์ปิ้งย่างเกาหลี Standard (ผู้ใหญ่)',
    quantity: 35,
    unitPrice: 289,
    totalPrice: 10115,
    notes: 'บุฟเฟต์ปิ้งย่างเกาหลี Standard 289 บาท',
  },
  {
    id: 'sale-item-2',
    category: 'buffet',
    name: 'บุฟเฟต์เด็ก (ความสูง 100-130 ซม.)',
    quantity: 4,
    unitPrice: 159,
    totalPrice: 636,
    notes: 'บุฟเฟต์เด็ก 159 บาท',
  },
  {
    id: 'sale-item-3',
    category: 'food',
    name: 'กุ้งดองซีอิ๊วเกาหลี',
    quantity: 10,
    unitPrice: 89,
    totalPrice: 890,
    notes: '89 บาท',
  },
  {
    id: 'sale-item-4',
    category: 'food',
    name: 'ชีส',
    quantity: 12,
    unitPrice: 39,
    totalPrice: 468,
    notes: '39 บาท',
  },
  {
    id: 'sale-item-5',
    category: 'food',
    name: 'ข้าวโพดชีส',
    quantity: 8,
    unitPrice: 29,
    totalPrice: 232,
    notes: '29 บาท',
  },
  {
    id: 'sale-item-6',
    category: 'food',
    name: 'สาหร่าย',
    quantity: 15,
    unitPrice: 20,
    totalPrice: 300,
    notes: '20 บาท',
  },
  {
    id: 'sale-item-7',
    category: 'other',
    name: 'โซจู รสพีช / องุ่นเขียว',
    quantity: 8,
    unitPrice: 160,
    totalPrice: 1280,
    notes: '',
  },
];

export const DailySalesView: React.FC<DailySalesViewProps> = ({ sales }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Form states
  const [items, setItems] = useState<SalesLineItem[]>(DEFAULT_LINE_ITEMS);
  const [discount, setDiscount] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(57);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Search & history filter
  const [searchDate, setSearchDate] = useState<string>('');

  // Load existing sales record for selected date if available
  const existingRecordForDate = useMemo(() => {
    return sales.find((s) => s.date === selectedDate);
  }, [sales, selectedDate]);

  // When date changes, populate or reset
  const handleSelectDate = (dateVal: string) => {
    setSelectedDate(dateVal);
    const found = sales.find((s) => s.date === dateVal);
    if (found) {
      setItems(found.items);
      setDiscount(found.discount || 0);
      setCustomerCount(found.customerCount || 0);
      setNotes(found.notes || '');
    } else {
      // fresh template
      setItems(DEFAULT_LINE_ITEMS.map((item, idx) => ({ ...item, id: `item-${Date.now()}-${idx}` })));
      setDiscount(0);
      setCustomerCount(50);
      setNotes('');
    }
    setSaveSuccess(false);
  };

  // Calculations
  const buffetTotal = useMemo(() => {
    return items
      .filter((i) => i.category === 'buffet')
      .reduce((sum, curr) => sum + (curr.totalPrice || 0), 0);
  }, [items]);

  const foodTotal = useMemo(() => {
    return items
      .filter((i) => i.category === 'food')
      .reduce((sum, curr) => sum + (curr.totalPrice || 0), 0);
  }, [items]);

  const otherTotal = useMemo(() => {
    return items
      .filter((i) => i.category === 'other')
      .reduce((sum, curr) => sum + (curr.totalPrice || 0), 0);
  }, [items]);

  const grossSales = buffetTotal + foodTotal + otherTotal;
  const netSales = Math.max(0, grossSales - (discount || 0));

  // Add line item
  const handleAddItem = (category: SalesCategoryType) => {
    const defaultName =
      category === 'buffet'
        ? 'บุฟเฟต์ปิ้งย่างเกาหลี Standard (ผู้ใหญ่)'
        : category === 'food'
        ? 'กุ้งดองซีอิ๊วเกาหลี'
        : 'เครื่องดื่ม/สินค้าอื่นๆ';
    const defaultPrice = category === 'buffet' ? 289 : category === 'food' ? 89 : 100;
    const newItem: SalesLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      name: defaultName,
      quantity: 1,
      unitPrice: defaultPrice,
      totalPrice: defaultPrice,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Quick Add Preset Item
  const handleQuickAddPreset = (category: SalesCategoryType, name: string, unitPrice: number) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.category === category && i.name === name);
      if (existingIdx >= 0) {
        return prev.map((item, idx) => {
          if (idx !== existingIdx) return item;
          const newQty = (item.quantity || 0) + 1;
          return {
            ...item,
            quantity: newQty,
            totalPrice: Math.round(newQty * item.unitPrice * 100) / 100,
          };
        });
      }
      const newItem: SalesLineItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category,
        name,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
      };
      return [...prev, newItem];
    });
  };

  // Update line item
  const handleUpdateItem = (id: string, field: keyof SalesLineItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === 'quantity' || field === 'unitPrice') {
          const q = field === 'quantity' ? Number(val) || 0 : item.quantity;
          const p = field === 'unitPrice' ? Number(val) || 0 : item.unitPrice;
          updated.totalPrice = Math.round(q * p * 100) / 100;
        }
        return updated;
      })
    );
  };

  // Remove line item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Save record
  const handleSave = async () => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูลยอดขาย');
      return;
    }

    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการยอดขายอย่างน้อย 1 รายการ');
      return;
    }

    setIsSaving(true);
    try {
      const recordId = existingRecordForDate ? existingRecordForDate.id : `SALES-${selectedDate}`;
      const payload: DailySalesRecord = {
        id: recordId,
        date: selectedDate,
        items,
        buffetTotal,
        foodTotal,
        otherTotal,
        grossSales,
        discount,
        netSales,
        customerCount,
        recorderId: currentUser.uid,
        recorderName: userProfile?.displayName || currentUser.displayName || 'พนักงาน',
        notes,
        createdAt: existingRecordForDate ? existingRecordForDate.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveDailySales(payload);

      await logAudit(
        'SAVE_DAILY_SALES',
        'sale',
        recordId,
        currentUser.uid,
        currentUser.email || '',
        userProfile?.displayName || 'User',
        `บันทึกยอดขายประจำวันที่ ${selectedDate} ยอดสุทธิ ฿${netSales.toLocaleString()}`
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert(`บันทึกยอดขายวันที่ ${selectedDate} เรียบร้อยแล้ว (ยอดสุทธิ ฿${netSales.toLocaleString()})`);
    } catch (err: any) {
      console.error('Save daily sales error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกยอดขาย: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete record
  const handleDeleteRecord = async (record: DailySalesRecord) => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถลบข้อมูลยอดขายได้');
      return;
    }
    if (!window.confirm(`ยืนยันการลบข้อมูลยอดขายวันที่ ${record.date} หรือไม่?`)) return;

    try {
      await deleteDailySales(record.id);
      if (selectedDate === record.date) {
        handleSelectDate(selectedDate);
      }
      alert('ลบข้อมูลยอดขายสำเร็จ');
    } catch (err: any) {
      console.error('Delete sales error:', err);
      alert('ลบข้อมูลไม่สำเร็จ: ' + err.message);
    }
  };

  // Filter history
  const filteredSales = useMemo(() => {
    if (!searchDate) return sales;
    return sales.filter((s) => s.date.includes(searchDate));
  }, [sales, searchDate]);

  // Export CSV
  const exportCsv = () => {
    if (sales.length === 0) {
      alert('ยังไม่มีข้อมูลยอดขายสำหรับส่งออก');
      return;
    }

    const headers = ['วันที่', 'ยอดขายบุฟเฟต์ (฿)', 'ยอดขายอาหาร (฿)', 'ยอดขายอื่นๆ (฿)', 'ยอดรวมก่อนลด (฿)', 'ส่วนลด (฿)', 'ยอดขายสุทธิ (฿)', 'จำนวนลูกค้า', 'ผู้บันทึก'];
    const rows = sales.map((s) => [
      s.date,
      s.buffetTotal || 0,
      s.foodTotal || 0,
      s.otherTotal || 0,
      s.grossSales || 0,
      s.discount || 0,
      s.netSales || 0,
      s.customerCount || 0,
      `"${s.recorderName}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `65Seoul_Daily_Sales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-lg sm:text-xl">
            <div className="p-2 rounded-xl bg-rose-50">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span>บันทึกยอดขายประจำวัน (Daily Sales Records)</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            บันทึกและแยกหมวดหมู่รายรับ: บุฟเฟต์, อาหาร A la carte, และเครื่องดื่ม/อื่นๆ สามารถเพิ่ม/ลดรายการได้ตามจริง
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="font-semibold text-zinc-700 whitespace-nowrap">เลือกวันที่:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleSelectDate(e.target.value)}
              className="bg-white px-2.5 py-1 rounded-lg border border-zinc-300 font-bold text-zinc-800 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
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

      {/* Main Grid: Form Left, Summary & History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Dynamic Line Items Editor */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Notice if Existing Record */}
          {existingRecordForDate ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  พบข้อมูลยอดขายที่บันทึกแล้วของวันที่ <strong>{selectedDate}</strong> (ยอดสุทธิ ฿{existingRecordForDate.netSales.toLocaleString()}) ท่านสามารถแก้ไขและบันทึกทับได้
                </span>
              </div>
              <span className="text-[11px] text-emerald-700">โดย {existingRecordForDate.recorderName}</span>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                กำลังลงข้อมูลยอดขายใหม่สำหรับวันที่ <strong>{selectedDate}</strong>
              </span>
            </div>
          )}

          {/* 1. Buffet Category Section */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-rose-50/70 border-b border-rose-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-zinc-900">
                  1. ยอดขายจากบุฟเฟต์ (Buffet Sales)
                </h3>
                <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                  ฿{buffetTotal.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem('buffet')}
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-white border border-rose-200 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-rose-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มแพ็กเกจบุฟเฟต์</span>
              </button>
            </div>

            {/* Quick Presets for Buffet */}
            <div className="px-4 py-2 bg-rose-50/30 border-b border-rose-100/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500 font-medium text-[11px]">เลือกเมนูด่วน:</span>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('buffet', 'บุฟเฟต์ปิ้งย่างเกาหลี Standard (ผู้ใหญ่)', 289)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-900 font-bold text-[11px] shadow-2xs transition-colors"
              >
                + บุฟเฟต์ Standard (289฿)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('buffet', 'บุฟเฟต์เด็ก (ความสูง 100-130 ซม.)', 159)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-900 font-bold text-[11px] shadow-2xs transition-colors"
              >
                + บุฟเฟต์เด็ก (159฿)
              </button>
            </div>

            <div className="divide-y divide-zinc-100">
              {items.filter((i) => i.category === 'buffet').length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">ยังไม่มีรายการบุฟเฟต์ กดปุ่ม "เพิ่มแพ็กเกจบุฟเฟต์"</div>
              ) : (
                items
                  .filter((i) => i.category === 'buffet')
                  .map((item) => (
                    <div key={item.id} className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-2.5 hover:bg-zinc-50/50">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="ชื่อแพ็กเกจบุฟเฟต์"
                          className="w-full text-xs font-semibold text-zinc-900 px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500">จำนวน:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 text-xs font-bold text-center px-2 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                        <span className="text-[11px] text-zinc-500">หัว</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500">ราคา:</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 text-xs font-mono text-right px-2 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                        <span className="text-[11px] text-zinc-500">฿</span>
                      </div>
                      <div className="w-24 text-right font-mono font-bold text-xs text-zinc-900">
                        ฿{(item.totalPrice || 0).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* 2. Food (A la carte) Category Section */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-zinc-900">
                  2. ยอดขายอาหารจานเดียว / สั่งเพิ่ม (A la carte Food)
                </h3>
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                  ฿{foodTotal.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem('food')}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-white border border-amber-200 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-amber-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายการอาหาร</span>
              </button>
            </div>

            {/* Quick Presets for A la carte Food */}
            <div className="px-4 py-2 bg-amber-50/30 border-b border-amber-100/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500 font-medium text-[11px]">เลือกเมนูด่วน:</span>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('food', 'กุ้งดองซีอิ๊วเกาหลี', 89)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 font-bold text-[11px] shadow-2xs transition-colors"
              >
                + กุ้งดองซีอิ๊วเกาหลี (89฿)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('food', 'ชีส', 39)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 font-bold text-[11px] shadow-2xs transition-colors"
              >
                + ชีส (39฿)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('food', 'ข้าวโพดชีส', 29)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 font-bold text-[11px] shadow-2xs transition-colors"
              >
                + ข้าวโพดชีส (29฿)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddPreset('food', 'สาหร่าย', 20)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 hover:bg-amber-50 text-amber-900 font-bold text-[11px] shadow-2xs transition-colors"
              >
                + สาหร่าย (20฿)
              </button>
            </div>

            <div className="divide-y divide-zinc-100">
              {items.filter((i) => i.category === 'food').length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">ยังไม่มีรายการอาหารจานเดี่ยว (ถ้ามีกดปุ่มเพิ่ม)</div>
              ) : (
                items
                  .filter((i) => i.category === 'food')
                  .map((item) => (
                    <div key={item.id} className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-2.5 hover:bg-zinc-50/50">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="ชื่อเมนูอาหาร เช่น ซุปกิมจิ, ไก่ทอดเกาหลี"
                          className="w-full text-xs font-semibold text-zinc-900 px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500">จำนวน:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 text-xs font-bold text-center px-2 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                        <span className="text-[11px] text-zinc-500">จาน</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500">ราคา:</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 text-xs font-mono text-right px-2 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                        <span className="text-[11px] text-zinc-500">฿</span>
                      </div>
                      <div className="w-24 text-right font-mono font-bold text-xs text-zinc-900">
                        ฿{(item.totalPrice || 0).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* 3. Other Category Section (Beverages, Alcohol, Others) */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-sm text-zinc-900">
                  3. ยอดขายเครื่องดื่ม & อื่นๆ (Beverages, Soju & Others)
                </h3>
                <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                  ฿{otherTotal.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddItem('other')}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 hover:text-sky-900 bg-white border border-sky-200 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-sky-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายการเครื่องดื่ม/อื่นๆ</span>
              </button>
            </div>

            <div className="divide-y divide-zinc-100">
              {items.filter((i) => i.category === 'other').length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">ยังไม่มีรายการเครื่องดื่ม/อื่นๆ</div>
              ) : (
                items
                  .filter((i) => i.category === 'other')
                  .map((item) => (
                    <div key={item.id} className="p-3 flex flex-wrap sm:flex-nowrap items-center gap-2.5 hover:bg-zinc-50/50">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="ชื่อสินค้า เช่น โซจู, ชาข้าวโพด, ขนมเกาหลี"
                          className="w-full text-xs font-semibold text-zinc-900 px-2.5 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500">จำนวน:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 text-xs font-bold text-center px-2 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                        <span className="text-[11px] text-zinc-500">หน่วย</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500">ราคา:</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 text-xs font-mono text-right px-2 py-1.5 border border-zinc-200 rounded-lg bg-white"
                        />
                        <span className="text-[11px] text-zinc-500">฿</span>
                      </div>
                      <div className="w-24 text-right font-mono font-bold text-xs text-zinc-900">
                        ฿{(item.totalPrice || 0).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Daily Summary & Save & History */}
        <div className="space-y-5">
          {/* Summary Box */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              <span>สรุปยอดขายวันที่ {selectedDate}</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-zinc-600">
                <span>ยอดขายบุฟเฟต์:</span>
                <span className="font-mono font-bold text-zinc-800">฿{buffetTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-600">
                <span>ยอดขายอาหาร A la carte:</span>
                <span className="font-mono font-bold text-zinc-800">฿{foodTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-600">
                <span>ยอดขายเครื่องดื่ม & อื่นๆ:</span>
                <span className="font-mono font-bold text-zinc-800">฿{otherTotal.toLocaleString()}</span>
              </div>
              <div className="border-t border-zinc-100 pt-2 flex justify-between items-center text-zinc-700 font-semibold">
                <span>ยอดรวมก่อนหักส่วนลด:</span>
                <span className="font-mono">฿{grossSales.toLocaleString()}</span>
              </div>

              {/* Discount Input */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-600">ส่วนลดโปรโมชั่น (฿):</span>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right px-2 py-1 border border-zinc-200 rounded-lg text-xs font-mono bg-white"
                />
              </div>

              {/* Customer Count */}
              <div className="flex justify-between items-center">
                <span className="text-zinc-600 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>จำนวนลูกค้า (คน):</span>
                </span>
                <input
                  type="number"
                  min="0"
                  value={customerCount}
                  onChange={(e) => setCustomerCount(parseInt(e.target.value, 10) || 0)}
                  className="w-24 text-right px-2 py-1 border border-zinc-200 rounded-lg text-xs font-mono bg-white"
                />
              </div>

              {/* Grand Net Total */}
              <div className="bg-rose-50/80 rounded-xl p-3 border border-rose-200 flex justify-between items-center">
                <div>
                  <span className="block text-xs font-bold text-rose-950">ยอดขายสุทธิ (Net Sales):</span>
                  <span className="text-[10px] text-rose-700">เข้าบัญชีรายรับร้าน</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold font-mono text-rose-600">
                    ฿{netSales.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">หมายเหตุประจำวัน:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น ลูกค้าแน่นช่วงค่ำ, จัดเลี้ยงกลุ่ม 15 ท่าน..."
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกยอดขายวันที่นี้'}</span>
            </button>
            {saveSuccess && (
              <p className="text-center text-xs font-semibold text-emerald-600 animate-pulse">
                ✓ บันทึกยอดขายเรียบร้อยแล้ว
              </p>
            )}
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>ประวัติยอดขายที่บันทึกแล้ว ({sales.length} วัน)</span>
              </h4>
              <div className="relative w-28">
                <input
                  type="text"
                  placeholder="ค้นหาวันที่..."
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full pl-6 pr-2 py-1 text-[11px] border border-zinc-200 rounded-lg bg-white"
                />
                <Search className="w-3 h-3 text-zinc-400 absolute left-2 top-2" />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-zinc-100">
              {filteredSales.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 py-4">ยังไม่มีบันทึกยอดขาย</p>
              ) : (
                filteredSales.map((s) => (
                  <div
                    key={s.id}
                    className={`pt-2 flex items-center justify-between text-xs cursor-pointer p-2 rounded-xl transition-colors ${
                      selectedDate === s.date ? 'bg-rose-50/70 border border-rose-200' : 'hover:bg-zinc-50'
                    }`}
                    onClick={() => handleSelectDate(s.date)}
                  >
                    <div>
                      <div className="font-bold text-zinc-900 flex items-center gap-1">
                        <span>{s.date}</span>
                        {selectedDate === s.date && (
                          <span className="text-[10px] bg-rose-600 text-white px-1.5 rounded-sm">เลือกอยู่</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {s.customerCount ? `${s.customerCount} คน` : ''} • {s.recorderName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-600 text-xs">
                        ฿{s.netSales.toLocaleString()}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecord(s);
                          }}
                          className="p-1 text-zinc-300 hover:text-rose-600"
                          title="ลบข้อมูลวันนี้"
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
    </div>
  );
};
