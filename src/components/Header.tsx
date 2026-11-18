import React, { useState, useRef, useEffect } from 'react';
import { 
  Boxes, 
  Receipt, 
  ClipboardCheck, 
  LayoutDashboard, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  Smartphone, 
  Laptop, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  TrendingUp, 
  FileText, 
  Users, 
  Building2,
  ChevronDown,
  Menu,
  X,
  Crown,
  Eye,
  Lock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab = 
  | 'dashboard' 
  | 'sales' 
  | 'purchases' 
  | 'purchase-reports' 
  | 'wages' 
  | 'expenses' 
  | 'stock-check' 
  | 'items' 
  | 'admin';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingPurchasesCount: number;
  lowStockCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingPurchasesCount,
  lowStockCount,
}) => {
  const { 
    currentUser, 
    userProfile, 
    isAdmin, 
    signInWithGoogle, 
    signOut, 
    loading,
    authError,
    clearAuthError,
    isInAppBrowser,
    isMobileDevice
  } = useAuth();

  const [showMultiDeviceModal, setShowMultiDeviceModal] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<'finance' | 'purchase' | 'stock' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Determine which dropdown group is currently active
  const isFinanceActive = ['dashboard', 'sales', 'wages', 'expenses'].includes(activeTab);
  const isPurchaseActive = ['purchases', 'purchase-reports'].includes(activeTab);
  const isStockActive = ['stock-check', 'items'].includes(activeTab);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-zinc-200/80">
      {/* In-App Browser Warning (LINE / Facebook) */}
      {isInAppBrowser && !currentUser && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-2 text-xs font-medium">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-950" />
              <span>
                <strong>แจ้งเตือนเปิดผ่านแอป LINE / Facebook:</strong> เพื่อความปลอดภัย แตะปุ่มจุด 3 จุด (⋮ หรือ ...) มุมขวาบน แล้วเลือก <strong>"เปิดในเบราว์เซอร์ภายนอก" (Open in Safari / Chrome)</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-900">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => signInWithGoogle(true)}
                className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] whitespace-nowrap shrink-0"
              >
                เข้าสู่ระบบโหมด Redirect (สำหรับมือถือ)
              </button>
              <button
                onClick={clearAuthError}
                className="text-rose-700 hover:text-rose-900 text-xs px-2 py-1 font-bold whitespace-nowrap shrink-0"
              >
                ✕ ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Left: Clean Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 text-left group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-150">
              <span className="font-display font-extrabold text-sm tracking-tight">65</span>
            </div>
            <span className="font-display font-extrabold text-lg text-zinc-900 tracking-tight whitespace-nowrap group-hover:text-rose-600 transition-colors">
              65 SEOUL
            </span>
          </button>

          {/* Center: Clean Single-Line Navigation */}
          <nav ref={dropdownRef} className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {/* 1. Finance & P&L Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'finance' ? null : 'finance')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isFinanceActive
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <TrendingUp className={`w-4 h-4 ${isFinanceActive ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span>การเงิน & แดชบอร์ด</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${openDropdown === 'finance' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'finance' && (
                <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-zinc-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    หมวดการเงิน & รายได้
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('dashboard');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                      activeTab === 'dashboard' ? 'bg-zinc-100 text-rose-600 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-rose-600" />
                    <div>
                      <div className="font-semibold">แดชบอร์ด & AI ที่ปรึกษา</div>
                      <div className="text-[10px] text-zinc-400">สรุปกำไร-ขาดทุน และวิเคราะห์ CFO</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('sales');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                      activeTab === 'sales' ? 'bg-zinc-100 text-emerald-600 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold">บันทึกยอดขายรายวัน</div>
                      <div className="text-[10px] text-zinc-400">แยกบุฟเฟต์ อาหาร และเครื่องดื่ม</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('wages');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                      activeTab === 'wages' ? 'bg-zinc-100 text-indigo-600 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-semibold">ค่าจ้างรายวัน</div>
                      <div className="text-[10px] text-zinc-400">บันทึกค่าแรงพนักงานและ OT</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('expenses');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                      activeTab === 'expenses' ? 'bg-zinc-100 text-cyan-700 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-cyan-600" />
                    <div>
                      <div className="font-semibold">ค่าใช้จ่ายรายเดือน</div>
                      <div className="text-[10px] text-zinc-400">ค่าน้ำ ค่าไฟ ค่าเช่า ค่าเสื่อม (เฉลี่ยรายวัน)</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Purchasing & Receipts Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'purchase' ? null : 'purchase')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative whitespace-nowrap shrink-0 ${
                  isPurchaseActive
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <Receipt className={`w-4 h-4 ${isPurchaseActive ? 'text-rose-400' : 'text-rose-500'}`} />
                <span>จัดซื้อ & สแกนบิล</span>
                {pendingPurchasesCount > 0 && (
                  <span className="text-[10px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-amber-500 text-white leading-none">
                    {pendingPurchasesCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${openDropdown === 'purchase' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'purchase' && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    จัดซื้อและเอกสารบิล
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('purchases');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2.5 transition-colors ${
                      activeTab === 'purchases' ? 'bg-zinc-100 text-rose-600 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-4 h-4 text-rose-500" />
                      <div>
                        <div className="font-semibold">จัดซื้อ & สแกนบิล OCR</div>
                        <div className="text-[10px] text-zinc-400">ถ่ายรูปบิล อ่านร้านค้าและยอดรวม</div>
                      </div>
                    </div>
                    {pendingPurchasesCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {pendingPurchasesCount} รออนุมัติ
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('purchase-reports');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                      activeTab === 'purchase-reports' ? 'bg-zinc-100 text-rose-600 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    <div>
                      <div className="font-semibold">รายงานบิลจัดซื้อ (Drill-down)</div>
                      <div className="text-[10px] text-zinc-400">ดูรายวัน/สัปดาห์/เดือน เจาะลึกรายบิล</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Stock & Inventory Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'stock' ? null : 'stock')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative whitespace-nowrap shrink-0 ${
                  isStockActive
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <ClipboardCheck className={`w-4 h-4 ${isStockActive ? 'text-amber-400' : 'text-amber-500'}`} />
                <span>สต็อก & วัตถุดิบ</span>
                {lowStockCount > 0 && (
                  <span className="text-[10px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded-full bg-rose-500 text-white leading-none">
                    {lowStockCount}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${openDropdown === 'stock' ? 'rotate-180' : ''}`} />
              </button>

              {openDropdown === 'stock' && (
                <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-zinc-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    ตรวจนับและคลังวัตถุดิบ
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('stock-check');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2.5 transition-colors ${
                      activeTab === 'stock-check' ? 'bg-zinc-100 text-amber-600 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ClipboardCheck className="w-4 h-4 text-amber-500" />
                      <div>
                        <div className="font-semibold">ตรวจนับสต็อกรอบเย็น</div>
                        <div className="text-[10px] text-zinc-400">เช็กยอดคงเหลือก่อนปิดร้าน</div>
                      </div>
                    </div>
                    {lowStockCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        {lowStockCount} ใกล้หมด
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('items');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors ${
                      activeTab === 'items' ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <Boxes className="w-4 h-4 text-zinc-600" />
                    <div>
                      <div className="font-semibold">คลังวัตถุดิบ 173 รายการ</div>
                      <div className="text-[10px] text-zinc-400">ยอดตั้งต้น, Par Level, เพิ่ม/ลบ</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Admin Direct Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setOpenDropdown(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  activeTab === 'admin'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 ${activeTab === 'admin' ? 'text-white' : 'text-rose-500'}`} />
                <span>จัดการระบบ & สิทธิ์</span>
              </button>
            )}
          </nav>

          {/* Right: User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* User Info (Desktop) */}
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 truncate max-w-[130px]">
                      {userProfile?.displayName || currentUser.displayName || 'ผู้ใช้งาน'}
                    </span>
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                        <Crown className="w-2.5 h-2.5" />
                        Master Admin
                      </span>
                    ) : userProfile?.role === 'manager' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600 text-white shadow-xs">
                        Manager
                      </span>
                    ) : userProfile?.role === 'cashier' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-600 text-white shadow-xs">
                        Cashier
                      </span>
                    ) : userProfile?.role === 'viewer' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                        Viewer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        Staff
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">
                    {currentUser.email}
                  </div>
                </div>

                {/* Avatar */}
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-zinc-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                    {currentUser.displayName?.[0] || currentUser.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={signOut}
                  title="ออกจากระบบ"
                  className="p-2 text-zinc-400 hover:text-rose-600 rounded-xl hover:bg-zinc-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signInWithGoogle(false)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </button>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white p-4 space-y-4 animate-in slide-in-from-top-2">
          {/* Section 1: Finance */}
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-2">
              การเงิน & แดชบอร์ด
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'dashboard' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-rose-500" />
                  <span>แดชบอร์ด & AI ที่ปรึกษา</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('sales');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'sales' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>บันทึกยอดขายรายวัน</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('wages');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'wages' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>ค่าจ้างรายวัน</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('expenses');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'expenses' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  <span>ค่าใช้จ่ายรายเดือน (เฉลี่ยรายวัน)</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Purchasing */}
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-2">
              จัดซื้อ & สแกนบิล
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('purchases');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'purchases' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-500" />
                  <span>จัดซื้อ & สแกนบิล OCR</span>
                </div>
                {pendingPurchasesCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white">
                    {pendingPurchasesCount} รออนุมัติ
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('purchase-reports');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'purchase-reports' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>รายงานบิลจัดซื้อ (เจาะลึกรายบิล)</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Stock */}
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 px-2">
              คลัง & ตรวจนับสต็อก
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('stock-check');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'stock-check' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-amber-500" />
                  <span>ตรวจนับสต็อกรอบเย็น</span>
                </div>
                {lowStockCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                    {lowStockCount} ใกล้หมด
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('items');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'items' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-zinc-500" />
                  <span>คลังวัตถุดิบ 173 รายการ</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 4: Admin */}
          {isAdmin && (
            <div className="pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'admin' ? 'bg-rose-600 text-white' : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>จัดการระบบ & อนุมัติสิทธิ์ (Admin)</span>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
