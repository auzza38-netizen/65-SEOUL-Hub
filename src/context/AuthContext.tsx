import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  signOut as fbSignOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, testConnection } from '../firebase';
import { AppUser, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isApproved: boolean;
  isPendingApproval: boolean;
  isRejected: boolean;
  signInWithGoogle: (useRedirect?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  isInAppBrowser: boolean;
  isMobileDevice: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MASTER_ADMIN_EMAILS = [
  'auzza38@gmail.com',
  'info.65seoulbbqnongkha@gmail.com',
];

export const isMasterAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return MASTER_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Detect environment (mobile and in-app browsers like LINE, FB, IG)
  const isMobileDevice = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isInAppBrowser = typeof navigator !== 'undefined' && /Line\/|FBAV|FBAN|Instagram|TikTok/i.test(navigator.userAgent);

  const clearAuthError = () => setAuthError(null);

  // Load user profile from Firestore or initialize
  const syncUserProfile = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDocRef);

      const isHardcodedAdmin = isMasterAdminEmail(user.email);

      // Check if document exists in admins collection (supports up to 2 Master Admins)
      let isAdminRole = isHardcodedAdmin;
      if (!isAdminRole && user.email) {
        try {
          const adminDocByUid = await getDoc(doc(db, 'admins', user.uid));
          if (adminDocByUid.exists()) {
            isAdminRole = true;
          } else {
            const adminDocByEmail = await getDoc(doc(db, 'admins', user.email.toLowerCase()));
            if (adminDocByEmail.exists()) {
              isAdminRole = true;
            }
          }
        } catch {
          // Ignore lookup fail for standard users
        }
      }

      // Auto-ensure admin document in /admins collection if user is an authorized Master Admin
      if (isAdminRole) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            uid: user.uid,
            email: (user.email || '').toLowerCase(),
            assignedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.warn('Could not auto-sync admin doc by UID:', e);
        }
        if (user.email) {
          try {
            await setDoc(doc(db, 'admins', user.email.toLowerCase()), {
              uid: user.uid,
              email: user.email.toLowerCase(),
              assignedAt: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {
            console.warn('Could not auto-sync admin doc by Email:', e);
          }
        }
      }

      if (userSnapshot.exists()) {
        const data = userSnapshot.data() as AppUser;
        // If master admin, ensure profile role is master_admin and status is active
        if (isAdminRole) {
          if (data.role !== 'master_admin' || data.status !== 'active') {
            const updated: AppUser = {
              ...data,
              role: 'master_admin' as UserRole,
              status: 'active',
              photoURL: user.photoURL || data.photoURL,
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, updated, { merge: true });
            setUserProfile(updated);
          } else {
            setUserProfile(data);
          }
        } else {
          setUserProfile(data);
        }
      } else {
        // Create initial profile - Non-admins start as 'pending' awaiting Master Admin approval
        const newProfile: AppUser = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || (isAdminRole ? 'Master Admin' : 'ผู้ใช้งาน'),
          role: isAdminRole ? 'master_admin' : 'staff',
          status: isAdminRole ? 'active' : 'pending',
          photoURL: user.photoURL || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (error) {
      console.error('Failed to sync user profile:', error);
      // Fallback in-memory profile so master admin is not locked out
      const isHardcodedAdmin = isMasterAdminEmail(user.email);
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (isHardcodedAdmin ? 'Master Admin' : 'ผู้ใช้งาน'),
        role: isHardcodedAdmin ? 'master_admin' : 'staff',
        status: isHardcodedAdmin ? 'active' : 'pending',
        photoURL: user.photoURL || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    testConnection();

    // Ensure session persistence across multiple tabs/devices
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Set persistence warning:', err);
    });

    // Handle redirect login results for mobile devices
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await syncUserProfile(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check notice:', err);
        if (err?.code === 'auth/unauthorized-domain') {
          setAuthError('โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Auth กรุณาแจ้งผู้ดูแลระบบ');
        }
      });

    let userSnapshotUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (userSnapshotUnsub) {
        userSnapshotUnsub();
        userSnapshotUnsub = null;
      }

      if (user) {
        await syncUserProfile(user);

        // Real-time listener for user approval status changes
        userSnapshotUnsub = onSnapshot(
          doc(db, 'users', user.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as AppUser;
              setUserProfile((prev) => {
                const isAdminEmail = isMasterAdminEmail(user.email);
                return {
                  ...(prev || {}),
                  ...data,
                  role: isAdminEmail ? 'master_admin' : data.role,
                  status: isAdminEmail ? 'active' : data.status,
                } as AppUser;
              });
            }
          },
          (err) => {
            console.warn('Live user profile sync note:', err.message);
          }
        );
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (userSnapshotUnsub) {
        userSnapshotUnsub();
      }
    };
  }, []);

  const signInWithGoogle = async (useRedirect = false) => {
    try {
      setLoading(true);
      setAuthError(null);

      // If user is on mobile or explicitly asked for redirect
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      try {
        const res = await signInWithPopup(auth, googleProvider);
        if (res.user) {
          await syncUserProfile(res.user);
        }
      } catch (popupError: any) {
        console.warn('Popup attempt notice:', popupError);
        // If popup was blocked by mobile browser (Safari, Chrome) or closed
        if (
          popupError.code === 'auth/popup-blocked' ||
          popupError.code === 'auth/cancelled-popup-request' ||
          isMobileDevice
        ) {
          console.log('Switching to redirect mode for mobile / popup blocked...');
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupError;
      }
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      let errorMsg = 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ';
      if (error?.code === 'auth/popup-blocked') {
        errorMsg = 'เบราว์เซอร์ของคุณบล็อกหน้าต่าง Pop-up กรุณากดปุ่ม "เข้าสู่ระบบด้วยโหมด Redirect (สำหรับมือถือ)" ด้านล่าง';
      } else if (error?.code === 'auth/popup-closed-by-user') {
        errorMsg = 'หน้าต่างเข้าสู่ระบบถูกปิดก่อนทำรายการเสร็จสิ้น กรุณากดเข้าสู่ระบบใหม่อีกครั้ง';
      } else if (error?.code === 'auth/cancelled-popup-request') {
        errorMsg = 'มีการเปิดหน้าต่างเข้าสู่ระบบซ้อนกัน กรุณากดใหม่อีกครั้ง';
      } else if (error?.code === 'auth/network-request-failed') {
        errorMsg = 'เครือข่ายอินเทอร์เน็ตมีปัญหา กรุณาตรวจสอบการเชื่อมต่อและลองใหม่';
      } else if (error?.message) {
        errorMsg = `เกิดข้อผิดพลาด: ${error.message}`;
      }
      setAuthError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await syncUserProfile(currentUser);
    }
  };

  const isAdmin = userProfile?.role === 'master_admin' || isMasterAdminEmail(currentUser?.email);
  const isStaff = !isAdmin;
  const isApproved = isAdmin || userProfile?.status === 'active';
  const isPendingApproval = Boolean(currentUser && !isAdmin && userProfile?.status === 'pending');
  const isRejected = Boolean(currentUser && !isAdmin && (userProfile?.status === 'rejected' || userProfile?.status === 'disabled'));

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isStaff,
        isApproved,
        isPendingApproval,
        isRejected,
        signInWithGoogle,
        signOut,
        refreshProfile,
        authError,
        clearAuthError,
        isInAppBrowser,
        isMobileDevice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
