import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Download,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { DailyWageRecord, WageLineItem } from '../types';
import { saveDailyWages, deleteDailyWages } from '../services/financialService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

interface DailyWagesViewProps {
  wages: DailyWageRecord[];
}

const DEFAULT_STAFF_WAGES: WageLineItem[] = [
  {
    id: 'wage-1',
    staffName: 'เชฟมินโฮ (หัวหน้าครัว)',
    role: 'ครัวร้อน / ปิ้งย่าง',
    wageType: 'daily',
    rate: 650,
    hoursOrUnits: 1,
    otAmount: 100,
    bonusOrAllowance: 50,
    deductions: 0,
    totalWage: 800,
    paymentStatus: 'paid',
  },
  {
    id: 'wage-2',
    staffName: 'สมชาย (ผู้ช่วยครัว)',
    role: 'เตรียมวัตถุดิบ / สไลด์เนื้อ',
    wageType: 'daily',
    rate: 450,
    hoursOrUnits: 1,
    otAmount: 50,
    bonusOrAllowance: 0,
    deductions: 0,
    totalWage: 500,
    paymentStatus: 'paid',
  },
  {
    id: 'wage-3',
    staffName: 'น้องแนน (พนักงานเสิร์ฟ)',
    role: 'หน้าร้าน / บริการลูกค้า',
    wageType: 'daily',
    rate: 400,
    hoursOrUnits: 1,
    otAmount: 0,
    bonusOrAllowance: 30,
    deductions: 0,
    totalWage: 430,
    paymentStatus: 'paid',
  },
  {
    id: 'wage-4',
    staffName: 'น้องกอล์ฟ (พนักงานเสิร์ฟ & แคชเชียร์)',
    role: 'หน้าร้าน / บาร์น้ำ',
    wageType: 'daily',
    rate: 400,
    hoursOrUnits: 1,
    otAmount: 50,
    bonusOrAllowance: 30,
    deductions: 0,
    totalWage: 480,
    paymentStatus: 'paid',
  },
  {
    id: 'wage-5',
    staffName: 'ป้าสมศรี (ทำความสะอาด)',
    role: 'ล้างจาน / ทำความสะอาดเตา',
    wageType: 'daily',
    rate: 380,
    hoursOrUnits: 1,
    otAmount: 0,
    bonusOrAllowance: 0,
    deductions: 0,
    totalWage: 380,
    paymentStatus: 'paid',
  },
];

