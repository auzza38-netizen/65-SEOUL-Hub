import React, { useState } from 'react';
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
  ArrowRight,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Briefcase,
  Phone,
  UserPlus,
  HelpCircle,
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'google' | 'email_login' | 'email_register';

export const LoginView: React.FC = () => {
  const { 
    signInWithGoogle, 
    signInWithEmail,
    signUpWithEmail,
    loading, 
    authError, 
    clearAuthError, 
    isMobileDevice, 
    isInAppBrowser 
  } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>('google');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  
  // Register Form State
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regPosition, setRegPosition] = useState<string>('พนักงานประจำร้าน');
  const [regPhone, setRegPhone] = useState<string>('');
  const [localFormError, setLocalFormError] = useState<string | null>(null);
  const [registerSuccessMessage, setRegisterSuccessMessage] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalFormError(null);
    clearAuthError();

    if (!loginEmail.trim()) {
      setLocalFormError('กรุณากรอกอีเมล');
      return;
    }
    if (!loginPassword) {
      setLocalFormError('กรุณากรอกรหัสผ่าน');
      return;
    }

    try {
      await signInWithEmail(loginEmail, loginPassword);
    } catch {
      // Error handled by AuthContext
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalFormError(null);
    setRegisterSuccessMessage(null);
    clearAuthError();

    if (!regName.trim()) {
      setLocalFormError('กรุณาระบุชื่อ-นามสกุล หรือชื่อเรียก');
      return;
    }
    if (!regEmail.trim()) {
      setLocalFormError('กรุณาระบุอีเมล');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setLocalFormError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setLocalFormError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      await signUpWithEmail(regEmail, regPassword, regName, regPosition, regPhone);
      setRegisterSuccessMessage('ลงทะเบียนสำเร็จ! ระบบกำลังนำคุณเข้าสู่ขั้นตอนรอการอนุมัติสิทธิ์จาก Master Admin');
    } catch {
      // Error handled by AuthContext
    }
  };

  // Quick preset autofill for convenience
  const handleQuickPreset = (email: string) => {
    setAuthMode('email_login');
    setLoginEmail(email);
    setLoginPassword('');
    setLocalFormError(null);
  };

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
      <main className="relative z-10 max-w-4xl mx-auto w-full px-4 py-6 sm:py-10 flex flex-col items-center">
        {/* Error Notification */}
        {(authError || localFormError) && (
          <div className="w-full max-w-md mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs shadow-xl flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-0.5">แจ้งเตือนการเข้าสู่ระบบ</p>
                <p className="leading-relaxed">{authError || localFormError}</p>
              </div>
            </div>
            <button
              onClick={() => {
                clearAuthError();
                setLocalFormError(null);
              }}
              className="text-rose-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Notification */}
        {registerSuccessMessage && (
          <div className="w-full max-w-md mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 text-xs shadow-xl flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{registerSuccessMessage}</span>
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

          {/* Tab Selector: Google / Email Login / Register */}
          <div className="flex p-1 bg-zinc-950/80 rounded-2xl border border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setAuthMode('google');
                setLocalFormError(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === 'google'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('email_login');
                setLocalFormError(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === 'email_login'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              อีเมล & รหัสผ่าน
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('email_register');
                setLocalFormError(null);
                clearAuthError();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authMode === 'email_register'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ลงทะเบียนพนักงาน
            </button>
          </div>

          {/* MODE 1: Google Login */}
          {authMode === 'google' && (
            <div className="space-y-3.5">
              <button
                type="button"
                onClick={() => signInWithGoogle(false)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white text-zinc-900 font-bold text-sm hover:bg-zinc-100 transition-all shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50"
              >
                {/* Google G Logo SVG */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

              <button
                type="button"
                onClick={() => signInWithGoogle(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs transition-colors border border-zinc-700/60"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>โหมด Redirect (สำหรับมือถือ / แท็บเล็ต)</span>
              </button>

              {/* Quick staff hints */}
              <div className="pt-3 border-t border-zinc-800/60">
                <p className="text-[11px] text-zinc-400 mb-2 font-medium">เข้าสู่ระบบด้วยบัญชีแอดมินหรือพนักงานร้าน:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('auzza38@gmail.com')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 text-rose-300 hover:bg-zinc-700 border border-rose-900/40 flex items-center gap-1"
                  >
                    <Crown className="w-3 h-3 text-rose-400" />
                    auzza38@gmail.com (Master Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('info.65seoulbbqnongkha@gmail.com')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 text-indigo-300 hover:bg-zinc-700 border border-indigo-900/40 flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3 text-indigo-400" />
                    info.65seoulbbqnongkha@gmail.com
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: Email & Password Login */}
          {authMode === 'email_login' && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  อีเมล (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="เช่น user@65seoul.com หรือ gmail"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  รหัสผ่าน (Password)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="กรอกรหัสผ่านของคุณ"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-900/30 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
              </button>

              <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
                <span>ยังไม่มีบัญชีพนักงาน?</span>
                <button
                  type="button"
                  onClick={() => setAuthMode('email_register')}
                  className="text-rose-400 hover:text-rose-300 font-semibold"
                >
                  ลงทะเบียนพนักงานใหม่ →
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: Register New Staff */}
          {authMode === 'email_register' && (
            <form onSubmit={handleEmailRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ชื่อ-นามสกุล / ชื่อเล่น
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี (ต้น)"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    ตำแหน่งงาน
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={regPosition}
                      onChange={(e) => setRegPosition(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                    >
                      <option value="พนักงานประจำร้าน">พนักงานประจำร้าน</option>
                      <option value="ผู้จัดการร้าน">ผู้จัดการร้าน</option>
                      <option value="หัวหน้าครัว / เชฟ">หัวหน้าครัว / เชฟ</option>
                      <option value="พนักงานแคชเชียร์">พนักงานแคชเชียร์</option>
                      <option value="พนักงานจัดซื้อ">พนักงานจัดซื้อ</option>
                      <option value="พนักงานพาร์ทไทม์">พนักงานพาร์ทไทม์</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    เบอร์โทรศัพท์ (ถ้ามี)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="08X-XXX-XXXX"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  อีเมล (ใช้เป็นบัญชีเข้าสู่ระบบ)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="staff@65seoul.com หรืออีเมลส่วนตัว"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    รหัสผ่าน (6+ ตัวอักษร)
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    ยืนยันรหัสผ่าน
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="พิมพ์รหัสผ่านซ้ำอีกครั้ง"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-900/30 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนและส่งคำขออนุมัติ'}</span>
              </button>

              <div className="text-center pt-2 text-xs text-zinc-400">
                <span>มีบัญชีอยู่แล้ว?</span>{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('email_login')}
                  className="text-rose-400 hover:text-rose-300 font-semibold"
                >
                  เข้าสู่ระบบที่นี่
                </button>
              </div>
            </form>
          )}

          {/* Master Admin Approval Notice */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <div className="flex items-start gap-2.5 text-xs text-zinc-400 leading-relaxed bg-zinc-950/50 p-3.5 rounded-2xl border border-zinc-800/60">
              <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-zinc-200 mb-1">
                  การอนุมัติสิทธิ์การเข้าใช้งาน (Approval Policy)
                </p>
                <p className="text-[11px] text-zinc-400">
                  เพื่อความปลอดภัยของข้อมูลร้านอาหาร เมื่อผู้ใช้งานใหม่เข้าสู่ระบบหรือลงทะเบียน บัญชีจะถูกส่งให้ <strong>Master Admin (auzza38@gmail.com)</strong> เป็นผู้อนุมัติและกำหนดสิทธิ์เข้าใช้งาน
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
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
