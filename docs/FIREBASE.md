# NeuroCraft — Firebase Integration & Cloud Sync Guide

**Architecture**: Local-First Hybrid (Local SQLite Analysis + Optional Cloud Firestore Sync)  
**Firebase SDK Version**: Web Modular SDK v11+ / v12  
**Security Level**: Strict Per-User Tenant Isolation  

---

## 1. Overview & Core Architecture

NeuroCraft implements a **Local-First, Cloud-Enhanced** architecture.

```
                 ┌──────────────────────────────────────┐
                 │          FRONTEND (React 18)         │
                 │   Modular UI + Centralized State     │
                 └───────────────┬──────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
       Firebase Web Client                FastAPI Backend
       (Auth + Cloud Sync)             (Core Analysis Engine)
                 │                               │
        ┌────────┴────────┐             ┌────────┴────────┐
        │  Authentication │             │ Binary Scanner  │
        │  User Profile   │             │ Recon Engine    │
        │  Cloud Metadata │             │ Quantum Trust   │
        └────────┬────────┘             │ Security Reports│
                 │                      └────────┬────────┘
                 ▼                               ▼
          Cloud Firestore                  Local SQLite
     (users/{uid}/scans/...)           (neurocraft.db)
```

### Critical Architectural Guarantees:
1. **Local-First Mandate**: SQLite (`neurocraft.db`) remains the primary local storage for binary analysis, file findings, website reconnaissance, and quantum simulations.
2. **Zero Dependency on Cloud for Analysis**: If the user is offline, unauthenticated, or if Firebase credentials are omitted, the entire core analysis engine operates with 100% functionality and zero crashes.
3. **Zero Raw Binary Storage in Firestore**: Executable binaries, payloads, and untrusted files are **NEVER** uploaded to Cloud Firestore or cloud storage. Only structured metadata (SHA-256 digests, Authenticode status, Shannon entropy scores, and Merkle root proofs) are synced.

---

## 2. Environment Variables

Frontend configuration uses Vite environment conventions (`VITE_FIREBASE_*`).

Add these to your local `.env` or deployment environment (e.g. Vercel Project Settings):

```bash
# ------------------------------------------------------------------------------
# Firebase Client & Cloud Sync (apps/web)
# ------------------------------------------------------------------------------
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=neurocraft-cybersecurity.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neurocraft-cybersecurity
VITE_FIREBASE_STORAGE_BUCKET=neurocraft-cybersecurity.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ------------------------------------------------------------------------------
# Optional Server-side Firebase Project Identifier (services/api)
# ------------------------------------------------------------------------------
FIREBASE_PROJECT_ID=neurocraft-cybersecurity
```

> [!IMPORTANT]
> **Secret Hygiene**: Frontend `VITE_FIREBASE_*` variables contain public Firebase project identifiers. Server-side private keys, service account JSON files, or administrative secrets must **NEVER** be committed to Git or exposed in client bundles.

---

## 3. Centralized Firebase Service Module

All Firebase initialization is centralized in:  
`apps/web/src/firebase/config.ts`

- Single instance initialization: Prevents duplicate `initializeApp()` calls.
- Graceful Degradation: If `VITE_FIREBASE_API_KEY` is not detected, exports `null` for `auth` and `db` without crashing the application.
- Exposes `isFirebaseConfigured(): boolean` for conditional UI capabilities.

---

## 4. Authentication Flow & Centralized State

Managed via `apps/web/src/context/AuthContext.tsx` and consumed via the `useAuth()` hook.

### Supported Operations:
1. **Sign Up (`signup(email, password, displayName)`)**:
   - Creates user in Firebase Authentication.
   - Updates `displayName` in user profile.
   - Automatically initializes a user profile document in Cloud Firestore at `users/{uid}`.
2. **Sign In (`login(email, password)`)**:
   - Authenticates with Firebase Auth.
   - Extracts Firebase ID Token and stores it in `localStorage["nc_token"]` for backend API request authorization.
3. **Session Restoration (`onAuthStateChanged`)**:
   - Automatically restores user session on browser refresh.
   - Synchronizes display name, email, and role.
4. **Sign Out (`logout()`)**:
   - Calls Firebase `signOut(auth)`.
   - Clears `nc_token` and resets frontend user context.
   - Closes active Firestore snapshot listeners via `clearUserSyncListeners()`.

