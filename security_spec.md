# Security Specification for ESSENYA Ecosistema

## Data Invariants
1. **User Identity**: A user document must match the authenticated `auth.uid`. Roles must be strictly constrained and immutable by the user once set (except by admins).
2. **Profile Integrity**: Client and Therapist profiles must be linked to a valid User document. Users cannot modify administrative fields like `membershipTier` or `estado`.
3. **Booking Lifecycle**: Bookings must follow a strict state transition: `pendiente` -> `aceptada` -> `en_camino` -> `en_servicio` -> `servicio_finalizado`. Clients can only create bookings for themselves.
4. **Financial Security**: Prices and totals must be positive numbers. Clients cannot modify the price once a booking is created.
5. **Emergency Response**: Panic alerts are strictly write-only for users and read/update for admins. Users can only create alerts for their own UID.
6. **Administrative Control**: Access to administrative collections (`admins`, `configuraciones`, `audit_logs`) is strictly reserved for verified administrators.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing**:
   - Collection: `users`
   - Payload: `{ "uid": "other_user_id", "rol": "cliente", ... }`
   - Expected: `PERMISSION_DENIED` (UID must match `auth.uid`).

2. **Privilege Escalation (Self-Admin)**:
   - Collection: `users`
   - Payload: `{ "uid": "my_uid", "rol": "administrador", ... }`
   - Expected: `PERMISSION_DENIED` (Users cannot self-assign `administrador` role).

3. **Resource Hijacking (Profile Update)**:
   - Collection: `clientes`
   - Operation: `update` on `other_client_id`
   - Expected: `PERMISSION_DENIED` (Only owner or admin can update).

4. **State Shortcut (Instant Completion)**:
   - Collection: `reservas`
   - Payload update: `{ "state": "servicio_finalizado" }` on a `pendiente` booking.
   - Expected: `PERMISSION_DENIED` (Must follow state machine or be admin).

5. **Price Tampering**:
   - Collection: `reservas`
   - Payload: `{ "total": 0, "serviceId": "premium_massage", ... }`
   - Expected: `PERMISSION_DENIED` (Price must be valid/positive).

6. **Shadow Fields (Verification Injection)**:
   - Collection: `clientes`
   - Payload update: `{ "isVerified": true, "extra_credit": 1000 }`
   - Expected: `PERMISSION_DENIED` (Strict schema validation).

7. **Unauthorized Catalog Write**:
   - Collection: `servicios`
   - Operation: `update` by a client.
   - Expected: `PERMISSION_DENIED` (Admin only).

8. **Audit Log Deletion**:
   - Collection: `audit_logs`
   - Operation: `delete` by a client.
   - Expected: `PERMISSION_DENIED` (Admin only).

9. **PII Leak (List Scraping)**:
   - Collection: `clientes`
   - Operation: `list` query without `where(userId == auth.uid)`
   - Expected: `PERMISSION_DENIED` (Query enforcer).

10. **Panic Alert Resolution Hijack**:
    - Collection: `alertas_panico`
    - Operation: `update` status to `resuelta` by a therapist.
    - Expected: `PERMISSION_DENIED` (Only admin can resolve).

11. **Timestamp Spoofing**:
    - Collection: `reservas`
    - Payload: `{ "createdAt": "2020-01-01T00:00:00Z" }`
    - Expected: `PERMISSION_DENIED` (Must use `request.time`).

12. **Role Manipulation (Client updating Tier)**:
    - Collection: `clientes`
    - Payload update: `{ "membershipTier": "Imperial VIP" }`
    - Expected: `PERMISSION_DENIED` (Admin-only field).
