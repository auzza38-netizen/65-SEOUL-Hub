import React from 'react';
import { 
  LogIn, 
  Smartphone, 
  ShieldCheck, 
  Receipt, 
  TrendingUp, 
  ClipboardCheck, 
  Boxes, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginViewProps {}

export const LoginView: React.FC<LoginViewProps> = () => {
  const { 
    signInWithGoogle, 
    loading, 
    authError, 
    clearAuthError, 
    isMobileDevice, 
    isInAppBrowser 
  } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white flex flex-col justify-between selection:bg-rose-600 selection:text-white">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-rose-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 right-10 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center font-black text-white text-base shadow-lg shadow-rose-900/40 ring-2 ring-rose-500/30">
            65
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">65 SEOUL</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60">
                서울 BBQ
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Stock & Purchase Financial Hub</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Google Auth & Master Admin Approval Gate</span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col items-center">
        {/* Error Notification */}
        {authError && (
          <div className="w-full max-w-md mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs shadow-xl flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">แจ้งเตือนการเข้าสู่ระบบ</p>
                <p className="leading-relaxed">{authError}</p>
              </div>
            </div>
            <button
              onClick={clearAuthError}
              className="text-rose-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* LINE / In-App Browser Advice */}
        {isInAppBrowser && (
          <div className="w-full max-w-md mb-6 p-3.5 rounded-2xl bg-amber-950/70 border border-amber-800/70 text-amber-200 text-xs flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              คุณกำลังเปิดในแอป (LINE/Facebook) หากเข้าสู่ระบบไม่ผ่าน ให้กดปุ่ม <strong>"โหมด Redirect (สำหรับมือถือ)"</strong> หรือเปิดด้วย Chrome/Safari
            </span>
          </div>
        )}

        {/* Login Box */}
        <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              เข้าสู่ระบบ 65 SEOUL
            </h1>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              ระบบบริหารสต็อก จัดซื้อ และวิเคราะห์ผลประกอบการร้านอาหารเกาหลี
            </p>
          </div>

          {/* Login Actions */}
          <div className="space-y-3">
            {/* Primary Google Login Button */}
            <button
              type="button"
              onClick={() => signInWithGoogle(false)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white text-zinc-900 font-bold text-sm hover:bg-zinc-100 transition-all shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50"
            >
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.44 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.56 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google Account'}</span>
            </button>

            {/* Mobile Redirect Option */}
            <button
              type="button"
              onClick={() => signInWithGoogle(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs transition-colors border border-zinc-700/60"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>โหมด Redirect (สำหรับมือถือ / แท็บเล็ต)</span>
            </button>
          </div>

          {/* Master Admin Approval Notice */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <div className="flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800/60">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-200 mb-1">
                  การอนุมัติสิทธิ์การเข้าใช้งาน (Approval Policy)
                </p>
                <p className="text-[11px] text-zinc-400">
                  เพื่อความปลอดภัยของข้อมูลร้านอาหาร เมื่อผู้ใช้งานใหม่เข้าสู่ระบบ บัญชีจะถูกส่งให้ <strong>Master Admin (auzza38@gmail.com)</strong> เป็นผู้อนุมัติและกำหนดสิทธิ์เข้าใช้งาน
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-2.5">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">สแกนบิล OCR อัตโนมัติ</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              ถ่ายรูปใบเสร็จด้วยมือถือ AI สแกนชื่อร้านค้า รายการ จำนวน และยอดรวมอัตโนมัติ
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">บันทึกยอดขาย & ค่าใช้จ่าย</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              แยกยอดบุฟเฟต์ อาหาร ค่าจ้างพนักงาน และเฉลี่ยค่าน้ำ ค่าไฟ ค่าเช่า ค่าเสื่อมเป็นรายวัน
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 text-center sm:text-left flex flex-col items-center sm:items-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">AI ที่ปรึกษาการเงิน CFO</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              วิเคราะห์ Prime Cost, Food Cost, Labor Cost และให้ข้อเสนอแนะกลยุทธ์การทำกำไร
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-4 py-6 text-center text-xs text-zinc-600 border-t border-zinc-900">
        <p className="font-medium text-zinc-500">
          65 SEOUL | ระบบบริหารสต็อก จัดซื้อ และผลประกอบการสำหรับร้านอาหารเกาหลี
        </p>
        <p className="text-[11px] text-zinc-600 mt-0.5">
          เชื่อมต่อ Cloud Firestore • ปลอดภัยด้วย Google Authentication & Master Admin RBAC
        </p>
      </footer>
    </div>
  );
};
