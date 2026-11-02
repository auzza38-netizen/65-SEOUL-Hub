import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AuditLog } from '../types';

const AUDIT_COLLECTION = 'auditLogs';

export const logAudit = async (
  action: string,
  entityType: AuditLog['entityType'],
  entityId: string,
  userId: string,
  userEmail: string,
  userName: string,
  details: string
) => {
  try {
    const id = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const logRef = doc(db, AUDIT_COLLECTION, id);
    const data: AuditLog = {
      id,
      action,
      entityType,
      entityId,
      userId,
      userEmail,
      userName,
      details,
      timestamp: new Date().toISOString(),
    };
    await setDoc(logRef, data);
  } catch (error) {
    // Non-blocking for UI, log in console
    console.error('Audit log failed:', error);
  }
};

export const fetchRecentAuditLogs = async (maxCount = 50): Promise<AuditLog[]> => {
  try {
    const q = query(collection(db, AUDIT_COLLECTION), orderBy('timestamp', 'desc'), limit(maxCount));
    const snap = await getDocs(q);
    const logs: AuditLog[] = [];
    snap.forEach((d) => {
      logs.push(d.data() as AuditLog);
    });
    return logs;
  } catch (error) {
    console.warn('Fetch audit logs warning:', error);
    return [];
  }
};
