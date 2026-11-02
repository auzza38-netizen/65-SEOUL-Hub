import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Receipt, 
  ClipboardCheck, 
  Boxes, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Users,
  Building2,
  Droplets,
  Zap,
  Home,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  PieChart,
  HelpCircle,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
import { 
  ItemMaster, 
  StockCheckSession, 
  PurchaseBill, 
  DailySalesRecord, 
  DailyWageRecord, 
  MonthlyExpenseRecord,
  FinancialAnalysisResult 
} from '../types';
import { ActiveTab } from './Header';
import { requestAiFinancialAnalysis } from '../services/financialService';
import { useAuth } from '../context/AuthContext';
import { InfographicFinancialCharts } from './InfographicFinancialCharts';

interface DashboardViewProps {
  items: ItemMaster[];
  stockChecks: StockCheckSession[];
  purchases: PurchaseBill[];
  sales?: DailySalesRecord[];
  wages?: DailyWageRecord[];
  expenses?: MonthlyExpenseRecord[];
  setActiveTab: (tab: ActiveTab) => void;
}

type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

export const DashboardView: React.FC<DashboardViewProps> = ({
  items,
  stockChecks,
  purchases,
  sales = [],
  wages = [],
  expenses = [],
  setActiveTab,
}) => {
  const { isAdmin } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
  const currentYearStr = todayStr.substring(0, 4); // YYYY

  // Dashboard Period Filter: day, week, month, year
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('day');
  const [targetDate, setTargetDate] = useState<string>(todayStr);

  // AI Advisor state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<FinancialAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Week range helper
  const weekRange = useMemo(() => {
    const now = new Date(targetDate);
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    const sunday = new Date(now.setDate(monday.getDate() + 6));
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  }, [targetDate]);

  // Current target month days count
  const targetMonthStr = targetDate.slice(0, 7);
  const targetYearStr = targetDate.slice(0, 4);

  const daysInTargetMonth = useMemo(() => {
    const [y, m] = targetMonthStr.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  }, [targetMonthStr]);

  // 1. Stock check status today (Evening shift only)
  const todayStockChecks = useMemo(() => {
    return stockChecks.filter((s) => s.date === targetDate);
  }, [stockChecks, targetDate]);

  const hasEveningCheck = todayStockChecks.some((s) => s.shift === 'evening' || s.shift === 'night');

  // 2. Urgent items: Out of stock & Need purchase
  const urgentItems = useMemo(() => {
    return items
      .filter((i) => i.status === 'active' && i.currentStock <= i.minStock)
      .sort((a, b) => a.currentStock / (a.minStock || 1) - b.currentStock / (b.minStock || 1));
  }, [items]);

  // 3. FINANCIAL CALCULATIONS (Day / Week / Month / Year)
  const financialMetrics = useMemo(() => {
    // A. Filter Sales
    const filteredSales = sales.filter((s) => {
      if (selectedPeriod === 'day') return s.date === targetDate;
      if (selectedPeriod === 'week') return s.date >= weekRange.start && s.date <= weekRange.end;
      if (selectedPeriod === 'month') return s.date.startsWith(targetMonthStr);
      if (selectedPeriod === 'year') return s.date.startsWith(targetYearStr);
      return true;
    });

    const buffetSales = filteredSales.reduce((acc, curr) => acc + (curr.buffetTotal || 0), 0);
    const foodSales = filteredSales.reduce((acc, curr) => acc + (curr.foodTotal || 0), 0);
    const otherSales = filteredSales.reduce((acc, curr) => acc + (curr.otherTotal || 0), 0);
    const grossSales = filteredSales.reduce((acc, curr) => acc + (curr.grossSales || 0), 0);
    const discountTotal = filteredSales.reduce((acc, curr) => acc + (curr.discount || 0), 0);
    const netSales = filteredSales.reduce((acc, curr) => acc + (curr.netSales || 0), 0);
    const customerCount = filteredSales.reduce((acc, curr) => acc + (curr.customerCount || 0), 0);

    // B. Filter Purchases (Approved only)
    const approvedPurchases = purchases.filter((p) => p.status === 'approved');
    const filteredPurchases = approvedPurchases.filter((p) => {
      if (selectedPeriod === 'day') return p.date === targetDate;
      if (selectedPeriod === 'week') return p.date >= weekRange.start && p.date <= weekRange.end;
      if (selectedPeriod === 'month') return p.date.startsWith(targetMonthStr);
      if (selectedPeriod === 'year') return p.date.startsWith(targetYearStr);
      return true;
    });

    const purchaseTotal = filteredPurchases.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);

    // C. Filter Wages
    const filteredWages = wages.filter((w) => {
      if (selectedPeriod === 'day') return w.date === targetDate;
      if (selectedPeriod === 'week') return w.date >= weekRange.start && w.date <= weekRange.end;
      if (selectedPeriod === 'month') return w.date.startsWith(targetMonthStr);
      if (selectedPeriod === 'year') return w.date.startsWith(targetYearStr);
      return true;
    });

    const wagesTotal = filteredWages.reduce((acc, curr) => acc + (curr.totalWages || 0), 0);
    const staffCount = filteredWages.length > 0 
      ? Math.round(filteredWages.reduce((acc, curr) => acc + curr.totalStaffCount, 0) / filteredWages.length) 
      : 0;

    // D. Monthly Expenses & Daily Averaged Overhead
    // CRITICAL: "โดย ค่าน้ำ ค่าไฟ ค่าเช่าสถานที่ ค่าเสื่อมราคา ให้ระบบเอายอดมาเฉลี่ยเป็นรายวันให้ด้วย"
    const targetMonthExpense = expenses.find((e) => e.month === targetMonthStr);
    const monthTotalExpense = targetMonthExpense ? targetMonthExpense.totalMonthlyExpense : 0;
    const dailyAvgOverhead = targetMonthExpense ? targetMonthExpense.dailyAverageExpense : (monthTotalExpense / (daysInTargetMonth || 30));

    let overheadTotal = 0;
    let waterAllocated = 0;
    let electricityAllocated = 0;
    let rentAllocated = 0;
    let depreciationAllocated = 0;

    if (selectedPeriod === 'day') {
      overheadTotal = dailyAvgOverhead;
      if (targetMonthExpense && daysInTargetMonth > 0) {
        waterAllocated = targetMonthExpense.waterTotal / daysInTargetMonth;
        electricityAllocated = targetMonthExpense.electricityTotal / daysInTargetMonth;
        rentAllocated = targetMonthExpense.rentTotal / daysInTargetMonth;
        depreciationAllocated = targetMonthExpense.depreciationTotal / daysInTargetMonth;
      }
    } else if (selectedPeriod === 'week') {
      overheadTotal = dailyAvgOverhead * 7;
      if (targetMonthExpense && daysInTargetMonth > 0) {
        waterAllocated = (targetMonthExpense.waterTotal / daysInTargetMonth) * 7;
        electricityAllocated = (targetMonthExpense.electricityTotal / daysInTargetMonth) * 7;
        rentAllocated = (targetMonthExpense.rentTotal / daysInTargetMonth) * 7;
        depreciationAllocated = (targetMonthExpense.depreciationTotal / daysInTargetMonth) * 7;
      }
    } else if (selectedPeriod === 'month') {
      overheadTotal = monthTotalExpense;
      if (targetMonthExpense) {
        waterAllocated = targetMonthExpense.waterTotal;
        electricityAllocated = targetMonthExpense.electricityTotal;
        rentAllocated = targetMonthExpense.rentTotal;
        depreciationAllocated = targetMonthExpense.depreciationTotal;
      }
    } else if (selectedPeriod === 'year') {
      // sum all monthly expenses in targetYearStr
      const yearExpenses = expenses.filter((e) => e.month.startsWith(targetYearStr));
      overheadTotal = yearExpenses.reduce((acc, curr) => acc + curr.totalMonthlyExpense, 0);
      waterAllocated = yearExpenses.reduce((acc, curr) => acc + curr.waterTotal, 0);
      electricityAllocated = yearExpenses.reduce((acc, curr) => acc + curr.electricityTotal, 0);
      rentAllocated = yearExpenses.reduce((acc, curr) => acc + curr.rentTotal, 0);
      depreciationAllocated = yearExpenses.reduce((acc, curr) => acc + curr.depreciationTotal, 0);
    }

    // E. Total Operating Costs & Net Profit
    const totalOperatingCost = purchaseTotal + wagesTotal + overheadTotal;
    const netProfit = netSales - totalOperatingCost;
    const profitMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

    // F. Key Ratios
    const foodCostPct = netSales > 0 ? (purchaseTotal / netSales) * 100 : 0;
    const laborCostPct = netSales > 0 ? (wagesTotal / netSales) * 100 : 0;
    const overheadPct = netSales > 0 ? (overheadTotal / netSales) * 100 : 0;
    const primeCostPct = foodCostPct + laborCostPct;

    return {
      netSales,
      buffetSales,
      foodSales,
      otherSales,
      grossSales,
      discountTotal,
      customerCount,
      purchaseTotal,
      wagesTotal,
      staffCount,
      overheadTotal,
      dailyAvgOverhead,
      waterAllocated,
      electricityAllocated,
      rentAllocated,
      depreciationAllocated,
      totalOperatingCost,
      netProfit,
      profitMargin,
      foodCostPct,
      laborCostPct,
      overheadPct,
      primeCostPct,
    };
  }, [
    sales,
    purchases,
    wages,
    expenses,
    selectedPeriod,
    targetDate,
    weekRange,
    targetMonthStr,
    targetYearStr,
    daysInTargetMonth,
  ]);

  // Handle AI analysis trigger
  const handleRunAiAnalysis = async () => {
    setIsAnalyzingAi(true);
    setAiError(null);

    const periodLabels: Record<DashboardPeriod, string> = {
      day: `รายวัน (${targetDate})`,
      week: `รายสัปดาห์ (${weekRange.start} ถึง ${weekRange.end})`,
      month: `รายเดือน (${targetMonthStr})`,
      year: `รายปี (${targetYearStr})`,
    };

    try {
      const result = await requestAiFinancialAnalysis({
        periodType: selectedPeriod,
        periodLabel: periodLabels[selectedPeriod],
        salesTotal: financialMetrics.netSales,
        buffetSales: financialMetrics.buffetSales,
        foodSales: financialMetrics.foodSales,
        otherSales: financialMetrics.otherSales,
        purchaseTotal: financialMetrics.purchaseTotal,
        wagesTotal: financialMetrics.wagesTotal,
        overheadTotal: financialMetrics.overheadTotal,
        waterTotal: financialMetrics.waterAllocated,
        electricityTotal: financialMetrics.electricityAllocated,
        rentTotal: financialMetrics.rentAllocated,
        depreciationTotal: financialMetrics.depreciationAllocated,
        netProfit: financialMetrics.netProfit,
        profitMargin: financialMetrics.profitMargin,
      });

      setAiAnalysisResult(result);
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setAiError(err.message || 'การวิเคราะห์ล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const periodLabels: Record<DashboardPeriod, string> = {
    day: `รายวัน (${targetDate})`,
    week: `รายสัปดาห์นี้ (${weekRange.start} - ${weekRange.end})`,
    month: `รายเดือน (${targetMonthStr})`,
    year: `รายปี (${targetYearStr})`,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Period Selector */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-zinc-900 font-bold text-lg sm:text-xl">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span>แดชบอร์ดสรุปรายรับ-รายจ่าย & สถิติร้าน (Financial & Stock Hub)</span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            สรุปยอดขาย ต้นทุนจัดซื้อ ค่าจ้าง ค่าน้ำค่าไฟ ค่าเช่า และค่าเสื่อมราคาเฉลี่ยต่อวัน พร้อมระบบวิเคราะห์ AI
          </p>
        </div>

        {/* Period Selector Tabs: Day / Week / Month / Year */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedPeriod('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPeriod === 'day' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              รายวัน
            </button>
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPeriod === 'week' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              สัปดาห์
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPeriod === 'month' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              เดือน
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPeriod === 'year' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              ปี
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent font-bold text-zinc-800 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS: Revenue, Operating Cost, Net Profit, Net Margin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Net Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">รายรับรวม (Net Sales)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-emerald-700">
              ฿{financialMetrics.netSales.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
              <span>บุฟเฟต์ ฿{financialMetrics.buffetSales.toLocaleString()}</span>
              {financialMetrics.customerCount > 0 && (
                <span>{financialMetrics.customerCount} คน</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Total Operating Cost */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">ค่าใช้จ่ายรวม (Total Costs)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-rose-700">
              ฿{financialMetrics.totalOperatingCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex justify-between">
              <span>ของ+แรง ฿{(financialMetrics.purchaseTotal + financialMetrics.wagesTotal).toLocaleString()}</span>
              <span>เฉลี่ยคงที่ ฿{financialMetrics.overheadTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* 3. Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">กำไรสุทธิ (Net Profit)</span>
            <div className={`p-2 rounded-xl ${
              financialMetrics.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold font-mono ${
              financialMetrics.netProfit >= 0 ? 'text-zinc-900' : 'text-rose-600'
            }`}>
              ฿{financialMetrics.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
              {financialMetrics.netProfit >= 0 ? (
                <span className="text-emerald-700 font-bold flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> มีกำไร
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" /> ขาดทุน
                </span>
              )}
              <span>ในช่วง {periodLabels[selectedPeriod]}</span>
            </div>
          </div>
        </div>

        {/* 4. Profit Margin & Prime Cost Ratio */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500">อัตรากำไร & Prime Cost</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-indigo-700">
              {financialMetrics.profitMargin.toFixed(1)}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex justify-between">
              <span>Prime Cost (Food+Labor):</span>
              <span className={`font-bold ${financialMetrics.primeCostPct > 60 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {financialMetrics.primeCostPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL INFOGRAPHIC & PIE CHART COMPARISON SECTION */}
      <InfographicFinancialCharts
        netSales={financialMetrics.netSales}
        buffetSales={financialMetrics.buffetSales}
        foodSales={financialMetrics.foodSales}
        otherSales={financialMetrics.otherSales}
        totalOperatingCost={financialMetrics.totalOperatingCost}
        purchaseTotal={financialMetrics.purchaseTotal}
        wagesTotal={financialMetrics.wagesTotal}
        overheadTotal={financialMetrics.overheadTotal}
        rentAllocated={financialMetrics.rentAllocated}
        electricityAllocated={financialMetrics.electricityAllocated}
        waterAllocated={financialMetrics.waterAllocated}
        depreciationAllocated={financialMetrics.depreciationAllocated}
        netProfit={financialMetrics.netProfit}
        profitMargin={financialMetrics.profitMargin}
        foodCostPct={financialMetrics.foodCostPct}
        laborCostPct={financialMetrics.laborCostPct}
        overheadPct={financialMetrics.overheadPct}
        primeCostPct={financialMetrics.primeCostPct}
        periodLabel={periodLabels[selectedPeriod]}
      />

      {/* AI FINANCIAL ADVISOR BANNER & ANALYSIS */}
      <div className="bg-gradient-to-r from-rose-900 via-zinc-900 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>AI Financial Advisor & Consultant (Gemini 3.8 Flash)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
              ที่ปรึกษาการเงินอัจฉริยะ • วิเคราะห์รายรับ รายจ่าย และโครงสร้างต้นทุนร้าน 65 Seoul
            </h3>
            <p className="text-xs text-zinc-300 max-w-2xl">
              กดวิเคราะห์เพื่อประเมินสถานะการเงิน สัดส่วน Food Cost (วัตถุดิบ), Labor Cost (ค่าจ้าง), และ Overhead (ค่าน้ำ/ไฟ/เช่า/เสื่อม) พร้อมคำแนะนำเชิงกลยุทธ์
            </p>
          </div>

          <button
            onClick={handleRunAiAnalysis}
            disabled={isAnalyzingAi}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isAnalyzingAi ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังวิเคราะห์ข้อมูลการเงิน...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-rose-200" />
                <span>วิเคราะห์สถานะการเงินด้วย AI</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="mt-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center justify-between">
            <span>{aiError}</span>
            <button onClick={() => setAiError(null)} className="text-rose-300 font-bold ml-2">✕</button>
          </div>
        )}

        {/* AI Analysis Result Modal / Card */}
        {aiAnalysisResult && (
          <div className="mt-5 p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-4 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-200">ผลการวิเคราะห์ช่วง:</span>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-mono">
                  {aiAnalysisResult.period}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-300">คะแนนสุขภาพการเงิน:</span>
                <span className={`text-base font-extrabold px-3 py-0.5 rounded-full ${
                  aiAnalysisResult.healthScore >= 75
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                    : aiAnalysisResult.healthScore >= 50
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                    : 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                }`}>
                  {aiAnalysisResult.healthScore} / 100
                </span>
              </div>
            </div>

            {/* AI Summary */}
            <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed font-medium bg-black/20 p-3.5 rounded-xl border border-white/5">
              💡 {aiAnalysisResult.summary}
            </p>

            {/* 3 Columns: Strengths, Warnings, Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Strengths */}
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>จุดแข็งทางการเงิน (Strengths)</span>
                </div>
                <ul className="space-y-1.5 text-emerald-100 text-[11px]">
                  {aiAnalysisResult.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-emerald-400">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>ข้อควรระวัง / ความเสี่ยง (Risks)</span>
                </div>
                <ul className="space-y-1.5 text-amber-100 text-[11px]">
                  {aiAnalysisResult.warnings.map((warn, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-400">•</span>
                      <span>{warn}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
                  <Lightbulb className="w-4 h-4 text-indigo-400" />
                  <span>คำแนะนำเชิงกลยุทธ์ (Action Plans)</span>
                </div>
                <ul className="space-y-1.5 text-indigo-100 text-[11px]">
                  {aiAnalysisResult.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-indigo-400">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* COST BREAKDOWN GRID & DAILY OVERHEAD AVERAGE BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Structure Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-600" />
              <span>โครงสร้างต้นทุนและสัดส่วนค่าใช้จ่าย ({periodLabels[selectedPeriod]})</span>
            </h3>
            <span className="text-xs text-zinc-500">
              ยอดขายอ้างอิง: ฿{financialMetrics.netSales.toLocaleString()}
            </span>
          </div>

          <div className="space-y-4">
            {/* 1. Food Cost (Purchases) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-rose-600" />
                  <span>1. ต้นทุนจัดซื้อวัตถุดิบ (Food Cost):</span>
                </span>
                <span className="font-mono font-bold text-zinc-900">
                  ฿{financialMetrics.purchaseTotal.toLocaleString()} ({financialMetrics.foodCostPct.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, financialMetrics.foodCostPct)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                * เกณฑ์มาตรฐานบุฟเฟต์ปิ้งย่างเกาหลี: 32% – 38%
              </p>
            </div>

            {/* 2. Labor Cost (Wages) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. ค่าจ้างแรงงาน (Labor Cost):</span>
                </span>
                <span className="font-mono font-bold text-zinc-900">
                  ฿{financialMetrics.wagesTotal.toLocaleString()} ({financialMetrics.laborCostPct.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, financialMetrics.laborCostPct)}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                * เกณฑ์มาตรฐานค่าแรงพนักงาน: 15% – 20% (พนักงานเฉลี่ย {financialMetrics.staffCount} คน)
              </p>
            </div>

            {/* 3. Monthly Overhead Averaged (Water, Electricity, Rent, Depreciation) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-700" />
                  <span>3. ค่าน้ำ ค่าไฟ ค่าเช่า ค่าเสื่อมราคาเฉลี่ย (Overhead):</span>
                </span>
                <span className="font-mono font-bold text-zinc-900">
                  ฿{financialMetrics.overheadTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({financialMetrics.overheadPct.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, financialMetrics.overheadPct)}%` }}
                />
              </div>

              {/* Sub-breakdown of Overhead */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                <div>
                  <span className="text-zinc-500 block">ค่าเช่า:</span>
                  <span className="font-mono font-bold text-zinc-800">
                    ฿{Math.round(financialMetrics.rentAllocated).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">ค่าไฟ:</span>
                  <span className="font-mono font-bold text-zinc-800">
                    ฿{Math.round(financialMetrics.electricityAllocated).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">ค่าน้ำ:</span>
                  <span className="font-mono font-bold text-zinc-800">
                    ฿{Math.round(financialMetrics.waterAllocated).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">ค่าเสื่อมราคา:</span>
                  <span className="font-mono font-bold text-zinc-800">
                    ฿{Math.round(financialMetrics.depreciationAllocated).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Averaged Overhead Details Card (1 Col) */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 border border-cyan-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-cyan-900 font-bold text-sm">
              <Building2 className="w-4 h-4 text-cyan-700" />
              <span>การเฉลี่ยค่าใช้จ่ายรายเดือนเป็นรายวัน</span>
            </div>
            <p className="text-xs text-cyan-800 leading-relaxed">
              ตามหลักการบัญชีร้านอาหาร ค่าน้ำ ค่าไฟ ค่าเช่า และค่าเสื่อมราคาเป็นต้นทุนคงที่ (Fixed Overhead) ระบบทำการหารเฉลี่ยจำนวนวันในเดือน ({daysInTargetMonth} วัน) ให้เป็นต้นทุนประจำวัน:
            </p>

            <div className="bg-white p-3 rounded-xl border border-cyan-200 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-zinc-600">
                <span>ยอดเฉลี่ยรายวัน:</span>
                <span className="font-bold text-cyan-700">
                  ฿{financialMetrics.dailyAvgOverhead.toLocaleString()} / วัน
                </span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>คำนวณในงวดนี้ ({selectedPeriod}):</span>
                <span className="font-bold text-zinc-900">
                  ฿{financialMetrics.overheadTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('expenses')}
              className="w-full text-center text-xs font-bold text-cyan-700 hover:text-cyan-800 bg-white py-2 rounded-xl border border-cyan-200 hover:bg-cyan-50 transition-colors shadow-2xs"
            >
              แก้ไขตัวเลขค่าน้ำ/ค่าไฟ/ค่าเช่า →
            </button>
          </div>

          {/* Shift & Urgent Stock Status */}
          <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-zinc-900 flex items-center justify-between">
              <span>สถานะตรวจนับสต็อกรอบเย็น</span>
              <button
                onClick={() => setActiveTab('stock-check')}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                ไปหน้านับสต็อก
              </button>
            </h4>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-2.5 text-xs">
              {hasEveningCheck ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-800 font-bold">บันทึกตรวจนับรอบเย็นวันนี้เรียบร้อยแล้ว</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800 font-bold">ยังไม่ได้ตรวจนับสต็อกรอบเย็นวันนี้</span>
                </>
              )}
            </div>

            {urgentItems.length > 0 && (
              <div className="text-xs">
                <div className="flex items-center justify-between text-rose-700 font-semibold mb-1">
                  <span>วัตถุดิบใกล้หมด/ต้องสั่งซื้อ:</span>
                  <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full font-bold">
                    {urgentItems.length} รายการ
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-zinc-100">
                  {urgentItems.slice(0, 3).map((it) => (
                    <div key={it.id} className="pt-1 flex justify-between text-[11px]">
                      <span className="truncate max-w-[130px] font-medium">{it.nameTh}</span>
                      <span className="font-mono text-rose-600 font-bold">
                        {it.currentStock} / {it.minStock} {it.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