### Error Mapping:
Raw Firebase error codes are automatically translated into human-readable security notifications:
- `auth/invalid-credential` / `auth/wrong-password` → *"Invalid email address or password. Please check your credentials."*
- `auth/email-already-in-use` → *"An account with this email address already exists. Please sign in instead."*
- `auth/weak-password` → *"Password is too weak. Please choose a password with at least 6 characters."*
- `auth/network-request-failed` → *"Network connection unavailable. Operating in offline mode."*

---

## 5. Cloud Firestore Schema & Data Isolation

### Document Hierarchy:
```
users/{uid}
  ├── displayName: string
  ├── email: string
  ├── role: "user" | "analyst" | "admin"
  ├── createdAt: ISO 8601 Timestamp
  ├── updatedAt: ISO 8601 Timestamp
  │
  ├── scans/{scanId}
  │     ├── scanId: string
  │     ├── userId: string
  │     ├── fileName: string
  │     ├── fileSize: number
  │     ├── fileType: string
  │     ├── sha256: string
  │     ├── verdict: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  │     ├── riskScore: number
  │     ├── findingsCount: number
  │     ├── engines: Record<string, string>
  │     ├── createdAt: ISO 8601 Timestamp
  │     ├── updatedAt: ISO 8601 Timestamp
  │     └── syncStatus: "synced"
  │
  ├── reports/{reportId}
  │     ├── reportId: string
  │     ├── scanId: string
  │     ├── userId: string
  │     ├── title: string
  │     ├── reportType: string
  │     ├── merkleRoot: string
  │     ├── signature: string
  │     ├── createdAt: ISO 8601 Timestamp
  │     └── syncStatus: "synced"
  │
  └── settings/{settingId}
        ├── preferences: Record<string, any>
        └── updatedAt: ISO 8601 Timestamp
```

---

## 6. Firestore Security Rules

Stored in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny all unspecified collections
    match /{document=**} {
      allow read, write: if false;
    }

    // Authenticated user private root document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /scans/{scanId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /reports/{reportId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /settings/{settingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Security Invariants:
- **Tenant Isolation**: User A (`request.auth.uid == "userA"`) cannot read, write, or enumerate documents under `users/userB/`.
- **Zero Public Access**: Unauthenticated requests are rejected immediately.
- **No Wildcard Write**: No `allow read, write: if true;` rules exist.

---

## 7. Offline Sync Queue & Conflict Resolution

Implemented in `apps/web/src/services/syncService.ts`.

### Offline Lifecycle:
1. **Local Scan Execution**: When a scan completes locally via FastAPI + SQLite, `syncScanMetadata(userId, result)` is called.
2. **Network Detection**:
   - If **Online**: Directly writes metadata to `users/{userId}/scans/{scanId}`.
   - If **Offline** (or network error occurs): Enqueues item into `localStorage["nc_offline_sync_queue"]` with `syncStatus: "pending"`.
3. **Reconnection Flush**:
   - A window listener listens for the browser `online` event.
   - Automatically flushes all pending queue items to Cloud Firestore.
   - Updates `syncStatus: "synced"`.

### Conflict Handling Strategy (Last-Write-Wins with Timestamp Comparison):
- Each record includes an ISO 8601 `updatedAt` timestamp.
- Before committing, the sync engine checks the remote document's `updatedAt`.
- If local `updatedAt >= remote.updatedAt`, the local version is committed.
- If remote `updatedAt > local.updatedAt`, the cloud version is retained to prevent overwriting newer updates made on other workstations.

---

## 8. FastAPI Backend Token Compatibility

In `services/api/src/neurocraft_api/auth.py`:
- `decode_access_token` inspects token issuers:
  - **Firebase ID Tokens**: `iss` starting with `https://securetoken.google.com/{project_id}`. Extracts `sub` as the user UID and maps token claims into `UserContext`.
  - **Local Development Tokens**: Cryptographically validates signature against `SECRET_KEY` using HMAC-SHA256.
- This allows seamless interoperability: the frontend can pass Firebase ID tokens or local tokens to FastAPI endpoints interchangeably.

---

## 9. Deployment Configuration

- **Vercel Deployment**: Fully preserved. Vercel continues to build `apps/web/dist` and serve FastAPI routes through `api/index.py`. Set `VITE_FIREBASE_*` variables in Vercel Project Settings.
- **Firebase CLI**: Configured via `firebase.json` pointing to `firestore.rules` and `.firebaserc` for project mapping.

---

<div align="center">
  <sub>NeuroCraft Cybersecurity Platform • Detect. Verify. Prove.</sub>
</div>
