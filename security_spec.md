# Security Specification - 65 SEOUL | Stock & Purchase Hub

## 1. Data Invariants
1. A stock check cannot be created or modified by unauthenticated users.
2. Only Master Admins can confirm base stocks, approve stock checks, approve purchases, and manage item master catalog.
3. Users can only edit stock checks while they are in 'draft' status. Once 'submitted', only admins can change status to 'approved' or 'rejected'.
4. Base stock cannot be modified automatically by legacy history without Master Admin explicit action.
5. Purchases can be submitted for review by staff, but status change to 'approved' or 'rejected' and inventory balance addition requires Master Admin permission.
6. Audit logs are append-only; update and delete operations are strictly prohibited.
7. Admin lookup collection `/admins/{adminId}` is strictly read-only for authentication verification and only editable by Master Admins.

## 2. The Dirty Dozen Payloads & Test Scenarios
1. **Unauthenticated Read/Write**: Attempting to read `/items` or `/stockChecks` without authentication -> DENIED.
2. **Staff Privilege Escalation**: Staff user trying to create `/admins/{uid}` to grant themselves Master Admin -> DENIED.
3. **Staff Self-Role Change**: Staff user updating their own `/users/{uid}` role to 'master_admin' -> DENIED.
4. **Draft Hijack**: Staff member editing another staff's locked or approved stock check document -> DENIED.
5. **Direct Purchase Self-Approval**: Staff user inserting a purchase directly with `status: 'approved'` -> DENIED (must start as `pending_approval`).
6. **Stock Modification Bypass**: Direct stock increment on item without going through approved PurchaseBill or confirmed Master Admin action -> DENIED.
7. **Audit Log Tampering**: Any user attempting `DELETE` or `UPDATE` on `/auditLogs/{id}` -> DENIED.
8. **Malicious Long String**: Document containing 1MB junk title or ID poisoning -> DENIED (`isValidId` and `.size()` constraints).
9. **Fake Email Admin**: Token with unverified email matching admin address -> DENIED (`email_verified == true`).
10. **Terminal State Mutation**: Updating a purchase bill that has already been 'approved' or 'rejected' without admin authority -> DENIED.
11. **Negative Stock Value**: Inserting negative currentStock or minStock -> DENIED.
12. **Ghost Fields Injection**: Adding undeclared shadow properties like `isAdmin: true` into arbitrary documents -> DENIED.
