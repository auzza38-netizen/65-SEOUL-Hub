import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Database, 
  FileSpreadsheet, 
  History, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  Download, 
  Upload, 
  Lock, 
  Unlock,
  Key,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Crown
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser, AuditLog, ItemMaster } from '../types';
import { fetchRecentAuditLogs, logAudit } from '../services/auditService';
import { seedInitialCatalogIfEmpty } from '../services/itemService';
import { useAuth } from '../context/AuthContext';

interface AdminDoc {
  id: string;
  email: string;
  uid?: string;
  assignedAt?: string;
}

interface AdminViewProps {
  items: ItemMaster[];
  onRefreshItems?: () => void;
}

const PRIMARY_ADMIN_EMAIL = 'auzza38@gmail.com';
const SECONDARY_ADMIN_EMAIL = 'info.65seoulbbqnongkha@gmail.com';

export const AdminView: React.FC<AdminViewProps> = ({ items, onRefreshItems }) => {
  const { currentUser, userProfile, isAdmin, refreshProfile } = useAuth();

  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [adminsList, setAdminsList] = useState<AdminDoc[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [isResettingCatalog, setIsResettingCatalog] = useState<boolean>(false);

  // Appoint 2nd Admin Form State
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [selectedStaffUid, setSelectedStaffUid] = useState<string>('');
  const [isAppointing, setIsAppointing] = useState<boolean>(false);

  // Legacy CSV Import State
  const [legacyHistoryRows, setLegacyHistoryRows] = useState<any[]>([]);
  const [legacyImportMessage, setLegacyImportMessage] = useState<string | null>(null);

  // Load registered users from Firestore
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const snap = await getDocs(collection(db, 'users'));
      const list: AppUser[] = [];
      snap.forEach((d) => {
        list.push(d.data() as AppUser);
      });
      setUsersList(list);
    } catch (error) {
      console.warn('Failed to load users list:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load admin collection docs
  const loadAdmins = async () => {
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const list: AdminDoc[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          email: data.email || d.id,
          uid: data.uid,
          assignedAt: data.assignedAt,
        });
      });
      setAdminsList(list);
    } catch (error) {
      console.warn('Failed to load admins collection:', error);
    }
  };

  // Ensure both primary and secondary admins exist in /admins collection
  useEffect(() => {
    const ensureDefaultAdmins = async () => {
      try {
        await setDoc(doc(db, 'admins', PRIMARY_ADMIN_EMAIL.toLowerCase()), {
          email: PRIMARY_ADMIN_EMAIL.toLowerCase(),
          assignedAt: new Date().toISOString(),
        }, { merge: true });

        await setDoc(doc(db, 'admins', SECONDARY_ADMIN_EMAIL.toLowerCase()), {
          email: SECONDARY_ADMIN_EMAIL.toLowerCase(),
          assignedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.warn('Auto-ensure admin docs note:', e);
      }
    };

    if (currentUser && isAdmin) {
      ensureDefaultAdmins();
    }
  }, [currentUser, isAdmin]);

  // Load audit logs
  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const logs = await fetchRecentAuditLogs(40);
      setAuditLogs(logs);
    } catch (error) {
      console.warn('Failed to load audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAdmins();
    loadLogs();
  }, []);

  // Compute the 2 Master Admin Slots
  const primaryAdmin = useMemo(() => {
    const fromUsers = usersList.find((u) => u.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase());
    return {
      email: PRIMARY_ADMIN_EMAIL,
      displayName: fromUsers?.displayName || 'Master Admin คนที่ 1 (auzza38)',
      uid: fromUsers?.uid,
      status: 'active',
      isPrimary: true,
    };
  }, [usersList]);

  const secondAdmin = useMemo(() => {
    // 1. Check if designated SECONDARY_ADMIN_EMAIL is in usersList
    const specificUser = usersList.find(
      (u) => u.email.toLowerCase() === SECONDARY_ADMIN_EMAIL.toLowerCase()
    );
    if (specificUser) {
      return {
        email: SECONDARY_ADMIN_EMAIL,
        displayName: specificUser.displayName || 'Master Admin คนที่ 2 (65 Seoul)',
        uid: specificUser.uid,
        assignedAt: specificUser.updatedAt,
      };
    }

    // 2. Check if another user has master_admin
    const userAdmin = usersList.find(
      (u) => u.role === 'master_admin' && u.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
    );
    if (userAdmin) {
      return {
        email: userAdmin.email,
        displayName: userAdmin.displayName || 'Master Admin คนที่ 2',
        uid: userAdmin.uid,
        assignedAt: userAdmin.updatedAt,
      };
    }

    // 3. Check in adminsList
    const adminDoc = adminsList.find(
      (a) => a.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
    );
    if (adminDoc) {
      return {
        email: adminDoc.email,
        displayName: adminDoc.email.split('@')[0],
        uid: adminDoc.uid,
        assignedAt: adminDoc.assignedAt,
      };
    }

    // 4. Default to designated second admin
    return {
      email: SECONDARY_ADMIN_EMAIL,
      displayName: 'Master Admin คนที่ 2 (65 Seoul Nongkha)',
      uid: undefined,
      assignedAt: undefined,
    };
  }, [usersList, adminsList]);

  const totalMasterAdmins = 1 + (secondAdmin ? 1 : 0);

  // Appoint 2nd Master Admin (enforcing 2 max limit)
  const handleAppointSecondAdmin = async (targetEmail: string, targetUid?: string) => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถแต่งตั้งผู้ดูแลระบบได้');
      return;
    }

    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('กรุณาระบุอีเมลที่ถูกต้อง (เช่น gmail หรืออีเมลองค์กร)');
      return;
    }

    if (cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      alert('อีเมลนี้เป็น Master Admin หลักของระบบอยู่แล้ว');
      return;
    }

    if (secondAdmin && secondAdmin.email.toLowerCase() !== cleanEmail) {
      alert(
        `ระบบจำกัด Master Admin สูงสุด 2 คนเท่านั้น ปัจจุบันมีครบแล้ว:\n1. ${primaryAdmin.email}\n2. ${secondAdmin.email}\n\nกรุณาถอดถอน Master Admin คนที่ 2 เดิมออกก่อนทำการแต่งตั้งคนใหม่`
      );
      return;
    }

    try {
      setIsAppointing(true);
      const now = new Date().toISOString();

      // Find if matching user exists in registered users
      const matchedUser = usersList.find(
        (u) => (targetUid && u.uid === targetUid) || u.email.toLowerCase() === cleanEmail
      );

      // 1. Create document in /admins by email
      await setDoc(doc(db, 'admins', cleanEmail), {
        email: cleanEmail,
        uid: matchedUser?.uid || targetUid || null,
        assignedAt: now,
      });

      // 2. If user is registered, create /admins/{uid} and update role in /users/{uid}
      if (matchedUser) {
        await setDoc(doc(db, 'admins', matchedUser.uid), {
          uid: matchedUser.uid,
          email: cleanEmail,
          assignedAt: now,
        });

        await updateDoc(doc(db, 'users', matchedUser.uid), {
          role: 'master_admin',
          updatedAt: now,
        });
      }

      if (currentUser) {
        await logAudit(
          'APPOINT_SECOND_MASTER_ADMIN',
          'user',
          matchedUser?.uid || cleanEmail,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'Master Admin',
          `แต่งตั้ง ${cleanEmail} เป็น Master Admin คนที่ 2 ของระบบ 65 Seoul`
        );
      }

      setNewAdminEmail('');
      setSelectedStaffUid('');
      await loadUsers();
      await loadAdmins();
      if (currentUser?.uid === matchedUser?.uid) {
        await refreshProfile();
      }

      alert(`แต่งตั้ง ${cleanEmail} เป็น Master Admin คนที่ 2 เรียบร้อยแล้ว (รวม Master Admin เป็น 2/2 คน)`);
    } catch (error) {
      console.error('Appoint second admin error:', error);
      alert('เกิดข้อผิดพลาดในการแต่งตั้ง Master Admin');
    } finally {
      setIsAppointing(false);
    }
  };

  // Remove / Demote 2nd Master Admin
  const handleRemoveSecondAdmin = async () => {
    if (!isAdmin) return;
    if (!secondAdmin) return;

    const confirmRemove = window.confirm(
      `ยืนยันการถอดถอนสิทธิ์ Master Admin คนที่ 2 (${secondAdmin.email})?\nผู้ใช้นี้จะถูกปรับลดบทบาทกลับเป็นพนักงานทั่วไป (Staff)`
    );
    if (!confirmRemove) return;

    try {
      const cleanEmail = secondAdmin.email.toLowerCase();

      // Delete from /admins
      try {
        await deleteDoc(doc(db, 'admins', cleanEmail));
      } catch (e) {
        console.warn('Delete admin by email warning:', e);
      }

      if (secondAdmin.uid) {
        try {
          await deleteDoc(doc(db, 'admins', secondAdmin.uid));
        } catch (e) {
          console.warn('Delete admin by uid warning:', e);
        }

        // Demote in /users collection
        try {
          await updateDoc(doc(db, 'users', secondAdmin.uid), {
            role: 'staff',
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Update user role warning:', e);
        }
      } else {
        // Find if user exists in usersList by email
        const matched = usersList.find((u) => u.email.toLowerCase() === cleanEmail);
        if (matched) {
          await updateDoc(doc(db, 'users', matched.uid), {
            role: 'staff',
            updatedAt: new Date().toISOString(),
          });
          try {
            await deleteDoc(doc(db, 'admins', matched.uid));
          } catch {}
        }
      }

      if (currentUser) {
        await logAudit(
          'REMOVE_SECOND_MASTER_ADMIN',
          'user',
          secondAdmin.uid || cleanEmail,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'Master Admin',
          `ถอดถอนสิทธิ์ Master Admin คนที่ 2 (${cleanEmail}) ปรับเป็นพนักงานทั่วไป`
        );
      }

      await loadUsers();
      await loadAdmins();
      if (currentUser?.email?.toLowerCase() === cleanEmail) {
        await refreshProfile();
      }

      alert(`ถอดถอนสิทธิ์ Master Admin คนที่ 2 เรียบร้อยแล้ว (ขณะนี้มี Master Admin 1/2 คน)`);
    } catch (error) {
      console.error('Remove second admin error:', error);
      alert('เกิดข้อผิดพลาดในการถอดถอนสิทธิ์');
    }
  };

  // Toggle user role between Master Admin and Staff from table
  const handleToggleRole = async (targetUser: AppUser) => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถเปลี่ยนสิทธิ์ผู้ใช้งานได้');
      return;
    }

    if (targetUser.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      alert('ไม่สามารถปลดสิทธิ์ Master Admin หลัก (auzza38@gmail.com) ได้');
      return;
    }

    if (targetUser.role === 'master_admin') {
      // Demote to staff
      await handleRemoveSecondAdmin();
    } else {
      // Promote to 2nd master admin
      if (totalMasterAdmins >= 2) {
        alert(
          `ไม่สามารถแต่งตั้งได้ เนื่องจากระบบจำกัด Master Admin ไว้สูงสุด 2 คนเท่านั้น\n(ปัจจุบันมี ${PRIMARY_ADMIN_EMAIL} และ ${secondAdmin?.email})\nกรุณาถอดถอนคนเดิมออกก่อน`
        );
        return;
      }
      await handleAppointSecondAdmin(targetUser.email, targetUser.uid);
    }
  };

  // Master Admin approves pending user
  const handleApproveUser = async (targetUser: AppUser, assignedRole: 'staff' | 'master_admin' | 'viewer') => {
    if (!isAdmin || !currentUser) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถอนุมัติสิทธิ์ผู้ใช้งานได้');
      return;
    }

    try {
      const now = new Date().toISOString();
      const approverName = userProfile?.displayName || currentUser.displayName || 'Master Admin';

      // Update user doc in Firestore
      await updateDoc(doc(db, 'users', targetUser.uid), {
        status: 'active',
        role: assignedRole,
        approvedBy: currentUser.uid,
        approvedByName: approverName,
        approvedAt: now,
        updatedAt: now,
      });

      // If approved as master_admin, also register in /admins collection
      if (assignedRole === 'master_admin') {
        await setDoc(doc(db, 'admins', targetUser.uid), {
          uid: targetUser.uid,
          email: targetUser.email.toLowerCase(),
          assignedAt: now,
        }, { merge: true });
        if (targetUser.email) {
          await setDoc(doc(db, 'admins', targetUser.email.toLowerCase()), {
            uid: targetUser.uid,
            email: targetUser.email.toLowerCase(),
            assignedAt: now,
          }, { merge: true });
        }
      }

      await logAudit(
        'APPROVE_USER_ACCESS',
        'user',
        targetUser.uid,
        currentUser.uid,
        currentUser.email || '',
        approverName,
        `อนุมัติสิทธิ์เข้าใช้งานให้ ${targetUser.displayName} (${targetUser.email}) กำหนดบทบาทเป็น ${assignedRole}`
      );

      await loadUsers();
      await loadAdmins();
      alert(`อนุมัติสิทธิ์ให้ ${targetUser.displayName} (${targetUser.email}) เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Approve user error:', err);
      alert('เกิดข้อผิดพลาดในการอนุมัติผู้ใช้: ' + err.message);
    }
  };

  // Master Admin rejects pending user
  const handleRejectUser = async (targetUser: AppUser) => {
    if (!isAdmin || !currentUser) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถปฏิเสธคำขอได้');
      return;
    }

    if (!window.confirm(`ยืนยันการปฏิเสธคำขอเข้าใช้งานของ ${targetUser.displayName} (${targetUser.email})?`)) return;

    try {
      const now = new Date().toISOString();
      const approverName = userProfile?.displayName || currentUser.displayName || 'Master Admin';

      await updateDoc(doc(db, 'users', targetUser.uid), {
        status: 'rejected',
        updatedAt: now,
      });

      await logAudit(
        'REJECT_USER_ACCESS',
        'user',
        targetUser.uid,
        currentUser.uid,
        currentUser.email || '',
        approverName,
        `ปฏิเสธคำขอเข้าใช้งานของ ${targetUser.displayName} (${targetUser.email})`
      );

      await loadUsers();
      alert(`ปฏิเสธคำขอของ ${targetUser.email} เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Reject user error:', err);
      alert('เกิดข้อผิดพลาดในการปฏิเสธคำขอ: ' + err.message);
    }
  };

  // Toggle active / disabled status
  const handleToggleUserStatus = async (targetUser: AppUser) => {
    if (!isAdmin || !currentUser) return;
    if (targetUser.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      alert('ไม่สามารถปิดการใช้งาน Master Admin หลักได้');
      return;
    }

    const nextStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    const actionLabel = nextStatus === 'active' ? 'เปิดใช้งาน' : 'ระงับสิทธิ์';

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });

      await logAudit(
        'CHANGE_USER_STATUS',
        'user',
        targetUser.uid,
        currentUser.uid,
        currentUser.email || '',
        userProfile?.displayName || 'Master Admin',
        `${actionLabel} บัญชี ${targetUser.email}`
      );

      await loadUsers();
    } catch (err: any) {
      console.error('Toggle status error:', err);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: ' + err.message);
    }
  };

  // Re-seed master 173 items (Protected with double confirmation)
  const handleForceResetCatalog = async () => {
    if (!isAdmin) {
      alert('เฉพาะ Master Admin เท่านั้นที่สามารถรีเซ็ตแค็ตตาล็อกได้');
      return;
    }

    const confirmReset = window.confirm(
      '⚠️ คำเตือนสำคัญมาก:\nการรีเซ็ตแค็ตตาล็อกจะนำรายการเริ่มต้นมาเขียนทับชื่อสินค้าและรายการที่ร้าน 65 Seoul ปรับแต่งไว้ทั้งหมด\n\nต้องการดำเนินการต่อหรือไม่?'
    );
    if (!confirmReset) return;

    const doubleCheck = prompt('พิมพ์คำว่า "RESET" เพื่อยืนยันการรีเซ็ตแค็ตตาล็อก:');
    if (doubleCheck !== 'RESET') {
      alert('ยกเลิกการรีเซ็ต ข้อมูลแค็ตตาล็อกปลอดภัย');
      return;
    }

    try {
      setIsResettingCatalog(true);
      const res = await seedInitialCatalogIfEmpty(true);
      if (currentUser) {
        await logAudit(
          'RESET_CATALOG_173',
          'system',
          'items',
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'Master Admin',
          `รีเซ็ตหรืออัปเดตแค็ตตาล็อกสินค้า 173 รายการ`
        );
      }
      alert(`อัปเดตแค็ตตาล็อกสินค้า 173 รายการเรียบร้อยแล้ว (${res?.count || 173} รายการ)`);
      if (onRefreshItems) onRefreshItems();
    } catch (error) {
      console.error('Catalog reset error:', error);
      alert('เกิดข้อผิดพลาดในการรีเซ็ตแค็ตตาล็อก');
    } finally {
      setIsResettingCatalog(false);
    }
  };

  // Parse legacy stock history CSV: 65Seoul_stock_history_legacy.csv
  const handleLegacyCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        alert('ไฟล์ประวัติไม่มีข้อมูล');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const parsedRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        parsedRows.push({
          date: parts[0] || '2024-01-01',
          code: parts[1] || `ITEM-${i}`,
          name: parts[2] || `สินค้า ${i}`,
          countedStock: parts[3] || '0',
          unit: parts[4] || 'กก.',
          notes: parts[5] || 'ประวัติเดิม',
        });
      }

      setLegacyHistoryRows(parsedRows);
      setLegacyImportMessage(
        `นำเข้าประวัติย้อนหลังจาก ${file.name} จำนวน ${parsedRows.length} รายการสำเร็จ! (ข้อมูลนี้จัดเก็บเป็นคลังประวัติอ้างอิง และไม่มีการเขียนทับยอดปัจจุบันอัตโนมัติตามกฎของร้าน)`
      );

      if (currentUser) {
        await logAudit(
          'IMPORT_LEGACY_HISTORY',
          'system',
          file.name,
          currentUser.uid,
          currentUser.email || '',
          userProfile?.displayName || 'User',
          `นำเข้าประวัติสต็อกเดิม ${parsedRows.length} แถวจาก ${file.name}`
        );
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-zinc-900 text-white">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
              Admin & System Hub • จัดการระบบและนำเข้าข้อมูล
            </h1>
            <p className="text-sm text-zinc-500">
              ควบคุมสิทธิ์ผู้ใช้งาน (RBAC), โหลดแค็ตตาล็อกมาตรฐาน 173 รายการ, นำเข้าประวัติย้อนหลัง และตรวจสอบ Audit Logs
            </p>
          </div>
        </div>
      </div>

      {/* Master Admin Management Board (2 Accounts Maximum) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">
                  ระบบผู้ดูแลระบบสูงสุด (Master Admin คู่ - จำกัด 2 คน)
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  totalMasterAdmins === 2 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  สิทธิ์ที่ใช้งาน: {totalMasterAdmins} / 2 คน
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Master Admin มีสิทธิ์อนุมัติสต็อก, ยืนยันยอดตั้งต้น, อนุมัติบิลจัดซื้อ และจัดการผู้ใช้ทั้งหมด
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              loadUsers();
              loadAdmins();
            }}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>

        {/* 2 Master Admin Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Slot 1: Primary Master Admin */}
          <div className="rounded-2xl p-4 sm:p-5 border-2 border-rose-200 bg-rose-50/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                  <Crown className="w-3 h-3" />
                  Master Admin คนที่ 1 (หลัก)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                  <Lock className="w-3 h-3 text-zinc-400" />
                  สิทธิ์ถาวร
                </span>
              </div>
              <h3 className="font-bold text-zinc-900 text-base">{primaryAdmin.displayName}</h3>
              <p className="text-xs font-mono font-semibold text-zinc-700 mt-1">{primaryAdmin.email}</p>
              <p className="text-[11px] text-zinc-500 mt-2">
                บัญชีผู้ดูแลหลักที่เชื่อมต่อระบบ Firebase และมีสิทธิ์สูงสุดไม่สามารถลบหรือปลดสิทธิ์ได้
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>ยืนยันตัวตนแล้ว (Active)</span>
            </div>
          </div>

          {/* Slot 2: Secondary Master Admin */}
          <div className={`rounded-2xl p-4 sm:p-5 border-2 flex flex-col justify-between ${
            secondAdmin 
              ? 'border-indigo-200 bg-indigo-50/30' 
              : 'border-dashed border-zinc-300 bg-zinc-50/50'
          }`}>
            {secondAdmin ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                      <ShieldCheck className="w-3 h-3" />
                      Master Admin คนที่ 2
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      อนุมัติแล้ว
                    </span>
                  </div>
                  <h3 className="font-bold text-zinc-900 text-base">{secondAdmin.displayName}</h3>
                  <p className="text-xs font-mono font-semibold text-zinc-700 mt-1">{secondAdmin.email}</p>
                  <p className="text-[11px] text-zinc-500 mt-2">
                    ได้รับสิทธิ์ Master Admin เต็มรูปแบบ สามารถอนุมัติสต็อก ตรวจบิล และยืนยันยอดตั้งต้นได้
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {secondAdmin.assignedAt ? `แต่งตั้งเมื่อ: ${new Date(secondAdmin.assignedAt).toLocaleDateString('th-TH')}` : 'เชื่อมต่อแล้ว'}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={handleRemoveSecondAdmin}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 transition-colors shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ถอดถอนสิทธิ์</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-200 text-zinc-700">
                    <UserPlus className="w-3 h-3" />
                    Master Admin คนที่ 2 (ว่าง)
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium">
                    สามารถแต่งตั้งได้อีก 1 บัญชี
                  </span>
                </div>

                <p className="text-xs text-zinc-600 mt-1">
                  เลือกพนักงานที่ต้องการเลื่อนตำแหน่ง หรือพิมพ์อีเมล Google บัญชีที่ 2
                </p>

                {isAdmin ? (
                  <div className="mt-3 space-y-2.5">
                    {/* Quick select from staff */}
                    {usersList.filter(u => u.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()).length > 0 && (
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          เลือกจากพนักงานที่ลงทะเบียนแล้ว:
                        </label>
                        <select
                          value={selectedStaffUid}
                          onChange={(e) => {
                            setSelectedStaffUid(e.target.value);
                            const found = usersList.find(u => u.uid === e.target.value);
                            if (found) setNewAdminEmail(found.email);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white"
                        >
                          <option value="">-- เลือกพนักงาน --</option>
                          {usersList
                            .filter(u => u.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase())
                            .map((u) => (
                              <option key={u.uid} value={u.uid}>
                                {u.displayName} ({u.email})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Email direct entry */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                        หรือระบุ Google Email โดยตรง:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="เช่น manager@gmail.com"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleAppointSecondAdmin(newAdminEmail, selectedStaffUid || undefined)}
                          disabled={isAppointing || !newAdminEmail.trim()}
                          className="px-3.5 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 disabled:opacity-50 transition-colors shrink-0 shadow-xs"
                        >
                          {isAppointing ? 'กำลังบันทึก...' : 'แต่งตั้งเป็น Admin คนที่ 2'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 mt-4">
                    เฉพาะ Master Admin เท่านั้นที่สามารถแต่งตั้งผู้ดูแลระบบคนที่ 2 ได้
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: User Management & Approval Queue (RBAC) */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-zinc-900">
                อนุมัติและจัดการสิทธิ์ผู้ใช้งาน ({usersList.length} บัญชี)
              </h2>
            </div>
            <button
              onClick={loadUsers}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>รีเฟรช</span>
            </button>
          </div>

          {/* Pending Approvals Callout (Priority 1) */}
          {usersList.filter((u) => u.status === 'pending').length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span>มีผู้ใช้งานรอ Master Admin อนุมัติ ({usersList.filter((u) => u.status === 'pending').length} บัญชี)</span>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  รอตรวจสอบ
                </span>
              </div>

              <div className="space-y-3 mt-3">
                {usersList
                  .filter((u) => u.status === 'pending')
                  .map((pendingUser) => (
                    <div
                      key={pendingUser.uid}
                      className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 flex items-center gap-2">
                          <span>{pendingUser.displayName || 'ผู้ใช้งานใหม่'}</span>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            รออนุมัติ
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 mt-0.5 truncate">
                          {pendingUser.email}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          ลงทะเบียนเมื่อ: {new Date(pendingUser.createdAt).toLocaleDateString('th-TH')}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleApproveUser(pendingUser, 'staff')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                          >
                            ✓ อนุมัติเป็น Staff
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveUser(pendingUser, 'viewer')}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-[11px] transition-colors"
                            title="สิทธิ์ดูรายงานอย่างเดียว"
                          >
                            Viewer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectUser(pendingUser)}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors"
                          >
                            ✕ ปฏิเสธ
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <p className="text-xs text-zinc-500 mt-3">
            * Master Admin มีสิทธิ์อนุมัติผู้ใช้งานใหม่ กำหนดบทบาท (Staff / Viewer / Admin) หรือระงับการเข้าถึงได้
          </p>

          <div className="mt-4 divide-y divide-zinc-100 max-h-72 overflow-y-auto">
            {usersList.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">กำลังโหลดรายชื่อผู้ใช้...</p>
            ) : (
              usersList.map((user) => {
                const isPrimary = user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                const isSecondary = secondAdmin && (secondAdmin.email.toLowerCase() === user.email.toLowerCase() || secondAdmin.uid === user.uid);
                const isUserAdmin = isPrimary || isSecondary || user.role === 'master_admin';

                return (
                  <div key={user.uid} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">{user.displayName || 'ผู้ใช้งาน'}</span>
                        {isPrimary ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            Master Admin (1/2)
                          </span>
                        ) : isSecondary ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Master Admin (2/2)
                          </span>
                        ) : user.role === 'viewer' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                            ผู้ดูรายงาน (Viewer)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                            พนักงาน (Staff)
                          </span>
                        )}

                        {/* Status Badge */}
                        {user.status === 'pending' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            รออนุมัติ
                          </span>
                        ) : user.status === 'disabled' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-200 text-zinc-600">
                            ระงับสิทธิ์
                          </span>
                        ) : user.status === 'rejected' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            ปฏิเสธ
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{user.email}</div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {isPrimary ? (
                          <span className="text-[11px] text-zinc-400 font-medium px-2 py-1">
                            ผู้ดูแลหลักถาวร
                          </span>
                        ) : isSecondary ? (
                          <button
                            onClick={() => handleRemoveSecondAdmin()}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            ปลดเป็นพนักงาน
                          </button>
                        ) : (
                          <>
                            {user.status === 'pending' ? (
                              <button
                                onClick={() => handleApproveUser(user, 'staff')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-2xs"
                              >
                                ✓ อนุมัติ
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleUserStatus(user)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                                    user.status === 'disabled'
                                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                  }`}
                                  title={user.status === 'disabled' ? 'เปิดใช้งานบัญชี' : 'ระงับสิทธิ์การใช้งาน'}
                                >
                                  {user.status === 'disabled' ? 'เปิดใช้งาน' : 'ระงับ'}
                                </button>
                                <button
                                  onClick={() => handleToggleRole(user)}
                                  disabled={totalMasterAdmins >= 2}
                                  className="px-2 py-1 rounded-lg border border-zinc-200 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                  title={totalMasterAdmins >= 2 ? 'มี Master Admin ครบ 2 คนแล้ว' : 'แต่งตั้งเป็น Master Admin คนที่ 2'}
                                >
                                  {totalMasterAdmins >= 2 ? 'Admin เต็ม' : '+Admin'}
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Box 2: Catalog Seeding & Database Operations */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-200">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-zinc-900">
              จัดการฐานข้อมูลสินค้า (173 Item Master Catalog)
            </h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-900">รายการสินค้าในระบบปัจจุบัน:</span>
                  <div className="text-xl font-bold text-zinc-900 mt-0.5">{items.length} รายการ</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">หมวดหมู่มาตรฐาน:</span>
                  <div className="text-sm font-semibold text-zinc-700">11 หมวดเกาหลี</div>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-2">
                <button
                  onClick={handleForceResetCatalog}
                  disabled={isResettingCatalog}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isResettingCatalog ? 'animate-spin' : ''}`} />
                  <span>
                    {isResettingCatalog
                      ? 'กำลังอัปเดตแค็ตตาล็อก...'
                      : 'นำเข้า / ซิงค์แค็ตตาล็อก 173 รายการ 11 หมวดอัตโนมัติ'}
                  </span>
                </button>
                <p className="text-[11px] text-zinc-500 mt-1.5 text-center">
                  * จะโหลดหรืออัปเดตรายการสินค้ามาตรฐานทั้ง 173 รายการของ 65 Seoul เข้าสู่ Cloud Firestore
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legacy History Import Box (65Seoul_stock_history_legacy.csv) */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                นำเข้าประวัติสต็อกย้อนหลัง (Legacy Stock History)
              </h2>
              <p className="text-xs text-zinc-500">
                รองรับไฟล์ <span className="font-mono font-bold text-zinc-800">65Seoul_stock_history_legacy.csv</span> เพื่อใช้ตรวจสอบเปรียบเทียบในอดีต
              </p>
            </div>
          </div>

          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-xs">
              <Upload className="w-3.5 h-3.5 text-zinc-500" />
              <span>เลือกไฟล์ 65Seoul_stock_history_legacy.csv</span>
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleLegacyCSVUpload}
              className="hidden"
            />
          </label>
        </div>

        {legacyImportMessage && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{legacyImportMessage}</span>
          </div>
        )}

        {legacyHistoryRows.length > 0 && (
          <div className="mt-4 border border-zinc-200 rounded-xl overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-700 font-bold sticky top-0">
                <tr>
                  <th className="p-2.5">วันที่ประวัติ</th>
                  <th className="p-2.5">รหัสสินค้า</th>
                  <th className="p-2.5">ชื่อสินค้า</th>
                  <th className="p-2.5 text-center">ยอดนับในอดีต</th>
                  <th className="p-2.5 text-center">หน่วย</th>
                  <th className="p-2.5">หมายเหตุประวัติ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {legacyHistoryRows.slice(0, 30).map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="p-2.5 font-mono text-zinc-600">{row.date}</td>
                    <td className="p-2.5 font-mono font-bold text-zinc-900">{row.code}</td>
                    <td className="p-2.5 font-medium text-zinc-800">{row.name}</td>
                    <td className="p-2.5 text-center font-mono font-bold">{row.countedStock}</td>
                    <td className="p-2.5 text-center text-zinc-600">{row.unit}</td>
                    <td className="p-2.5 text-zinc-500">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Audit Logs */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-zinc-900">
              บันทึกกิจกรรมระบบ (Immutable Audit Logs)
            </h2>
          </div>
          <button
            onClick={loadLogs}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>รีเฟรชประวัติ</span>
          </button>
        </div>

        <div className="mt-4 divide-y divide-zinc-100 max-h-80 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-zinc-400 py-6 text-center">ยังไม่มีประวัติกิจกรรมในระบบ</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-zinc-500">{log.entityType}</span>
                    <span className="text-[10px] text-zinc-400">
                      โดย: {log.userName} ({log.userEmail})
                    </span>
                  </div>
                  <p className="text-zinc-700 mt-1">{log.details}</p>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString('th-TH')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