export const DailyWagesView: React.FC<DailyWagesViewProps> = ({ wages }) => {
  const { currentUser, userProfile, isAdmin } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Form states
  const [items, setItems] = useState<WageLineItem[]>(DEFAULT_STAFF_WAGES);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // History filter
  const [searchDate, setSearchDate] = useState<string>('');

  // Find record for date
  const existingRecordForDate = useMemo(() => {
    return wages.find((w) => w.date === selectedDate);
  }, [wages, selectedDate]);

  const handleSelectDate = (dateVal: string) => {
    setSelectedDate(dateVal);
    const found = wages.find((w) => w.date === dateVal);
    if (found) {
      setItems(found.items);
      setNotes(found.notes || '');
    } else {
      setItems(DEFAULT_STAFF_WAGES.map((w, idx) => ({ ...w, id: `w-${Date.now()}-${idx}` })));
      setNotes('');
    }
    setSaveSuccess(false);
  };

  // Add staff line
  const handleAddStaff = () => {
    const newStaff: WageLineItem = {
      id: `w-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      staffName: '',
      role: 'พนักงานบริการ',
      wageType: 'daily',
      rate: 400,
      hoursOrUnits: 1,
      otAmount: 0,
      bonusOrAllowance: 0,
      deductions: 0,
      totalWage: 400,
      paymentStatus: 'paid',
    };
    setItems((prev) => [...prev, newStaff]);
  };

  // Update staff line
  const handleUpdateStaff = (id: string, field: keyof WageLineItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };

        // Recalculate total wage
        const r = field === 'rate' ? Number(val) || 0 : item.rate;
        const h = field === 'hoursOrUnits' ? Number(val) || 0 : item.hoursOrUnits;
        const ot = field === 'otAmount' ? Number(val) || 0 : item.otAmount;
        const bonus = field === 'bonusOrAllowance' ? Number(val) || 0 : item.bonusOrAllowance;
        const ded = field === 'deductions' ? Number(val) || 0 : item.deductions;

        updated.totalWage = Math.max(0, Math.round((r * h + ot + bonus - ded) * 100) / 100);
        return updated;
      })
    );
  };

  // Remove staff line
  const handleRemoveStaff = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Calculations
  const totalWages = useMemo(() => {
    return items.reduce((sum, curr) => sum + (curr.totalWage || 0), 0);
  }, [items]);

  const totalStaffCount = items.length;

  // Save record
  const handleSave = async () => {
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนบันทึกค่าจ้าง');
      return;
    }

    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการพนักงานอย่างน้อย 1 คน');
      return;
    }

    setIsSaving(true);
    try {
      const recordId = existingRecordForDate ? existingRecordForDate.id : `WAGE-${selectedDate}`;
      const payload: DailyWageRecord = {
        id: recordId,
        date: selectedDate,
        items,
        totalStaffCount,
        totalWages,
        recorderId: currentUser.uid,
        recorderName: userProfile?.displayName || currentUser.displayName || 'พนักงาน',
        notes,
        createdAt: existingRecordForDate ? existingRecordForDate.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveDailyWages(payload);

      await logAudit(
        'SAVE_DAILY_WAGES',
        'wage',
        recordId,
        currentUser.uid,
        currentUser.email || '',
        userProfile?.displayName || 'User',
        `บันทึกค่าจ้างพนักงานวันที่ ${selectedDate} จำนวน ${totalStaffCount} คน รวม ฿${totalWages.toLocaleString()}`
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      alert(`บันทึกค่าจ้างประจำวันที่ ${selectedDate} เรียบร้อยแล้ว (รวม ฿${totalWages.toLocaleString()})`);
    } catch (err: any) {
      console.error('Save wages error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกค่าจ้าง: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete record
  const handleDeleteRecord = async (record: DailyWageRecord) => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถลบข้อมูลค่าจ้างได้');
      return;
    }
    if (!window.confirm(`ยืนยันการลบข้อมูลค่าจ้างวันที่ ${record.date} หรือไม่?`)) return;

    try {
      await deleteDailyWages(record.id);
      if (selectedDate === record.date) {
        handleSelectDate(selectedDate);
      }
      alert('ลบข้อมูลค่าจ้างสำเร็จ');
    } catch (err: any) {
      console.error('Delete wage error:', err);
      alert('ลบข้อมูลไม่สำเร็จ: ' + err.message);
    }
  };

  // Filter history
  const filteredWages = useMemo(() => {
    if (!searchDate) return wages;
    return wages.filter((w) => w.date.includes(searchDate));
  }, [wages, searchDate]);

  // Export CSV
  const exportCsv = () => {
    if (wages.length === 0) {
      alert('ยังไม่มีข้อมูลค่าจ้างสำหรับส่งออก');
      return;
    }

    const headers = ['วันที่', 'จำนวนพนักงาน (คน)', 'ยอดรวมค่าจ้าง (฿)', 'ผู้บันทึก'];
    const rows = wages.map((w) => [
      w.date,
      w.totalStaffCount,
      w.totalWages,
      `"${w.recorderName}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `65Seoul_Daily_Wages_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg sm:text-xl">
            <div className="p-2 rounded-xl bg-indigo-50">
              <Users className="w-5 h-5" />
            </div>
            <span>บันทึกค่าจ้างรายวัน (Daily Staff Wages)</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            บันทึกจำนวนคนและค่าจ้างพนักงานรายวัน ปรับแก้เรทค่าจ้าง ค่าล่วงเวลา (OT) และเบี้ยเลี้ยงได้อย่างอิสระ
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
              className="bg-white px-2.5 py-1 rounded-lg border border-zinc-300 font-bold text-zinc-800 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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

      {/* Main Grid: Staff Form Left (2 Cols), Summary Right (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Staff Table Editor */}
        <div className="lg:col-span-2 space-y-5">
          {existingRecordForDate ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  มีบันทึกค่าจ้างวันที่ <strong>{selectedDate}</strong> แล้ว ({existingRecordForDate.totalStaffCount} คน • รวม ฿{existingRecordForDate.totalWages.toLocaleString()}) สามารถปรับแก้และบันทึกทับได้
                </span>
              </div>
              <span className="text-[11px] text-emerald-700">โดย {existingRecordForDate.recorderName}</span>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                กำลังลงข้อมูลค่าจ้างใหม่สำหรับวันที่ <strong>{selectedDate}</strong>
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-zinc-900">
                  รายชื่อพนักงานและค่าจ้าง ({items.length} คน)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddStaff}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-indigo-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มพนักงาน</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100/80 text-zinc-700 font-bold border-b border-zinc-200">
                  <tr>
                    <th className="p-3 min-w-[150px]">ชื่อพนักงาน</th>
                    <th className="p-3 min-w-[120px]">ตำแหน่ง / หน้าที่</th>
                    <th className="p-3 text-center w-28">ค่าจ้างต่อวัน (฿)</th>
                    <th className="p-3 text-center w-20">OT (฿)</th>
                    <th className="p-3 text-center w-20">เบี้ยเลี้ยง</th>
                    <th className="p-3 text-right w-28">ยอดรวมจ่าย (฿)</th>
                    <th className="p-3 text-center w-12">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60">
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.staffName}
                          onChange={(e) => handleUpdateStaff(item.id, 'staffName', e.target.value)}
                          placeholder="ชื่อ-นามสกุล หรือชื่อเล่น"
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 bg-white"
                        />
                      </td>

                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.role}
                          onChange={(e) => handleUpdateStaff(item.id, 'role', e.target.value)}
                          placeholder="เช่น ครัว, เสิร์ฟ"
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs text-zinc-700 bg-white"
                        />
                      </td>

                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.rate}
                          onChange={(e) => handleUpdateStaff(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-24 text-center font-mono font-bold px-2 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-900"
                        />
                      </td>

                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.otAmount}
                          onChange={(e) => handleUpdateStaff(item.id, 'otAmount', parseFloat(e.target.value) || 0)}
                          className="w-18 text-center font-mono px-2 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-700"
                        />
                      </td>

                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.bonusOrAllowance}
                          onChange={(e) => handleUpdateStaff(item.id, 'bonusOrAllowance', parseFloat(e.target.value) || 0)}
                          className="w-18 text-center font-mono px-2 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white text-zinc-700"
                        />
                      </td>

                      <td className="p-2.5 text-right font-mono font-bold text-xs text-indigo-700">
                        ฿{(item.totalWage || 0).toLocaleString()}
                      </td>

                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveStaff(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Daily Wage Summary & History */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              <span>สรุปค่าจ้างวันที่ {selectedDate}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-zinc-600">
                <span>จำนวนพนักงานที่ทำงาน:</span>
                <span className="font-mono font-bold text-zinc-900 text-sm">{totalStaffCount} คน</span>
              </div>

              <div className="flex justify-between items-center text-zinc-600">
                <span>ค่าจ้างพื้นฐานรวม:</span>
                <span className="font-mono font-bold text-zinc-800">
                  ฿{items.reduce((s, i) => s + (i.rate || 0), 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-600">
                <span>ค่าล่วงเวลา (OT) รวม:</span>
                <span className="font-mono font-bold text-zinc-800">
                  ฿{items.reduce((s, i) => s + (i.otAmount || 0), 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-600">
                <span>เบี้ยเลี้ยง / พิเศษรวม:</span>
                <span className="font-mono font-bold text-zinc-800">
                  ฿{items.reduce((s, i) => s + (i.bonusOrAllowance || 0), 0).toLocaleString()}
                </span>
              </div>

              {/* Total Wage Banner */}
              <div className="bg-indigo-50/80 rounded-xl p-3 border border-indigo-200 flex justify-between items-center">
                <div>
                  <span className="block text-xs font-bold text-indigo-950">รวมค่าจ้างจ่ายจริง:</span>
                  <span className="text-[10px] text-indigo-700">ต้นทุนค่าแรงประจำวัน (Labor Cost)</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold font-mono text-indigo-600">
                    ฿{totalWages.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">หมายเหตุ:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น พนักงานพาร์ทไทม์มาเสริม 2 ท่านช่วงค่ำ..."
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกค่าจ้างวันที่นี้'}</span>
            </button>
            {saveSuccess && (
              <p className="text-center text-xs font-semibold text-emerald-600 animate-pulse">
                ✓ บันทึกค่าจ้างเรียบร้อยแล้ว
              </p>
            )}
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>ประวัติค่าจ้างที่บันทึกแล้ว ({wages.length} วัน)</span>
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
              {filteredWages.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 py-4">ยังไม่มีบันทึกค่าจ้าง</p>
              ) : (
                filteredWages.map((w) => (
                  <div
                    key={w.id}
                    className={`pt-2 flex items-center justify-between text-xs cursor-pointer p-2 rounded-xl transition-colors ${
                      selectedDate === w.date ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-zinc-50'
                    }`}
                    onClick={() => handleSelectDate(w.date)}
                  >
                    <div>
                      <div className="font-bold text-zinc-900 flex items-center gap-1">
                        <span>{w.date}</span>
                        {selectedDate === w.date && (
                          <span className="text-[10px] bg-indigo-600 text-white px-1.5 rounded-sm">เลือกอยู่</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {w.totalStaffCount} คน • {w.recorderName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-600 text-xs">
                        ฿{w.totalWages.toLocaleString()}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecord(w);
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
