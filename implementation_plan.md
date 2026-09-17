# Implementation Plan - LocalStorage PII Removal Audit

## Security Threat Model

### Component Overview
Ecosistema ESSENYA: Apps de Cliente, Terapeuta y Administrador basadas en React + Firestore. El sistema maneja PII crítica (Datos bancarios, Identificaciones, Ubicaciones en tiempo real).

### Entry Points and Untrusted Inputs
| Entry Point | Type | Trusted? | Validation |
|---|---|---|---|
| Auth Forms | UI Input | No | Regex + Strength checks |
| Profile Settings | UI Input | No | Server-side Firestore Rules |
| Browser Storage | LocalStorage | No | **Target of this Audit** |

### Sensitive Data Paths
| Data Type | Source | Destination | Protection |
|---|---|---|---|
| Therapist PII | Firestore (Private) | Admin UI | Auth-locked, Not stored locally |
| Client Address | Firestore | Client UI | Auth-locked, Not stored locally |
| Auth State | Firebase Auth | React Context | In-memory only |

### Priority Review Areas
1. `src/shared/context/AuthContext.tsx`: Ensure no session data is persisted to localStorage.
2. `src/shared/context/EcosystemContext.tsx`: Verify offline queue is strictly in-memory.
3. `src/shared/utils/authValidations.ts`: Audit lockout hashes.

## Verification Plan

### Security Verification
- **Security Scan**: Manual inspection of all `localStorage` calls.
- **Security Audit**: Verify that sensitive fields (CURP, INE, CLABE) never touch the storage layer.
- **State Check**: Ensure app functionality remains intact using Firestore subscriptions after removing any potential storage fallbacks.
