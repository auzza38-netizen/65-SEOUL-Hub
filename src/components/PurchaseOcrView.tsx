import React, { useState, useRef, useMemo } from 'react';
import { 
  Receipt, 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Eye, 
  Link as LinkIcon, 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  ArrowRight,
  FileText,
  Clock,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { PurchaseBill, PurchaseLineItem, PurchaseCategoryType, ItemMaster, PurchaseStatus } from '../types';
import { PURCHASE_CATEGORIES } from '../data/masterCatalog173';
import { 
  savePurchaseBill, 
  approvePurchaseBill, 
  rejectPurchaseBill, 
  deletePurchaseBill, 
  checkForDuplicateBill 
} from '../services/purchaseService';
import { logAudit } from '../services/auditService';
import { useAuth } from '../context/AuthContext';

interface PurchaseOcrViewProps {
  items: ItemMaster[];
  purchases: PurchaseBill[];
  onRefresh?: () => void;
  onOpenReports?: () => void;
}

export const PurchaseOcrView: React.FC<PurchaseOcrViewProps> = ({
  items,
  purchases,
  onOpenReports,
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Filter states for list
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // OCR modal & form state
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [billId, setBillId] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState<string>('');
  const [purchaseCategory, setPurchaseCategory] = useState<PurchaseCategoryType>('raw_material');
  const [paymentMethod, setPaymentMethod] = useState<string>('โอนเงิน');
  const [lineItems, setLineItems] = useState<PurchaseLineItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [showReceiptPreviewInModal, setShowReceiptPreviewInModal] = useState<boolean>(true);

  // Helper to pre-process & optimize high-res mobile photos and receipts before OCR upload
  const optimizeImageForOcr = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      // If PDF, read directly
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: reader.result as string, mimeType: 'application/pdf' });
        reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ PDF ได้'));
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Downscale massive smartphone camera photos (e.g. 12MP-48MP from iOS/Android)
          // Max dimension 1800px provides ultra-sharp OCR text clarity while shrinking 15MB+ down to ~350KB-600KB
          const maxDim = 1800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
            return;
          }

          // Fill white background for transparent images
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to high-clarity JPEG at 0.88 quality
          const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);
          resolve({ base64: optimizedBase64, mimeType: 'image/jpeg' });
        };
        img.onerror = () => {
          // Fallback to raw base64 if canvas drawing fails
          resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/jpeg' });
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ภาพได้'));
      reader.readAsDataURL(file);
    });
  };

  // Process file upload / camera capture and send to server-side OCR
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    setIsOcrProcessing(true);
    setOcrStatusText('กำลังเตรียมและปรับขนาดรูปภาพให้คมชัด...');
    setOcrError(null);
    setDuplicateWarning(null);

    try {
      // 1. Optimize image (critical for smooth mobile camera photos)
      const { base64: optimizedBase64, mimeType } = await optimizeImageForOcr(file);
      setReceiptImage(optimizedBase64);
      setOcrStatusText('ระบบ AI กำลังวิเคราะห์ชื่อร้านค้า, รายการสินค้า และยอดรวมสุทธิ...');

      // 2. Call backend /api/ocr endpoint
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: optimizedBase64,
          mimeType,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'การอ่านบิลด้วย OCR ล้มเหลว');
      }

      const parsed = result.data;

      // Safe number parser
      const parseNumeric = (val: any): number => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        const clean = String(val).replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      };

      // Map parsed data to form
      const generatedId = `BILL-${Date.now()}`;
      setBillId(generatedId);
      setBillNumber(parsed.billNumber || `INV-${new Date().getTime().toString().slice(-6)}`);
      setBillDate(parsed.date || new Date().toISOString().split('T')[0]);

      // Supplier / Store Name
      const cleanStoreName = parsed.supplierName && parsed.supplierName !== 'ไม่ระบุ'
        ? parsed.supplierName
        : 'ร้านค้า/ผู้จัดจำหน่าย';
      setSupplierName(cleanStoreName);
      setPurchaseCategory(parsed.category || 'raw_material');
      setPaymentMethod(parsed.paymentMethod || 'เงินสด');

      // Extract line items directly from OCR
      const lines: PurchaseLineItem[] = (parsed.items || []).map((it: any, idx: number) => {
        const q = parseNumeric(it.quantity) || 1;
        let u = parseNumeric(it.unitPrice);
        let lineTotal = parseNumeric(it.totalPrice);
        if (lineTotal <= 0 && u > 0) lineTotal = q * u;
        if (u <= 0 && lineTotal > 0 && q > 0) u = Math.round((lineTotal / q) * 100) / 100;

        return {
          lineId: `line-${idx}-${Date.now()}`,
          itemName: String(it.name || `รายการที่ ${idx + 1}`).trim(),
          quantity: q,
          unit: it.unit ? String(it.unit).trim() : 'หน่วย',
          unitPrice: u,
          totalPrice: lineTotal,
        };
      });

      setLineItems(lines);

      // Calculate subtotal and totalAmount with robust fallback
      const linesSum = lines.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
      const parsedSubtotal = parseNumeric(parsed.subtotal) || linesSum;
      const parsedDiscount = parseNumeric(parsed.discount);
      const parsedTax = parseNumeric(parsed.tax);
      let parsedTotal = parseNumeric(
        parsed.totalAmount ?? 
        parsed.total ?? 
        parsed.grandTotal ?? 
        parsed.netTotal ?? 
        parsed.netAmount
      );

      // Total must never be 0 if items exist
      if (parsedTotal <= 0) {
        parsedTotal = Math.max(0, parsedSubtotal - parsedDiscount + parsedTax);
        if (parsedTotal <= 0 && linesSum > 0) {
          parsedTotal = linesSum;
        }
      }

      setSubtotal(parsedSubtotal);
      setDiscount(parsedDiscount);
      setTax(parsedTax);
      setTotalAmount(parsedTotal);

      // Check for duplicate bill
      if (parsed.billNumber && parsed.supplierName) {
        const isDup = await checkForDuplicateBill(parsed.billNumber, parsed.supplierName);
        if (isDup) {
          setDuplicateWarning(`คำเตือน: พบเลขที่บิล "${parsed.billNumber}" ของ "${parsed.supplierName}" ในระบบแล้ว โปรดตรวจสอบเพื่อป้องกันการบันทึกซ้ำ`);
        }
      }

      setShowReceiptPreviewInModal(true);
      setIsEditorOpen(true);
    } catch (fetchErr: any) {
      console.error('OCR Fetch error:', fetchErr);
      setOcrError(fetchErr.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ OCR');
      // Allow manual creation with the image attached
      initManualBill(receiptImage);
    } finally {
      setIsOcrProcessing(false);
      setOcrStatusText('');
    }
  };

  const initManualBill = (existingImg = '') => {
    const id = `BILL-${Date.now()}`;
    setBillId(id);
    setBillNumber(`INV-${Date.now().toString().slice(-6)}`);
    setBillDate(new Date().toISOString().split('T')[0]);
    setSupplierName('');
    setPurchaseCategory('raw_material');
    setPaymentMethod('โอนเงิน');
    setLineItems([
      {
        lineId: `line-0`,
        itemName: '',
        quantity: 1,
        unit: 'กก.',
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
    setSubtotal(0);
    setDiscount(0);
    setTax(0);
    setTotalAmount(0);
    setReceiptImage(existingImg);
    setNotes('');
    setDuplicateWarning(null);
    setIsEditorOpen(true);
  };

  const handleLineItemChange = (index: number, field: keyof PurchaseLineItem, value: any) => {
    setLineItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        const q = field === 'quantity' ? Number(value) || 0 : target.quantity;
        const p = field === 'unitPrice' ? Number(value) || 0 : target.unitPrice;
        target.totalPrice = Math.round(q * p * 100) / 100;
      }

      next[index] = target;

      // Recalculate subtotal
      const sum = next.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
      setSubtotal(sum);
      setTotalAmount(Math.max(0, sum - discount + tax));

      return next;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        lineId: `line-${Date.now()}`,
        itemName: '',
        quantity: 1,
        unit: 'กก.',
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const sum = next.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
      setSubtotal(sum);
      setTotalAmount(Math.max(0, sum - discount + tax));
      return next;
    });
  };

  const handleSaveBill = async (status: PurchaseStatus) => {
    if (!supplierName.trim()) {
      alert('กรุณาระบุชื่อร้านค้าหรือผู้จำหน่าย');
      return;
    }
    if (lineItems.length === 0) {
      alert('กรุณาระบุรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    try {
      setIsSubmitting(true);
      const billData: PurchaseBill = {
        id: billId,
        billNumber: billNumber.trim() || `BILL-${Date.now()}`,
        date: billDate,
        supplierName: supplierName.trim(),
        category: purchaseCategory,
        paymentMethod,
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        totalAmount: Number(totalAmount) || 0,
        status,
        hasStockApplied: false,
        receiptImageUrl: receiptImage,
        items: lineItems,
        purchaserId: currentUser?.uid || 'user',
        purchaserName: userProfile?.displayName || currentUser?.displayName || 'พนักงาน',
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePurchaseBill(billData);

      if (currentUser) {
        await logAudit(
          'CREATE_PURCHASE_BILL',
          'purchase',
          billId,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'User',
          `สร้างบิลจัดซื้อ ${billNumber} ยอดเงิน ฿${totalAmount.toLocaleString()} จาก ${supplierName}`
        );
      }

      setIsEditorOpen(false);
      alert(
        status === 'approved'
          ? 'บันทึกและอนุมัติบิลจัดซื้อเรียบร้อยแล้ว'
          : 'บันทึกบิลแล้ว ส่งให้ Master Admin เพื่อรอตรวจสอบอนุมัติ'
      );
    } catch (error) {
      console.error('Save bill error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกบิล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectApprove = async (bill: PurchaseBill) => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถอนุมัติบิลได้');
      return;
    }

    const confirmApprove = window.confirm(
      `ยืนยันการอนุมัติบิลจัดซื้อ ${bill.billNumber} (${bill.supplierName}) ยอดรวม ฿${bill.totalAmount.toLocaleString()}?`
    );
    if (!confirmApprove) return;

    try {
      const approverName = userProfile?.displayName || currentUser?.displayName || 'Master Admin';
      const approverId = currentUser?.uid || 'admin';

      await approvePurchaseBill(
        bill,
        approverId,
        approverName,
        items
      );

      if (currentUser) {
        await logAudit(
          'APPROVE_PURCHASE_BILL',
          'purchase',
          bill.id,
          currentUser.uid,
          currentUser.email || '',
          approverName,
          `อนุมัติบิลจัดซื้อ ${bill.billNumber} (฿${bill.totalAmount.toLocaleString()}) เรียบร้อยแล้ว`
        );
      }

      alert(`อนุมัติบิลจัดซื้อ ${bill.billNumber} เรียบร้อยแล้ว!`);
    } catch (error: any) {
      console.error('Approve bill error:', error);
      alert(`เกิดข้อผิดพลาดในการอนุมัติบิล: ${error?.message || 'ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง'}`);
    }
  };

  const handleReject = async (billId: string) => {
    if (!isAdmin) return;
    const reason = prompt('ระบุเหตุผลที่ไม่อนุมัติบิลนี้:');
    if (!reason) return;

    try {
      await rejectPurchaseBill(
        billId,
        currentUser?.uid || 'admin',
        userProfile?.displayName || 'Master Admin',
        reason
      );
      alert('ปฏิเสธบิลเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Reject bill error:', error);
    }
  };

  const handleDelete = async (billId: string) => {
    if (!isAdmin) return;
    if (!confirm('ต้องการลบบิลนี้ออกจากระบบหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;

    try {
      await deletePurchaseBill(billId);
    } catch (error) {
      console.error('Delete bill error:', error);
    }
  };

  // Filtered purchases list
  const filteredPurchases = useMemo(() => {
    return purchases.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchCat = categoryFilter === 'all' || b.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.billNumber.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q) ||
        b.items.some((i) => i.itemName.toLowerCase().includes(q));
      return matchStatus && matchCat && matchSearch;
    });
  }, [purchases, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner & Quick OCR Triggers */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <Receipt className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
                Purchase & Receipt OCR • จัดซื้อและสแกนบิล
              </h1>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              ถ่ายรูปใบเสร็จด้วยมือถือหรืออัปโหลด ระบบ OCR อ่านร้านค้า รายการ จำนวน และยอดรวมอัตโนมัติ
            </p>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hidden native inputs for mobile camera and file picker */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={isOcrProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
              title="เปิดกล้องมือถือถ่ายภาพใบเสร็จทันที"
            >
              <Camera className="w-4 h-4" />
              <span>ถ่ายรูปใบเสร็จ (กล้องมือถือ)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isOcrProcessing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-semibold hover:bg-zinc-50 transition-colors shadow-xs disabled:opacity-50"
              title="เลือกรูปภาพจากคลังรูป หรือไฟล์ PDF"
            >
              <Upload className="w-4 h-4 text-zinc-600" />
              <span>อัปโหลดภาพ / คลังรูป / PDF</span>
            </button>

            <button
              onClick={() => initManualBill()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 text-sm font-semibold hover:bg-zinc-100 transition-colors"
            >
              <Plus className="w-4 h-4 text-zinc-500" />
              <span>สร้างบิลแบบกรอกเอง</span>
            </button>

            {onOpenReports && (
              <button
                onClick={onOpenReports}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-semibold hover:bg-zinc-50 transition-colors shadow-2xs"
                title="เปิดหน้ารายงานบิลจัดซื้อแบบละเอียด"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                <span>รายงานบิลจัดซื้อ</span>
              </button>
            )}
          </div>
        </div>

        {/* Processing State */}
        {isOcrProcessing && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 animate-pulse">
            <Sparkles className="w-5 h-5 text-rose-600 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-900">
                {ocrStatusText || 'กำลังประมวลผล OCR ด้วย Gemini AI ผ่านระบบ Server-side...'}
              </p>
              <p className="text-xs text-rose-700">
                ระบบกำลังอ่านชื่อร้านค้า, รายการสินค้าทั้งหมด, จำนวน, ราคาต่อหน่วย และคำนวณยอดรวมสุทธิอัตโนมัติ
              </p>
            </div>
          </div>
        )}

        {ocrError && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <span>{ocrError} (ท่านสามารถตรวจสอบและกรอกข้อมูลเองในฟอร์มได้)</span>
            <button onClick={() => setOcrError(null)} className="text-amber-600 font-bold">✕</button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar for Bills */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Tabs */}
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            ทั้งหมด ({purchases.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending_approval')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'pending_approval'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>รออนุมัติ ({purchases.filter((p) => p.status === 'pending_approval').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>อนุมัติแล้ว ({purchases.filter((p) => p.status === 'approved').length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="ค้นหาเลขที่บิล, ชื่อร้านค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
          />
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Purchases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPurchases.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-zinc-200 text-zinc-500">
            <Receipt className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
            <p className="font-bold text-zinc-700">ไม่พบรายการบิลจัดซื้อ</p>
            <p className="text-xs text-zinc-400 mt-1">
              กดปุ่ม &quot;ถ่ายรูปใบเสร็จทันที&quot; หรือ &quot;อัปโหลดภาพ&quot; เพื่อเพิ่มบิลเข้าสู่ระบบ
            </p>
          </div>
        ) : (
          filteredPurchases.map((bill) => {
            const categoryMeta = PURCHASE_CATEGORIES.find((c) => c.id === bill.category);
            const linkedItemsCount = bill.items.filter((i) => i.itemId || i.matchedItemCode).length;

            return (
              <div
                key={bill.id}
                className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      {bill.billNumber}
                    </span>
                    {bill.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        อนุมัติแล้ว
                      </span>
                    ) : bill.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3" />
                        ไม่อนุมัติ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        รอ Master Admin อนุมัติ
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <h3 className="font-bold text-base text-zinc-900 truncate">
                      {bill.supplierName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${categoryMeta?.badge || 'bg-zinc-100 text-zinc-700'}`}>
                        {categoryMeta?.label || bill.category}
                      </span>
                      <span className="text-xs text-zinc-600 font-medium">{bill.date}</span>
                    </div>
                  </div>

                  {/* Summary of items */}
                  <div className="mt-3 bg-zinc-50 rounded-xl p-2.5 border border-zinc-200/60 text-xs">
                    <div className="flex justify-between text-zinc-600 mb-1">
                      <span>จำนวนรายการ:</span>
                      <span className="font-semibold text-zinc-800">{bill.items.length} รายการ</span>
                    </div>
                    <div className="flex justify-between text-zinc-600 mb-1">
                      <span>ประเภทบันทึก:</span>
                      <span className="font-semibold text-zinc-700">
                        บิลจัดซื้อ / ค่าใช้จ่ายร้าน
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-900 font-bold pt-1 border-t border-zinc-200">
                      <span>ยอดรวมทั้งสิ้น:</span>
                      <span className="text-rose-600">฿{bill.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls & Receipt Preview Button */}
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {bill.receiptImageUrl && (
                      <button
                        onClick={() => setViewingReceiptUrl(bill.receiptImageUrl || null)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                        title="ดูภาพใบเสร็จ"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                    <span className="text-[11px] text-zinc-600 font-medium">โดย: {bill.purchaserName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && bill.status === 'pending_approval' && (
                      <button
                        onClick={() => handleDirectApprove(bill)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>อนุมัติบิลจัดซื้อ</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                        title="ลบบิล"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bill Editor / Verification Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 leading-tight">
                    ตรวจสอบและยืนยันข้อมูลใบเสร็จ (Verify OCR Data)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    พนักงานต้องตรวจสอบความถูกต้องของรายการและยอดเงินก่อนบันทึกเข้าระบบ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {duplicateWarning && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {/* Bill Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    เลขที่บิล / ใบกำกับ
                  </label>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    วันที่ในใบเสร็จ
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ชื่อร้านค้า / ซัพพลายเออร์
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Makro, ตลาดไท, เบทาโกร..."
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    หมวดหมู่การจัดซื้อ
                  </label>
                  <select
                    value={purchaseCategory}
                    onChange={(e) => setPurchaseCategory(e.target.value as PurchaseCategoryType)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    {PURCHASE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Receipt Image Preview & Cross-check Card */}
              {receiptImage && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-xs font-bold text-zinc-800">
                        ภาพถ่ายใบเสร็จ / บิลที่สแกน
                      </span>
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                        ✓ สแกนข้อมูลอัตโนมัติแล้ว
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReceiptPreviewInModal(!showReceiptPreviewInModal)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        {showReceiptPreviewInModal ? 'ซ่อนภาพตัวอย่าง' : 'แสดงภาพตัวอย่าง'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingReceiptUrl(receiptImage)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        <span>ขยายเต็มจอ</span>
                      </button>
                    </div>
                  </div>

                  {showReceiptPreviewInModal && (
                    <div
                      onClick={() => setViewingReceiptUrl(receiptImage)}
                      className="cursor-pointer border border-zinc-200 rounded-lg overflow-hidden bg-white max-h-64 flex items-center justify-center p-2 hover:border-rose-300 transition-colors relative group"
                      title="คลิกเพื่อขยายดูตัวเลขชัดเจน"
                    >
                      <img
                        src={receiptImage}
                        alt="ใบเสร็จต้นฉบับ"
                        className="max-h-60 object-contain rounded"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-2xs">
                        <Eye className="w-4 h-4" />
                        <span>คลิกเพื่อดูรูปภาพเต็มจอเพื่อเทียบตัวเลข</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    <span>รายการสินค้าในบิล ({lineItems.length} รายการ)</span>
                    <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ บันทึกค่าใช้จ่ายโดยตรง ไม่ต้องผูกรหัสสต็อกร้าน 173
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายการ</span>
                  </button>
                </div>

                <div className="border border-zinc-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                      <tr>
                        <th className="p-2.5">ชื่อสินค้า / วัตถุดิบตามบิล</th>
                        <th className="p-2.5 w-24 text-center">จำนวน</th>
                        <th className="p-2.5 w-24 text-center">หน่วย</th>
                        <th className="p-2.5 w-28 text-right">ราคา/หน่วย (฿)</th>
                        <th className="p-2.5 w-28 text-right">ยอดรวม (฿)</th>
                        <th className="p-2.5 w-12 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {lineItems.map((line, idx) => (
                        <tr key={line.lineId} className="hover:bg-zinc-50">
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="เช่น หมูสามชั้น, ผักกาดหอม, กิมจิ..."
                              value={line.itemName}
                              onChange={(e) => handleLineItemChange(idx, 'itemName', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-xs bg-white font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.quantity}
                              onChange={(e) => handleLineItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 text-center border border-zinc-200 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              placeholder="เช่น กก., แพ็ค"
                              value={line.unit}
                              onChange={(e) => handleLineItemChange(idx, 'unit', e.target.value)}
                              className="w-20 px-2 py-1.5 text-center border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => handleLineItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1.5 text-right border border-zinc-200 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-zinc-900 font-mono">
                            ฿{(line.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              title="ลบแถวนี้"
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

              {/* Totals & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    rows={3}
                    placeholder="ระบุโน้ต เช่น ได้รับของครบถ้วน, รอใบกำกับภาษีฉบับจริง..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="bg-zinc-50 rounded-xl p-3.5 border border-zinc-200 text-xs space-y-2">
                  <div className="flex justify-between items-center text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <span>ยอดรวมสินค้า (Subtotal):</span>
                      <button
                        type="button"
                        onClick={() => {
                          const sum = lineItems.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
                          setSubtotal(sum);
                          setTotalAmount(Math.max(0, sum - discount + tax));
                        }}
                        className="text-[10px] text-rose-600 hover:underline bg-rose-50 px-1.5 py-0.5 rounded font-semibold"
                        title="รวมยอดรายการสินค้าทั้งหมดใหม่"
                      >
                        คำนวณใหม่
                      </button>
                    </div>
                    <span className="font-mono font-semibold">฿{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>ส่วนลด (Discount):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={discount}
                      onChange={(e) => {
                        const d = parseFloat(e.target.value) || 0;
                        setDiscount(d);
                        setTotalAmount(Math.max(0, subtotal - d + tax));
                      }}
                      className="w-28 px-2 py-0.5 text-right border border-zinc-200 rounded bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center text-zinc-600">
                    <span>ภาษีมูลค่าเพิ่ม (VAT):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={tax}
                      onChange={(e) => {
                        const t = parseFloat(e.target.value) || 0;
                        setTax(t);
                        setTotalAmount(Math.max(0, subtotal - discount + t));
                      }}
                      className="w-28 px-2 py-0.5 text-right border border-zinc-200 rounded bg-white text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200 text-sm font-bold text-zinc-900">
                    <div className="flex flex-col">
                      <span>ยอดสุทธิที่ต้องจ่าย (Total Amount):</span>
                      <span className="text-[10px] text-zinc-500 font-normal">* สามารถแก้ไขให้ตรงกับยอดท้ายบิลจริงได้</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500 font-mono">฿</span>
                      <input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                        className="w-32 px-2 py-1 text-right border-2 border-rose-300 focus:border-rose-600 rounded-lg bg-white font-mono font-bold text-base text-rose-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {receiptImage && (
                  <button
                    type="button"
                    onClick={() => setViewingReceiptUrl(receiptImage)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูภาพต้นฉบับ</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveBill('pending_approval')}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 shadow-xs disabled:opacity-50"
                >
                  บันทึกส่งขออนุมัติ
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleSaveBill('approved')}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm disabled:opacity-50"
                  >
                    อนุมัติบิลจัดซื้อทันที (Master Admin)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Receipt Image Viewer */}
      {viewingReceiptUrl && (
        <div 
          onClick={() => setViewingReceiptUrl(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setViewingReceiptUrl(null)}
              className="absolute top-3 right-3 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-black"
            >
              ✕
            </button>
            <img
              src={viewingReceiptUrl}
              alt="Receipt"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
