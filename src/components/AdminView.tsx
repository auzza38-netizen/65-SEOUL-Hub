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
  Upload, 
  Lock, 
  UserPlus, 
  Crown,
  Search,
  Sliders,
  Settings,
  X,
  Check,
  Briefcase,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Eye,
  DollarSign,
  Boxes,
  Receipt,
  TrendingUp,
  FileText
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppUser, AuditLog, ItemMaster, UserPermissions, UserRole, UserStatus } from '../types';
import { fetchRecentAuditLogs, logAudit } from '../services/auditService';
import { seedInitialCatalogIfEmpty } from '../services/itemService';
import { useAuth, getDefaultPermissionsForRole } from '../context/AuthContext';

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

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Edit User Permissions Modal State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editPosition, setEditPosition] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(getDefaultPermissionsForRole('staff'));
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPosition, setNewUserPosition] = useState<string>('พนักงานประจำร้าน');
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [newUserStatus, setNewUserStatus] = useState<UserStatus>('active');
  const [newUserPermissions, setNewUserPermissions] = useState<UserPermissions>(getDefaultPermissionsForRole('staff'));
  const [isAddingUser, setIsAddingUser] = useState<boolean>(false);

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
          permissions: getDefaultPermissionsForRole('master_admin'),
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
            permissions: getDefaultPermissionsForRole('staff'),
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
            permissions: getDefaultPermissionsForRole('staff'),
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

  // Open Edit User Permissions Modal
  const handleOpenEditModal = (targetUser: AppUser) => {
    setEditingUser(targetUser);
    setEditDisplayName(targetUser.displayName || '');
    setEditRole(targetUser.role || 'staff');
    setEditStatus(targetUser.status || 'active');
    setEditPosition(targetUser.position || '');
    setEditPhone(targetUser.phone || '');
    setEditNotes(targetUser.notes || '');
    setEditPermissions(
      targetUser.permissions || getDefaultPermissionsForRole(targetUser.role || 'staff')
    );
  };

  // Change Role inside Edit Modal (auto syncs default permissions template)
  const handleRoleSelectInModal = (newRole: UserRole) => {
    setEditRole(newRole);
    setEditPermissions(getDefaultPermissionsForRole(newRole));
  };

  // Toggle single permission inside Edit Modal
  const handleTogglePermission = (key: keyof UserPermissions) => {
    setEditPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save User Permissions Changes
  const handleSaveUserPermissions = async () => {
    if (!isAdmin || !currentUser || !editingUser) return;

    // Protection: Primary Master Admin cannot be demoted or disabled
    if (editingUser.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      if (editRole !== 'master_admin' || editStatus !== 'active') {
        alert('Master Admin หลัก (auzza38@gmail.com) ต้องมีสถานะ Active และบทบาท Master Admin เสมอ');
        return;
      }
    }

    // Protection: Max 2 master admins
    if (editRole === 'master_admin' && editingUser.role !== 'master_admin') {
      if (totalMasterAdmins >= 2 && editingUser.email.toLowerCase() !== secondAdmin?.email.toLowerCase()) {
        alert(`ไม่สามารถปรับเป็น Master Admin ได้ เนื่องจากจำกัดไม่เกิน 2 คน (ปัจจุบันมี ${PRIMARY_ADMIN_EMAIL} และ ${secondAdmin?.email})`);
        return;
      }
    }

    try {
      setIsSavingUser(true);
      const now = new Date().toISOString();
      const approverName = userProfile?.displayName || currentUser.displayName || 'Master Admin';

      const updateData: Partial<AppUser> = {
        displayName: editDisplayName.trim() || editingUser.email.split('@')[0],
        role: editRole,
        status: editStatus,
        position: editPosition.trim() || undefined,
        phone: editPhone.trim() || undefined,
        notes: editNotes.trim() || undefined,
        permissions: editPermissions,
        updatedAt: now,
      };

      // If status changed from pending to active, mark approval info
      if (editingUser.status === 'pending' && editStatus === 'active') {
        updateData.approvedBy = currentUser.uid;
        updateData.approvedByName = approverName;
        updateData.approvedAt = now;
      }

      await updateDoc(doc(db, 'users', editingUser.uid), updateData);

      // Handle /admins collection sync
      if (editRole === 'master_admin') {
        await setDoc(doc(db, 'admins', editingUser.uid), {
          uid: editingUser.uid,
          email: editingUser.email.toLowerCase(),
          assignedAt: now,
        }, { merge: true });
        if (editingUser.email) {
          await setDoc(doc(db, 'admins', editingUser.email.toLowerCase()), {
            uid: editingUser.uid,
            email: editingUser.email.toLowerCase(),
            assignedAt: now,
          }, { merge: true });
        }
      } else if (editingUser.role === 'master_admin') {
        // Demoted from master admin
        try {
          await deleteDoc(doc(db, 'admins', editingUser.uid));
          if (editingUser.email) {
            await deleteDoc(doc(db, 'admins', editingUser.email.toLowerCase()));
          }
        } catch (e) {
          console.warn('Remove from admins doc warning:', e);
        }
      }

      await logAudit(
        'UPDATE_USER_PERMISSIONS',
        'user',
        editingUser.uid,
        currentUser.uid,
        currentUser.email || '',
        approverName,
        `แก้ไขสิทธิ์ผู้ใช้งาน ${editingUser.displayName} (${editingUser.email}): บทบาท=${editRole}, สถานะ=${editStatus}, ตำแหน่ง=${editPosition || '-'}`
      );

      await loadUsers();
      await loadAdmins();
      setEditingUser(null);
      alert(`บันทึกสิทธิ์ของ ${editingUser.displayName} เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Save permissions error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกสิทธิ์: ' + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  // Delete User Account
  const handleDeleteUser = async (targetUser: AppUser) => {
    if (!isAdmin || !currentUser) return;

    if (targetUser.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      alert('ไม่สามารถลบ Master Admin หลัก (auzza38@gmail.com) ออกจากระบบได้');
      return;
    }

    const confirmDelete = window.confirm(
      `⚠️ ยืนยันการลบผู้ใช้ "${targetUser.displayName} (${targetUser.email})" ออกจากระบบ 65 SEOUL?\n\nการกระทำนี้จะลบบัญชีและสิทธิ์ทั้งหมดของผู้ใช้นี้`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'users', targetUser.uid));

      // Remove from /admins if existed
      try {
        await deleteDoc(doc(db, 'admins', targetUser.uid));
        if (targetUser.email) {
          await deleteDoc(doc(db, 'admins', targetUser.email.toLowerCase()));
        }
      } catch {}

      await logAudit(
        'DELETE_USER',
        'user',
        targetUser.uid,
        currentUser.uid,
        currentUser.email || '',
        userProfile?.displayName || 'Master Admin',
        `ลบผู้ใช้งาน ${targetUser.displayName} (${targetUser.email}) ออกจากระบบ`
      );

      await loadUsers();
      await loadAdmins();
      if (editingUser?.uid === targetUser.uid) {
        setEditingUser(null);
      }
      alert(`ลบผู้ใช้ ${targetUser.email} ออกจากระบบเรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Delete user error:', err);
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้: ' + err.message);
    }
  };

  // Master Admin approves pending user directly
  const handleApproveUser = async (targetUser: AppUser, assignedRole: UserRole) => {
    if (!isAdmin || !currentUser) return;

    try {
      const now = new Date().toISOString();
      const approverName = userProfile?.displayName || currentUser.displayName || 'Master Admin';

      await updateDoc(doc(db, 'users', targetUser.uid), {
        status: 'active',
        role: assignedRole,
        permissions: getDefaultPermissionsForRole(assignedRole),
        approvedBy: currentUser.uid,
        approvedByName: approverName,
        approvedAt: now,
        updatedAt: now,
      });

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
      alert(`อนุมัติสิทธิ์ให้ ${targetUser.displayName} (${targetUser.email}) เป็น ${assignedRole} เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Approve user error:', err);
      alert('เกิดข้อผิดพลาดในการอนุมัติผู้ใช้: ' + err.message);
    }
  };

  // Master Admin rejects pending user
  const handleRejectUser = async (targetUser: AppUser) => {
    if (!isAdmin || !currentUser) return;
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

  // Add User directly by Admin
  const handleAddUserDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !currentUser) return;

    const cleanEmail = newUserEmail.trim().toLowerCase();
    const cleanName = newUserName.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      alert('กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }
    if (!cleanName) {
      alert('กรุณากรอกชื่อพนักงาน');
      return;
    }

    // Check if user already exists
    if (usersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      alert('มีอีเมลนี้อยู่ในระบบเรียบร้อยแล้ว สามารถค้นหาและแก้ไขสิทธิ์ในตารางด้านล่างได้ทันที');
      return;
    }

    if (newUserRole === 'master_admin' && totalMasterAdmins >= 2) {
      alert('ไม่สามารถเพิ่มเป็น Master Admin ได้ เนื่องจากมีครบ 2 คนแล้ว');
      return;
    }

    try {
      setIsAddingUser(true);
      const now = new Date().toISOString();
      const approverName = userProfile?.displayName || currentUser.displayName || 'Master Admin';
      const syntheticUid = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newRecord: AppUser = {
        uid: syntheticUid,
        email: cleanEmail,
        displayName: cleanName,
        role: newUserRole,
        status: newUserStatus,
        position: newUserPosition.trim() || undefined,
        phone: newUserPhone.trim() || undefined,
        permissions: newUserPermissions,
        approvedBy: currentUser.uid,
        approvedByName: approverName,
        approvedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', syntheticUid), newRecord);

      if (newUserRole === 'master_admin') {
        await setDoc(doc(db, 'admins', cleanEmail), {
          email: cleanEmail,
          uid: syntheticUid,
          assignedAt: now,
        });
      }

      await logAudit(
        'CREATE_NEW_USER',
        'user',
        syntheticUid,
        currentUser.uid,
        currentUser.email || '',
        approverName,
        `เพิ่มผู้ใช้งานใหม่โดยตรง: ${cleanName} (${cleanEmail}) บทบาท=${newUserRole}`
      );

      await loadUsers();
      await loadAdmins();
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      alert(`เพิ่มผู้ใช้งาน ${cleanName} (${cleanEmail}) เรียบร้อยแล้ว`);
    } catch (err: any) {
      console.error('Add user error:', err);
      alert('เกิดข้อผิดพลาดในการเพิ่มผู้ใช้: ' + err.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  // Re-seed master 173 items
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

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      // Search
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = (user.displayName || '').toLowerCase().includes(q);
        const matchEmail = (user.email || '').toLowerCase().includes(q);
        const matchPosition = (user.position || '').toLowerCase().includes(q);
        const matchPhone = (user.phone || '').includes(q);
        if (!matchName && !matchEmail && !matchPosition && !matchPhone) return false;
      }

      // Status
      if (statusFilter !== 'all' && user.status !== statusFilter) {
        return false;
      }

      // Role
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      return true;
    });
  }, [usersList, searchQuery, statusFilter, roleFilter]);

  const pendingUsersCount = usersList.filter((u) => u.status === 'pending').length;

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
              ควบคุมสิทธิ์ผู้ใช้งาน (RBAC), กำหนดสิทธิ์รายบุคคล, โหลดแค็ตตาล็อก 173 รายการ และตรวจสอบ Audit Logs
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

      {/* User Management & Granular Permission Control (RBAC Hub) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900">
                  จัดการสิทธิ์และบทบาทผู้ใช้งาน (User & Role Permission Management)
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                  {usersList.length} บัญชี
                </span>
                {pendingUsersCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                    รออนุมัติ {pendingUsersCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                กำหนดสิทธิ์ละเอียดรายบุคคล (สต็อก, สแกนบิล, บันทึกยอดขาย, ดูการเงิน, สิทธิ์อนุมัติ) และควบคุมสถานะเข้าใช้งาน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setNewUserName('');
                  setNewUserEmail('');
                  setNewUserPhone('');
                  setNewUserRole('staff');
                  setNewUserPermissions(getDefaultPermissionsForRole('staff'));
                  setShowAddUserModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>เพิ่มพนักงานใหม่</span>
              </button>
            )}
            <button
              onClick={loadUsers}
              className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
              title="รีเฟรชรายชื่อ"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Priority: Pending Approvals Queue */}
        {pendingUsersCount > 0 && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span>คำขอเข้าใช้งานใหม่รอ Master Admin อนุมัติ ({pendingUsersCount} บัญชี)</span>
              </div>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                ต้องการการดำเนินการ
              </span>
            </div>

            <div className="space-y-3">
              {usersList
                .filter((u) => u.status === 'pending')
                .map((pendingUser) => (
                  <div
                    key={pendingUser.uid}
                    className="bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-900 flex items-center gap-2">
                        <span>{pendingUser.displayName || 'ผู้ใช้งานใหม่'}</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                          รออนุมัติ
                        </span>
                        {pendingUser.position && (
                          <span className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                            {pendingUser.position}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 mt-0.5 truncate">
                        {pendingUser.email} {pendingUser.phone ? `• โทร ${pendingUser.phone}` : ''}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        ลงทะเบียนเมื่อ: {new Date(pendingUser.createdAt).toLocaleString('th-TH')}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleApproveUser(pendingUser, 'staff')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                        >
                          ✓ อนุมัติเป็น Staff
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveUser(pendingUser, 'cashier')}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[11px] transition-colors"
                        >
                          Cashier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveUser(pendingUser, 'manager')}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[11px] transition-colors"
                        >
                          Manager
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(pendingUser)}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold text-[11px] transition-colors flex items-center gap-1"
                        >
                          <Sliders className="w-3 h-3 text-zinc-500" />
                          <span>กำหนดสิทธิ์ละเอียด</span>
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

        {/* Search & Filter Controls */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, อีเมล, ตำแหน่ง หรือเบอร์โทร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none"
            >
              <option value="all">สถานะทั้งหมด ({usersList.length})</option>
              <option value="active">ใช้งานปกติ (Active)</option>
              <option value="pending">รอการอนุมัติ (Pending)</option>
              <option value="disabled">ระงับสิทธิ์ (Disabled)</option>
              <option value="rejected">ปฏิเสธคำขอ (Rejected)</option>
            </select>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none"
            >
              <option value="all">บทบาททั้งหมด (All Roles)</option>
              <option value="master_admin">Master Admin</option>
              <option value="manager">ผู้จัดการ (Manager)</option>
              <option value="staff">พนักงานประจำ (Staff)</option>
              <option value="cashier">พนักงานแคชเชียร์ (Cashier)</option>
              <option value="viewer">ผู้ดูรายงาน (Viewer)</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-4 border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-700 font-bold sticky top-0 z-10 border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">ผู้ใช้งาน / บัญชี</th>
                  <th className="py-3 px-4">ตำแหน่งงาน</th>
                  <th className="py-3 px-4">บทบาท (Role)</th>
                  <th className="py-3 px-4">สถานะ (Status)</th>
                  <th className="py-3 px-4 hidden lg:table-cell">สิทธิ์การทำงานที่ได้รับ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      กำลังโหลดรายชื่อผู้ใช้...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      ไม่พบข้อมูลผู้ใช้ที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isPrimary = user.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                    const isSecondary = secondAdmin && (secondAdmin.email.toLowerCase() === user.email.toLowerCase() || secondAdmin.uid === user.uid);
                    const perms = user.permissions || getDefaultPermissionsForRole(user.role || 'staff');

                    return (
                      <tr key={user.uid} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPrimary
                                ? 'bg-rose-600 text-white'
                                : user.role === 'manager'
                                ? 'bg-purple-600 text-white'
                                : user.role === 'cashier'
                                ? 'bg-amber-600 text-white'
                                : 'bg-zinc-800 text-white'
                            }`}>
                              {user.displayName?.[0] || user.email[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                                <span className="truncate">{user.displayName || 'ผู้ใช้งาน'}</span>
                                {isPrimary && <Crown className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                              </div>
                              <div className="text-[11px] font-mono text-zinc-500 truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-zinc-700 font-medium">
                            {user.position || 'พนักงานประจำ'}
                          </span>
                          {user.phone && (
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {user.phone}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isPrimary ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                              <Crown className="w-3 h-3" />
                              Master Admin (1/2)
                            </span>
                          ) : isSecondary ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-2xs">
                              <ShieldCheck className="w-3 h-3" />
                              Master Admin (2/2)
                            </span>
                          ) : user.role === 'manager' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              ผู้จัดการ (Manager)
                            </span>
                          ) : user.role === 'cashier' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              แคชเชียร์ (Cashier)
                            </span>
                          ) : user.role === 'viewer' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              ผู้ดูรายงาน (Viewer)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                              พนักงาน (Staff)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              ใช้งานปกติ
                            </span>
                          ) : user.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                              รออนุมัติ
                            </span>
                          ) : user.status === 'disabled' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                              ระงับสิทธิ์
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              ปฏิเสธคำขอ
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {perms.canManageStock && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px]">สต็อก</span>
                            )}
                            {perms.canManagePurchases && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px]">สแกนบิล</span>
                            )}
                            {perms.canManageSales && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px]">ยอดขาย</span>
                            )}
                            {perms.canViewFinance && (
                              <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px]">การเงิน</span>
                            )}
                            {perms.canApproveItems && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">อนุมัติ</span>
                            )}
                            {perms.canManageSystem && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">ระบบ</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(user)}
                                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                                  title="แก้ไขสิทธิ์และข้อมูลผู้ใช้งาน"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>จัดการสิทธิ์</span>
                                </button>

                                {!isPrimary && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserStatus(user)}
                                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                                        user.status === 'disabled'
                                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                      }`}
                                      title={user.status === 'disabled' ? 'เปิดใช้งาน' : 'ระงับการเข้าถึง'}
                                    >
                                      {user.status === 'disabled' ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserX className="w-3.5 h-3.5" />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(user)}
                                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="ลบผู้ใช้"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns for Catalog and Database */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box: Catalog Seeding & Database Operations */}
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

        {/* Box: Legacy History Import */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-bold text-zinc-900">
                  นำเข้าประวัติสต็อกย้อนหลัง (Legacy History)
                </h2>
                <p className="text-xs text-zinc-500">
                  รองรับไฟล์ <span className="font-mono font-bold text-zinc-800">65Seoul_stock_history_legacy.csv</span>
                </p>
              </div>
            </div>

            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-xs">
                <Upload className="w-3.5 h-3.5 text-zinc-500" />
                <span>เลือกไฟล์ CSV</span>
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
            <div className="mt-4 border border-zinc-200 rounded-xl overflow-x-auto max-h-48">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 text-zinc-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-2.5">วันที่</th>
                    <th className="p-2.5">รหัส</th>
                    <th className="p-2.5">ชื่อสินค้า</th>
                    <th className="p-2.5 text-center">ยอดนับ</th>
                    <th className="p-2.5 text-center">หน่วย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {legacyHistoryRows.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="p-2.5 font-mono text-zinc-600">{row.date}</td>
                      <td className="p-2.5 font-mono font-bold text-zinc-900">{row.code}</td>
                      <td className="p-2.5 font-medium text-zinc-800">{row.name}</td>
                      <td className="p-2.5 text-center font-mono font-bold">{row.countedStock}</td>
                      <td className="p-2.5 text-center text-zinc-600">{row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

      {/* MODAL 1: Edit User Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">
                    จัดการสิทธิ์และบทบาทพนักงาน
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    {editingUser.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Profile Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ชื่อ-นามสกุล / ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ตำแหน่งงาน
                  </label>
                  <input
                    type="text"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    placeholder="เช่น ผู้จัดการ, เชฟ, แคชเชียร์"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    สถานะการใช้งานบัญชี (Status)
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500 bg-white"
                  >
                    <option value="active">ใช้งานปกติ (Active)</option>
                    <option value="pending">รอการอนุมัติ (Pending)</option>
                    <option value="disabled">ระงับสิทธิ์ชั่วคราว (Disabled)</option>
                    <option value="rejected">ปฏิเสธคำขอ (Rejected)</option>
                  </select>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  บทบาทหลัก (Role Preset):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['staff', 'cashier', 'manager', 'viewer', 'master_admin'] as UserRole[]).map((r) => {
                    const isSelected = editRole === r;
                    const label = 
                      r === 'master_admin' ? 'Master Admin' :
                      r === 'manager' ? 'Manager' :
                      r === 'cashier' ? 'Cashier' :
                      r === 'viewer' ? 'Viewer' : 'Staff';

                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleSelectInModal(r)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold text-center border transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  * เมื่อเลือกบทบาท ระบบจะปรับแม่แบบสิทธิ์เริ่มต้นให้อัตโนมัติ และคุณสามารถติ๊กปรับรายสิทธิ์ได้ด้านล่าง
                </p>
              </div>

              {/* Granular Permission Toggles */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <span className="block text-xs font-bold text-zinc-800">
                  สิทธิ์การใช้งานระบบแบบละเอียด (Granular Permissions):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageStock}
                      onChange={() => handleTogglePermission('canManageStock')}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-zinc-900">ตรวจนับสต็อก & วัตถุดิบ</div>
                      <div className="text-[10px] text-zinc-400">เช็กยอดสต็อกและดูคลังสินค้า</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManagePurchases}
                      onChange={() => handleTogglePermission('canManagePurchases')}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-zinc-900">สแกนบิลจัดซื้อ OCR</div>
                      <div className="text-[10px] text-zinc-400">ถ่ายรูปบิลและส่งตรวจรับ</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageSales}
                      onChange={() => handleTogglePermission('canManageSales')}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-zinc-900">บันทึกยอดขาย & ค่าจ้าง</div>
                      <div className="text-[10px] text-zinc-400">บุฟเฟต์, A la carte และค่าแรง</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={editPermissions.canViewFinance}
                      onChange={() => handleTogglePermission('canViewFinance')}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-zinc-900">ดูแดชบอร์ด & การเงิน</div>
                      <div className="text-[10px] text-zinc-400">ดูผลกำไร-ขาดทุน และรายงาน</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={editPermissions.canApproveItems}
                      onChange={() => handleTogglePermission('canApproveItems')}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-zinc-900">สิทธิ์อนุมัติบิล & สต็อก</div>
                      <div className="text-[10px] text-zinc-400">อนุมัติบิลและเซฟยอดคงคลัง</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageSystem}
                      onChange={() => handleTogglePermission('canManageSystem')}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <div className="font-semibold text-zinc-900">จัดการระบบและผู้ใช้งาน</div>
                      <div className="text-[10px] text-zinc-400">เพิ่ม/ลดสิทธิ์พนักงาน (Admin)</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  บันทึกช่วยจำของผู้ดูแลระบบ (Admin Notes)
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="เช่น พนักงานพาร์ทไทม์กะเย็น, เริ่มงาน 1 ม.ค."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-zinc-200 flex items-center justify-between">
              {editingUser.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase() ? (
                <button
                  type="button"
                  onClick={() => handleDeleteUser(editingUser)}
                  className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบผู้ใช้</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserPermissions}
                  disabled={isSavingUser}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingUser ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New User Directly */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">
                    เพิ่มพนักงานใหม่โดยตรง (Add New Staff)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    สร้างโปรไฟล์และกำหนดสิทธิ์ให้พนักงานทันทีโดยไม่ต้องรออนุมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserDirectly} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  ชื่อ-นามสกุล / ชื่อเรียกพนักงาน *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี (ต้น)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  อีเมลพนักงาน (ใช้ลงชื่อเข้าใช้งาน) *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="staff@65seoul.com หรือ Gmail"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    ตำแหน่งงาน
                  </label>
                  <select
                    value={newUserPosition}
                    onChange={(e) => setNewUserPosition(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500 bg-white"
                  >
                    <option value="พนักงานประจำร้าน">พนักงานประจำร้าน</option>
                    <option value="ผู้จัดการร้าน">ผู้จัดการร้าน</option>
                    <option value="หัวหน้าครัว / เชฟ">หัวหน้าครัว / เชฟ</option>
                    <option value="พนักงานแคชเชียร์">พนักงานแคชเชียร์</option>
                    <option value="พนักงานจัดซื้อ">พนักงานจัดซื้อ</option>
                    <option value="พนักงานพาร์ทไทม์">พนักงานพาร์ทไทม์</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    เบอร์โทรศัพท์ (ถ้ามี)
                  </label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    บทบาทเริ่มต้น (Role)
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setNewUserRole(r);
                      setNewUserPermissions(getDefaultPermissionsForRole(r));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500 bg-white"
                  >
                    <option value="staff">พนักงานประจำ (Staff)</option>
                    <option value="cashier">พนักงานแคชเชียร์ (Cashier)</option>
                    <option value="manager">ผู้จัดการร้าน (Manager)</option>
                    <option value="viewer">ผู้ดูรายงานอย่างเดียว (Viewer)</option>
                    <option value="master_admin">Master Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={newUserStatus}
                    onChange={(e) => setNewUserStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:border-rose-500 bg-white"
                  >
                    <option value="active">เปิดใช้งานทันที (Active)</option>
                    <option value="pending">รอการอนุมัติ (Pending)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 text-xs font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isAddingUser ? 'กำลังสร้างโปรไฟล์...' : 'สร้างโปรไฟล์ผู้ใช้งาน'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
