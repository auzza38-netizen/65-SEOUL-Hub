import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieIcon, 
  Boxes, 
  Users, 
  Building2, 
  Percent, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Droplets,
  Zap,
  Home,
  Flame
} from 'lucide-react';

interface InfographicFinancialChartsProps {
  netSales: number;
  buffetSales: number;
  foodSales: number;
  otherSales: number;
  totalOperatingCost: number;
  purchaseTotal: number;
  wagesTotal: number;
  overheadTotal: number;
  rentAllocated: number;
  electricityAllocated: number;
  waterAllocated: number;
  depreciationAllocated: number;
  netProfit: number;
  profitMargin: number;
  foodCostPct: number;
  laborCostPct: number;
  overheadPct: number;
  primeCostPct: number;
  periodLabel: string;
}

export const InfographicFinancialCharts: React.FC<InfographicFinancialChartsProps> = ({
  netSales,
  buffetSales,
  foodSales,
  otherSales,
  totalOperatingCost,
  purchaseTotal,
  wagesTotal,
  overheadTotal,
  rentAllocated,
  electricityAllocated,
  waterAllocated,
  depreciationAllocated,
  netProfit,
  profitMargin,
  foodCostPct,
  laborCostPct,
  overheadPct,
  primeCostPct,
  periodLabel,
}) => {
  const [activeSlice, setActiveSlice] = useState<string | null>(null);

  // Formatting helpers
  const formatBaht = (amount: number, digits = 0) =>
    `฿${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;

  // 1. Data for Pie / Donut Chart (Allocation of Revenue / Costs)
  const isProfitable = netProfit > 0;
  const costSum = purchaseTotal + wagesTotal + overheadTotal;
  const baseTotalForPie = Math.max(netSales, costSum, 1);

  // Slices: Food Cost, Labor Cost, Overhead, Net Profit (if profitable)
  const pieSegments = [
    {
      id: 'food',
      label: 'ต้นทุนวัตถุดิบ (Food Cost)',
      shortLabel: 'วัตถุดิบ',
      value: purchaseTotal,
      percentage: netSales > 0 ? (purchaseTotal / netSales) * 100 : (purchaseTotal / baseTotalForPie) * 100,
      color: '#E11D48', // rose-600
      hoverColor: '#BE123C', // rose-700
      bgClass: 'bg-rose-50 border-rose-200 text-rose-900',
      badgeClass: 'bg-rose-600 text-white',
      benchmark: 'เป้าหมาย: 32% - 38%',
      icon: Boxes,
    },
    {
      id: 'labor',
      label: 'ค่าจ้างแรงงาน (Labor Cost)',
      shortLabel: 'ค่าแรง',
      value: wagesTotal,
      percentage: netSales > 0 ? (wagesTotal / netSales) * 100 : (wagesTotal / baseTotalForPie) * 100,
      color: '#6366F1', // indigo-500
      hoverColor: '#4F46E5', // indigo-600
      bgClass: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      badgeClass: 'bg-indigo-600 text-white',
      benchmark: 'เป้าหมาย: 15% - 20%',
      icon: Users,
    },
    {
      id: 'overhead',
      label: 'ค่าใช้จ่ายคงที่เฉลี่ย (Overhead)',
      shortLabel: 'Overhead',
      value: overheadTotal,
      percentage: netSales > 0 ? (overheadTotal / netSales) * 100 : (overheadTotal / baseTotalForPie) * 100,
      color: '#0284C7', // sky-600
      hoverColor: '#0369A1', // sky-700
      bgClass: 'bg-sky-50 border-sky-200 text-sky-900',
      badgeClass: 'bg-sky-600 text-white',
      benchmark: 'ค่าเช่า, ไฟ, น้ำ, เสื่อม',
      icon: Building2,
    },
    ...(isProfitable ? [{
      id: 'profit',
      label: 'กำไรสุทธิคงเหลือ (Net Profit)',
      shortLabel: 'กำไรสุทธิ',
      value: netProfit,
      percentage: profitMargin,
      color: '#10B981', // emerald-500
      hoverColor: '#059669', // emerald-600
      bgClass: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      badgeClass: 'bg-emerald-600 text-white',
      benchmark: 'เป้าหมาย: ≥ 15% - 25%',
      icon: TrendingUp,
    }] : []),
  ];

  // SVG Donut Calculations
  const radius = 76;
  const circumference = 2 * Math.PI * radius; // ~477.52
  const totalPieValues = pieSegments.reduce((acc, curr) => acc + curr.value, 0) || 1;

  let accumulatedPercent = 0;
  const svgSlices = pieSegments.map((segment) => {
    const fraction = Math.max(0, segment.value) / totalPieValues;
    const strokeLength = fraction * circumference;
    const strokeOffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      ...segment,
      strokeLength,
      strokeOffset,
      fraction,
    };
  });

  // 2. Comparative Bar Chart calculations
  const maxBarValue = Math.max(netSales, totalOperatingCost, Math.abs(netProfit), 1);
  const salesBarHeightPct = Math.round((netSales / maxBarValue) * 100);
  const costBarHeightPct = Math.round((totalOperatingCost / maxBarValue) * 100);
  const profitBarHeightPct = Math.round((Math.abs(netProfit) / maxBarValue) * 100);

  // Prime cost status assessment
  const isPrimeCostSafe = primeCostPct > 0 && primeCostPct <= 60;
  const isPrimeCostModerate = primeCostPct > 60 && primeCostPct <= 68;

  const currentHoveredSegment = pieSegments.find((s) => s.id === activeSlice);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-600 to-indigo-600 text-white shadow-xs">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 tracking-tight">
              อินโฟกราฟฟิกการเงิน & แผนภูมิเปรียบเทียบ (Financial Infographic & Pie Chart)
            </h3>
            <p className="text-xs text-zinc-500">
              วิเคราะห์เปรียบเทียบรายรับ ค่าใช้จ่าย กำไรสุทธิ อัตรากำไร และ Prime Cost ({periodLabel})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200 font-medium text-zinc-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>คำนวณสดตามช่วงเวลา</span>
        </div>
      </div>

      {/* TOP INFOGRAPHIC: 3-PILLAR COMPARATIVE GRAPH */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              1. กราฟเปรียบเทียบ 3 มิติหลัก (Comparative Financial Pillars)
            </span>
            <h4 className="text-sm sm:text-base font-extrabold text-zinc-900 mt-0.5">
              เปรียบเทียบ รายรับรวม vs ค่าใช้จ่ายรวม vs กำไรสุทธิ
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>รายรับรวม (Net Sales)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>ค่าใช้จ่ายรวม (Total Costs)</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span>กำไรสุทธิ (Net Profit)</span>
            </div>
          </div>
        </div>

        {/* INFOGRAPHIC VISUAL PILLARS & WATERFALL BARS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Pillar 1: Net Sales */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-emerald-100/30 border border-emerald-200 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    รายรับรวม (Net Sales)
                  </span>
                  <span className="text-xs text-zinc-500">ยอดขายจริงหลังหักส่วนลด</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800">
                100%
              </span>
            </div>

            <div className="my-5">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 tracking-tight">
                {formatBaht(netSales)}
              </div>
              <div className="text-xs text-emerald-800 mt-1 space-y-0.5">
                <div className="flex justify-between">
                  <span>• ยอดขายบุฟเฟต์:</span>
                  <span className="font-mono font-bold">{formatBaht(buffetSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ยอดอาหาร/เครื่องดื่ม:</span>
                  <span className="font-mono font-bold">{formatBaht(foodSales + otherSales)}</span>
                </div>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-1">
              <div className="w-full bg-emerald-200/50 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(5, salesBarHeightPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-emerald-700 font-semibold">
                <span>ฐานคำนวณผลประกอบการ</span>
                <span>ระดับสูงสุด</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: Total Costs */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-rose-50/80 to-rose-100/30 border border-rose-200 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                    ค่าใช้จ่ายรวม (Total Costs)
                  </span>
                  <span className="text-xs text-zinc-500">ต้นทุนวัตถุดิบ + ค่าแรง + ค่าคงที่</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-200/60 text-rose-800">
                {netSales > 0 ? `${((totalOperatingCost / netSales) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>

            <div className="my-5">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-700 tracking-tight">
                {formatBaht(totalOperatingCost)}
              </div>
              <div className="text-xs text-rose-800 mt-1 space-y-0.5">
                <div className="flex justify-between">
                  <span>• วัตถุดิบ (Food Cost):</span>
                  <span className="font-mono font-bold">{formatBaht(purchaseTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ค่าจ้างพนักงาน:</span>
                  <span className="font-mono font-bold">{formatBaht(wagesTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>• ค่าน้ำ/ไฟ/เช่า/เสื่อม:</span>
                  <span className="font-mono font-bold">{formatBaht(overheadTotal)}</span>
                </div>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-1">
              <div className="w-full bg-rose-200/50 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(5, costBarHeightPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-rose-700 font-semibold">
                <span>สัดส่วนค่าใช้จ่ายเทียบยอดขาย</span>
                <span>{netSales > 0 ? `${((totalOperatingCost / netSales) * 100).toFixed(1)}%` : '0%'}</span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Net Profit */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between relative overflow-hidden ${
            netProfit >= 0
              ? 'bg-gradient-to-b from-indigo-50/80 to-indigo-100/30 border-indigo-200'
              : 'bg-gradient-to-b from-amber-50/80 to-amber-100/30 border-amber-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl text-white shadow-xs ${
                  netProfit >= 0 ? 'bg-indigo-600' : 'bg-amber-600'
                }`}>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                    netProfit >= 0 ? 'text-indigo-800' : 'text-amber-800'
                  }`}>
                    กำไรสุทธิ (Net Profit)
                  </span>
                  <span className="text-xs text-zinc-500">รายรับสุทธิคงเหลือจริง</span>
                </div>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                netProfit >= 0 ? 'bg-indigo-200/60 text-indigo-900' : 'bg-amber-200/60 text-amber-900'
              }`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>

            <div className="my-5">
              <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                netProfit >= 0 ? 'text-indigo-700' : 'text-amber-700'
              }`}>
                {netProfit < 0 ? `-${formatBaht(netProfit)}` : formatBaht(netProfit)}
              </div>
              <div className="text-xs mt-1 space-y-1">
                <div className="flex items-center gap-1 font-semibold">
                  {netProfit >= 0 ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> สถานะมีกำไรสุทธิ ({profitMargin.toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> ขาดทุน ({profitMargin.toFixed(1)}%)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  {netProfit >= 0 
                    ? 'ยอดขายครอบคลุมต้นทุนทั้งหมดและสร้างกำไรส่วนเกิน'
                    : 'ค่าใช้จ่ายสูงกว่ายอดขาย ควรทบทวนต้นทุนวัตถุดิบและค่าแรง'}
                </p>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-1">
              <div className="w-full bg-zinc-200/60 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    netProfit >= 0 ? 'bg-indigo-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.max(5, profitBarHeightPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600 font-semibold">
                <span>อัตรากำไรสุทธิ (Net Margin)</span>
                <span>{profitMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* WATERFALL FLOW STRIP */}
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs">
          <div className="font-bold text-zinc-700 mb-2.5 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-zinc-500" />
            <span>เส้นทางตัดทอนยอดขายสู่กำไรสุทธิ (Financial Waterfall Flow):</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-center sm:text-left">
            <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex-1">
              <span className="text-[10px] font-bold text-zinc-400 block">1. รายรับสุทธิ (100%)</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">{formatBaht(netSales)}</span>
            </div>

            <div className="hidden sm:flex text-zinc-400 font-bold">−</div>

            <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex-1">
              <span className="text-[10px] font-bold text-rose-500 block">2. หักวัตถุดิบ (-{foodCostPct.toFixed(1)}%)</span>
              <span className="font-mono font-bold text-rose-700 text-sm">-{formatBaht(purchaseTotal)}</span>
            </div>

            <div className="hidden sm:flex text-zinc-400 font-bold">−</div>

            <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex-1">
              <span className="text-[10px] font-bold text-indigo-500 block">3. หักค่าแรง (-{laborCostPct.toFixed(1)}%)</span>
              <span className="font-mono font-bold text-indigo-700 text-sm">-{formatBaht(wagesTotal)}</span>
            </div>

            <div className="hidden sm:flex text-zinc-400 font-bold">−</div>

            <div className="p-2.5 rounded-xl bg-white border border-zinc-200 flex-1">
              <span className="text-[10px] font-bold text-sky-500 block">4. หักค่าคงที่ (-{overheadPct.toFixed(1)}%)</span>
              <span className="font-mono font-bold text-sky-700 text-sm">-{formatBaht(overheadTotal)}</span>
            </div>

            <div className="hidden sm:flex text-zinc-400 font-bold">=</div>

            <div className={`p-2.5 rounded-xl border flex-1 ${
              netProfit >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'
            }`}>
              <span className="text-[10px] font-bold block text-zinc-600">5. กำไรสุทธิ ({profitMargin.toFixed(1)}%)</span>
              <span className={`font-mono font-extrabold text-sm ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {netProfit < 0 ? `-${formatBaht(netProfit)}` : formatBaht(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECOND ROW: PIE CHART (DONUT) & PRIME COST / MARGIN GAUGES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: INTERACTIVE SVG PIE / DONUT CHART (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                2. แผนภูมิวงกลมอินโฟกราฟฟิก (Infographic Pie Chart)
              </span>
              <h4 className="text-sm sm:text-base font-extrabold text-zinc-900 mt-0.5 flex items-center gap-2">
                <span>สัดส่วนค่าใช้จ่าย & กำไรสุทธิ พร้อมตัวเลขและเปอร์เซ็นต์</span>
              </h4>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              รวม 100%
            </span>
          </div>

          {/* SVG Pie Chart + Center Display + Dynamic Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Donut Chart SVG Graphic (5 Cols) */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
              <div className="w-56 h-56 relative flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                  {/* Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke="#F4F4F5"
                    strokeWidth="28"
                  />

                  {/* Slices */}
                  {svgSlices.map((slice) => {
                    const isHovered = activeSlice === slice.id;
                    return (
                      <circle
                        key={slice.id}
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="transparent"
                        stroke={isHovered ? slice.hoverColor : slice.color}
                        strokeWidth={isHovered ? 34 : 28}
                        strokeDasharray={`${slice.strokeLength} ${circumference - slice.strokeLength}`}
                        strokeDashoffset={slice.strokeOffset}
                        strokeLinecap="butt"
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setActiveSlice(slice.id)}
                        onMouseLeave={() => setActiveSlice(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                  {currentHoveredSegment ? (
                    <div className="animate-in fade-in zoom-in-95">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                        {currentHoveredSegment.shortLabel}
                      </span>
                      <div className="font-extrabold font-mono text-base text-zinc-900 leading-tight">
                        {formatBaht(currentHoveredSegment.value)}
                      </div>
                      <div className="text-xs font-mono font-bold text-rose-600 mt-0.5">
                        {currentHoveredSegment.percentage.toFixed(1)}%
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        รายรับสุทธิ (Net Sales)
                      </span>
                      <div className="font-black font-mono text-base sm:text-lg text-emerald-700 leading-tight">
                        {formatBaht(netSales)}
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-0.5">
                        {profitMargin >= 0 ? `กำไร ${profitMargin.toFixed(1)}%` : `ขาดทุน ${profitMargin.toFixed(1)}%`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 mt-2 text-center">
                * ชี้ที่วงกลมเพื่อดูตัวเลขเฉพาะส่วน
              </p>
            </div>

            {/* Legend & Exact Numbers Breakdown (7 Cols) */}
            <div className="sm:col-span-7 space-y-2.5">
              {pieSegments.map((segment) => {
                const isHovered = activeSlice === segment.id;
                const IconComponent = segment.icon;

                return (
                  <div
                    key={segment.id}
                    onMouseEnter={() => setActiveSlice(segment.id)}
                    onMouseLeave={() => setActiveSlice(null)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isHovered
                        ? `${segment.bgClass} shadow-md scale-[1.02]`
                        : 'bg-zinc-50/80 border-zinc-200/80 hover:bg-zinc-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: segment.color }}
                        />
                        <div className="flex items-center gap-1.5">
                          <IconComponent className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="font-bold text-xs text-zinc-900">
                            {segment.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold font-mono text-xs text-zinc-900 block">
                          {formatBaht(segment.value)}
                        </span>
                        <span className="font-mono font-bold text-[11px] text-zinc-500">
                          {segment.percentage.toFixed(1)}% ของยอดขาย
                        </span>
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-zinc-200/50 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{segment.benchmark}</span>
                      <span className="font-semibold text-zinc-600">
                        {segment.id === 'profit' ? 'คงเหลือเป็นกำไร' : 'ต้นทุนตัดจ่าย'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-breakdown of Overhead inside Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
            <span className="text-[11px] font-bold text-zinc-600 block mb-2">
              เจาะลึก 4 รายการต้นทุนคงที่เฉลี่ย (Overhead Sub-Breakdown):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-white border border-zinc-200">
                <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                  <Home className="w-3 h-3 text-sky-600" />
                  <span>ค่าเช่าสถานที่:</span>
                </div>
                <div className="font-mono font-bold text-zinc-900 mt-0.5">
                  {formatBaht(rentAllocated)}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {netSales > 0 ? `${((rentAllocated / netSales) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white border border-zinc-200">
                <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>ค่าไฟฟ้า:</span>
                </div>
                <div className="font-mono font-bold text-zinc-900 mt-0.5">
                  {formatBaht(electricityAllocated)}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {netSales > 0 ? `${((electricityAllocated / netSales) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white border border-zinc-200">
                <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                  <Droplets className="w-3 h-3 text-blue-500" />
                  <span>ค่าน้ำประปา:</span>
                </div>
                <div className="font-mono font-bold text-zinc-900 mt-0.5">
                  {formatBaht(waterAllocated)}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {netSales > 0 ? `${((waterAllocated / netSales) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white border border-zinc-200">
                <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
                  <Flame className="w-3 h-3 text-rose-500" />
                  <span>ค่าเสื่อมราคา:</span>
                </div>
                <div className="font-mono font-bold text-zinc-900 mt-0.5">
                  {formatBaht(depreciationAllocated)}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  {netSales > 0 ? `${((depreciationAllocated / netSales) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PRIME COST & PROFIT MARGIN INFOGRAPHIC METERS (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Prime Cost Master Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  3. ดัชนีต้นทุนหลัก (Prime Cost Gauge)
                </span>
                <h4 className="text-sm sm:text-base font-extrabold text-zinc-900 mt-0.5">
                  Prime Cost = Food Cost + Labor Cost
                </h4>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isPrimeCostSafe 
                  ? 'bg-emerald-100 text-emerald-800'
                  : isPrimeCostModerate
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {isPrimeCostSafe ? 'ระดับดีเยี่ยม' : isPrimeCostModerate ? 'ควรเฝ้าระวัง' : 'ต้นทุนสูงเกิน'}
              </span>
            </div>

            {/* Giant Prime Cost Value */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl sm:text-4xl font-black font-mono text-zinc-900">
                  {primeCostPct.toFixed(1)}%
                </span>
                <span className="text-xs text-zinc-500 ml-2">ของยอดขายสุทธิ</span>
              </div>
              <div className="text-right text-xs">
                <span className="text-zinc-400 block">ยอดรวมต้นทุนหลัก</span>
                <span className="font-mono font-bold text-zinc-800">
                  {formatBaht(purchaseTotal + wagesTotal)}
                </span>
              </div>
            </div>

            {/* Visual Color-coded Progress Bar with Benchmark Indicators */}
            <div className="space-y-1.5">
              <div className="w-full bg-zinc-100 h-4 rounded-full overflow-hidden relative flex">
                {/* Food Cost Portion */}
                <div
                  className="bg-rose-500 h-full transition-all duration-700"
                  style={{ width: `${Math.min(100, foodCostPct)}%` }}
                  title={`Food Cost: ${foodCostPct.toFixed(1)}%`}
                />
                {/* Labor Cost Portion */}
                <div
                  className="bg-indigo-500 h-full transition-all duration-700"
                  style={{ width: `${Math.min(100 - foodCostPct, laborCostPct)}%` }}
                  title={`Labor Cost: ${laborCostPct.toFixed(1)}%`}
                />
              </div>

              {/* Benchmark Threshold Ticks */}
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0%</span>
                <span className="text-emerald-700 font-bold">55% (ยอดเยี่ยม)</span>
                <span className="text-amber-700 font-bold">60% (เกณฑ์สูงสุด)</span>
                <span className="text-rose-600 font-bold">100%</span>
              </div>
            </div>

            {/* Sub-items in Prime Cost */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200">
                <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>Food Cost:</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-rose-700 mt-1">
                  {foodCostPct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-rose-800/80 font-mono">
                  {formatBaht(purchaseTotal)}
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  เกณฑ์ร้านเกาหลี: 32 - 38%
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200">
                <div className="flex items-center gap-1.5 text-indigo-800 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <span>Labor Cost:</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-indigo-700 mt-1">
                  {laborCostPct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-indigo-800/80 font-mono">
                  {formatBaht(wagesTotal)}
                </div>
                <span className="text-[10px] text-zinc-500 block mt-1">
                  เกณฑ์ร้านเกาหลี: 15 - 20%
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-200">
              💡 <strong>หลักการ Prime Cost:</strong> สำหรับธุรกิจร้านอาหารเกาหลีและปิ้งย่างบุฟเฟต์ ผลรวมของต้นทุนวัตถุดิบและค่าแรงพนักงานไม่ควรเกิน <strong>60%</strong> เพื่อให้มีกำไรส่วนเกินเพียงพอสำหรับค่าเช่า ค่าน้ำ ค่าไฟ และกำไรสุทธิของผู้ประกอบการ
            </p>
          </div>

          {/* Profit Margin Master Card */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  4. ดัชนีอัตรากำไรสุทธิ (Net Margin Gauge)
                </span>
                <h4 className="text-sm sm:text-base font-extrabold text-zinc-900 mt-0.5">
                  Net Profit Margin (%)
                </h4>
              </div>
              <div className={`p-1.5 rounded-xl ${profitMargin >= 15 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                <Percent className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className={`text-3xl sm:text-4xl font-black font-mono ${
                  profitMargin >= 15 ? 'text-emerald-600' : profitMargin >= 0 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {profitMargin.toFixed(1)}%
                </span>
                <span className="text-xs text-zinc-500 ml-2">ของยอดขาย</span>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400 block">กำไรสุทธิงวดนี้</span>
                <span className={`font-mono font-bold text-sm ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {netProfit < 0 ? `-${formatBaht(netProfit)}` : formatBaht(netProfit)}
                </span>
              </div>
            </div>

            {/* Profit Margin Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    profitMargin >= 15 ? 'bg-emerald-500' : profitMargin >= 0 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, profitMargin * 2))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0% (คุ้มทุน)</span>
                <span className="text-emerald-700 font-bold">15% - 25% (เป้าหมายธุรกิจร้านอาหาร)</span>
                <span>50%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
              <span>สถานะประสิทธิภาพการทำกำไร:</span>
              <span className={`font-bold ${
                profitMargin >= 20 
                  ? 'text-emerald-700' 
                  : profitMargin >= 10 
                  ? 'text-indigo-700' 
                  : profitMargin >= 0 
                  ? 'text-amber-700' 
                  : 'text-rose-600'
              }`}>
                {profitMargin >= 20 ? '🌟 ยอดเยี่ยมมาก (Excellent)' : profitMargin >= 10 ? '✓ ดีตามมาตรฐาน (Good)' : profitMargin >= 0 ? '⚠️ กำไรต่ำ (Fair)' : '✕ ขาดทุน (Loss)'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
