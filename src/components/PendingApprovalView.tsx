import React, { useState } from 'react';
import { 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  Mail, 
  AlertCircle, 
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useAuth, MASTER_ADMIN_EMAILS } from '../context/AuthContext';

export const PendingApprovalView: React.FC = () => {
  const { currentUser, userProfile, signOut, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const isRejected = userProfile?.status === 'rejected' || userProfile?.status === 'disabled';

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center font-display font-bold text-white text-sm shadow-xs">
              65
            </div>
            <span className="font-display font-extrabold text-lg text-zinc-900 tracking-tight whitespace-nowrap">
              65 SEOUL
            </span>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-500" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm text-center">
          {/* Status Icon */}
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5">
            {isRejected ? (
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                <XCircle className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Heading */}
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
            {isRejected ? 'บัญชีนี้ยังไม่ได้รับสิทธิ์เข้าใช้งาน' : 'รอ Master Admin อนุมัติสิทธิ์'}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-600 mt-2 leading-relaxed">
            {isRejected ? (
              <>
                คำขอเข้าใช้งานสำหรับบัญชีของคุณถูกระงับหรือปฏิเสธ กรุณาติดต่อผู้ดูแลระบบหลักเพื่อตรวจสอบสถานะ
              </>
            ) : (
              <>
                บัญชีของคุณได้รับการลงทะเบียนในระบบเรียบร้อยแล้ว ขณะนี้กำลังรอ <strong>Master Admin</strong> ตรวจสอบและกำหนดสิทธิ์เข้าใช้งาน
              </>
            )}
          </p>

          {/* Current User Card */}
          <div className="my-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 text-left">
            <span className="text-[11px] font-semibold text-zinc-500 block mb-2">
              ข้อมูลบัญชีผู้ใช้งานที่กำลังล็อกอิน
            </span>
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-11 h-11 rounded-2xl object-cover border border-zinc-200"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-zinc-800 text-white font-bold flex items-center justify-center text-sm">
                  {currentUser?.displayName?.[0] || currentUser?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-zinc-900 truncate">
                  {userProfile?.displayName || currentUser?.displayName || 'ผู้ใช้งาน'}
                </div>
                <div className="text-xs text-zinc-500 font-mono truncate">{currentUser?.email}</div>
                <div className={`mt-1 text-xs font-semibold flex items-center gap-1.5 ${
                  isRejected ? 'text-rose-700' : 'text-amber-700'
                }`}>
                  {isRejected ? <XCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{isRejected ? 'ปฏิเสธ / ระงับสิทธิ์' : 'สถานะ · รอการอนุมัติ (Pending)'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Master Admin Contact info */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-left text-xs text-rose-950 mb-6">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">ผู้ดูแลระบบที่สามารถอนุมัติสิทธิ์ (Master Admin):</p>
                <div className="mt-1 space-y-0.5 font-mono text-[11px] text-rose-800">
                  {MASTER_ADMIN_EMAILS.map((email) => (
                    <div key={email}>• {email}</div>
                  ))}
                </div>
                <p className="text-[11px] text-rose-700 mt-1.5 leading-normal">
                  เมื่อ Master Admin กดอนุมัติในหน้า "จัดการระบบ & อนุมัติสิทธิ์" ท่านจะสามารถเข้าถึงระบบได้ทันที
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะอีกครั้ง'}</span>
            </button>

            <button
              type="button"
              onClick={signOut}
              className="px-4 py-3 rounded-2xl border border-zinc-200 bg-white text-zinc-700 font-semibold text-xs hover:bg-zinc-100 transition-colors"
            >
              สลับบัญชี Google อื่น
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-zinc-500 border-t border-zinc-200">
        65 SEOUL | Korean BBQ Restaurant Stock & Purchase Hub
      </footer>
    </div>
  );
};
