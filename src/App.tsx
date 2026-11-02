/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header, ActiveTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { DailyStockCheckView } from './components/DailyStockCheckView';
import { PurchaseOcrView } from './components/PurchaseOcrView';
import { PurchaseReportView } from './components/PurchaseReportView';
import { DailySalesView } from './components/DailySalesView';
import { DailyWagesView } from './components/DailyWagesView';
import { MonthlyExpensesView } from './components/MonthlyExpensesView';
import { ItemMasterView } from './components/ItemMasterView';
import { AdminView } from './components/AdminView';
import { LoginView } from './components/LoginView';
import { PendingApprovalView } from './components/PendingApprovalView';
import { 
  ItemMaster, 
  StockCheckSession, 
  PurchaseBill, 
  DailySalesRecord, 
  DailyWageRecord, 
  MonthlyExpenseRecord 
} from './types';
import { subscribeItems, seedInitialCatalogIfEmpty } from './services/itemService';
import { subscribeStockChecks } from './services/stockCheckService';
import { subscribePurchases } from './services/purchaseService';
import { 
  subscribeDailySales, 
  subscribeDailyWages, 
  subscribeMonthlyExpenses 
} from './services/financialService';
import { Sparkles, Loader2, AlertCircle, LogIn } from 'lucide-react';

function MainAppContent() {
  const { 
    currentUser, 
    userProfile, 
    isAdmin, 
    isApproved, 
    isPendingApproval, 
    isRejected, 
    loading: authLoading 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [stockChecks, setStockChecks] = useState<StockCheckSession[]>([]);
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [sales, setSales] = useState<DailySalesRecord[]>([]);
  const [wages, setWages] = useState<DailyWageRecord[]>([]);
  const [expenses, setExpenses] = useState<MonthlyExpenseRecord[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Initialize Real-time Listeners and Auto-seed if needed
  useEffect(() => {
    let unsubItems: (() => void) | null = null;
    let unsubChecks: (() => void) | null = null;
    let unsubPurchases: (() => void) | null = null;
    let unsubSales: (() => void) | null = null;
    let unsubWages: (() => void) | null = null;
    let unsubExpenses: (() => void) | null = null;

    const setupListeners = async () => {
      try {
        setLoadingData(true);
        setDbError(null);

        // 1. Subscribe to Items (readable by all)
        unsubItems = subscribeItems(
          (itemList) => {
            setItems(itemList);
            setLoadingData(false);
          },
          (err) => {
            console.warn('Items subscription notice:', err.message);
            setLoadingData(false);
          }
        );

        // 2. If authenticated, seed catalog if admin & subscribe to all modules
        if (currentUser) {
          if (isAdmin) {
            try {
              await seedInitialCatalogIfEmpty(false);
            } catch (e) {
              console.warn('Initial seed skipped:', e);
            }
          }

          unsubChecks = subscribeStockChecks((checkList) => {
            setStockChecks(checkList);
          });

          unsubPurchases = subscribePurchases((purchaseList) => {
            setPurchases(purchaseList);
          });

          unsubSales = subscribeDailySales((salesList) => {
            setSales(salesList);
          });

          unsubWages = subscribeDailyWages((wageList) => {
            setWages(wageList);
          });

          unsubExpenses = subscribeMonthlyExpenses((expList) => {
            setExpenses(expList);
          });
        } else {
          setStockChecks([]);
          setPurchases([]);
          setSales([]);
          setWages([]);
          setExpenses([]);
        }
      } catch (err: any) {
        console.error('Setup listeners error:', err);
        setLoadingData(false);
      }
    };

    setupListeners();

    return () => {
      if (unsubItems) unsubItems();
      if (unsubChecks) unsubChecks();
      if (unsubPurchases) unsubPurchases();
      if (unsubSales) unsubSales();
      if (unsubWages) unsubWages();
      if (unsubExpenses) unsubExpenses();
    };
  }, [currentUser, isAdmin]);

  // Compute notification badges
  const pendingPurchasesCount = purchases.filter((p) => p.status === 'pending_approval').length;
  const lowStockCount = items.filter(
    (i) => i.status === 'active' && i.currentStock <= i.minStock
  ).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center mb-4 ring-4 ring-rose-600/30">
          <span className="font-extrabold text-lg">65</span>
        </div>
        <Loader2 className="w-6 h-6 text-rose-500 animate-spin mb-2" />
        <p className="text-sm font-medium text-zinc-400">กำลังเชื่อมต่อระบบ 65 SEOUL Hub...</p>
      </div>
    );
  }

  // 1. If not authenticated, require login immediately on the first page
  if (!currentUser) {
    return <LoginView />;
  }

  // 2. If authenticated but pending approval or rejected by Master Admin
  if (isPendingApproval || isRejected) {
    return <PendingApprovalView />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingPurchasesCount={pendingPurchasesCount}
        lowStockCount={lowStockCount}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {dbError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>กำลังเชื่อมต่อฐานข้อมูล Firestore ({dbError}) ระบบยังคงทำงานและจะซิงค์ข้อมูลอัตโนมัติ</span>
              </div>
              <button onClick={() => setDbError(null)} className="text-amber-700 font-bold ml-2">✕</button>
            </div>
          </div>
        )}

        {loadingData && items.length === 0 ? (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-zinc-800">กำลังโหลดฐานข้อมูล 173 รายการ...</h3>
            <p className="text-xs text-zinc-500 mt-1">
              กำลังเชื่อมโยงข้อมูลกับ Firebase Firestore และสต็อกรายวัน
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                items={items}
                stockChecks={stockChecks}
                purchases={purchases}
                sales={sales}
                wages={wages}
                expenses={expenses}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'sales' && (
              <DailySalesView
                sales={sales}
              />
            )}

            {activeTab === 'purchases' && (
              <PurchaseOcrView
                items={items}
                purchases={purchases}
                onOpenReports={() => setActiveTab('purchase-reports')}
              />
            )}

            {activeTab === 'purchase-reports' && (
              <PurchaseReportView
                purchases={purchases}
                onOpenOcrScanner={() => setActiveTab('purchases')}
              />
            )}

            {activeTab === 'wages' && (
              <DailyWagesView
                wages={wages}
              />
            )}

            {activeTab === 'expenses' && (
              <MonthlyExpensesView
                expenses={expenses}
              />
            )}

            {activeTab === 'stock-check' && (
              <DailyStockCheckView
                items={items}
                stockChecks={stockChecks}
              />
            )}

            {activeTab === 'items' && (
              <ItemMasterView
                items={items}
              />
            )}

            {activeTab === 'admin' && (
              <AdminView
                items={items}
                onRefreshItems={() => seedInitialCatalogIfEmpty(false)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-zinc-200 bg-white py-4 text-center text-xs text-zinc-600">
        <p className="font-medium">
          65 SEOUL | Stock & Purchase Hub • ระบบบริหารสต็อกและจัดซื้อสำหรับร้านอาหารเกาหลี 65 Seoul
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          เชื่อมต่อ Cloud Firestore • Backend Gemini OCR ปลอดภัย • รองรับมือถือและแท็บเล็ต
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
