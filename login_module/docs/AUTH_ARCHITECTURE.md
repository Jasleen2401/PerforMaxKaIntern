# 🔐 Authentication Module — Comprehensive Architecture & Security Specification

---

## 📌 Module Overview
The **PerforMax Dynamic Authentication & Onboarding Module** provides enterprise-grade authentication, automated credential provisioning, password policy enforcement, and self-service credential recovery for Dailoqa employees and interns.

- **Primary Persona:** New hires, interns, returning employees, managers, administrators.
- **Allowed Dynamic Domains:** `@dailoqa.com` (configurable via `ALLOWED_EMAIL_DOMAINS` in Django settings).
- **Core Security Directives:**
  - Zero plaintext password storage (Django PBKDF2 with SHA-256 iterations).
  - Anti-enumeration protection on all identity lookup and recovery endpoints.
  - Forced first-time password rotation before granting access to dashboard or PMS modules.
  - Revocable, cryptographically signed SHA-256 reset tokens with 15-minute expiration windows.
  - Dual-engine transactional email dispatcher (SMTP + Resend API with automated fallback).

---

## 🔑 Credential Lifecycle & User Journey

```
                              User Enters Email & Password
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │ Existing Account in DB?    │
                            └──────────────┬──────────────┘
                                    NO     │     YES
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
          ┌───────────────────────────┐         ┌───────────────────────────┐
          │ Domain == @dailoqa.com?   │         │ Standard PBKDF2 Check     │
          └─────────────┬─────────────┘         └─────────────┬─────────────┘
                NO      │      YES                            │
        ┌───────────────┘      │                              │
        ▼                      ▼                              │
┌──────────────┐     ┌────────────────────────┐               │
│ 401 Invalid  │     │ Auto-Provision Account │               │
│ Credentials  │     │ Temp Password = Name   │               │
└──────────────┘     │ Flag: change_required  │               │
                     └─────────┬──────────────┘               │
                               │                              │
                               ▼                              │
                     ┌────────────────────────────────────────▼┐
                     │           JWT Token Issued              │
                     │  password_change_required: true / false │
                     └────────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌──────────────────────────┐                    ┌──────────────────────────┐
     │ change_required == true  │                    │ change_required == false │
     │ Routed: /change-password │                    │ Routed: /dashboard       │
     │ ProtectedRoute Hard Lock │                    │ Full Access Granted      │
     └──────────────────────────┘                    └──────────────────────────┘
```

### First-Time Onboarding Sequence
1. **Initial Access**: The intern/employee navigates to `/login` and enters their official corporate email (e.g. `jasleen.kaur@dailoqa.com`).
2. **First-Time Password**: The default credential is their lowercase first name (e.g. `jasleen`).
3. **Dynamic Account Creation**: If the account doesn't already exist, the backend auto-provisions the user, assigns the `INTERN` role, hashes the password via PBKDF2, and sets `password_change_required = True`.
4. **Enforced Interception**: Upon login, the JWT payload and `/api/auth/me/` return `password_change_required: true`.
5. **Route Lock (`ProtectedRoute.tsx`)**: The user cannot browse to `/dashboard`, `/kpi/my`, or any system feature; any attempt redirects immediately to `/change-password`.
6. **Password Rotation**: The user sets a strong new password via `/api/auth/change-password/`. `password_change_required` is cleared (`False`), and `password_changed_at` timestamp is updated.
7. **Invalidation**: The temporary password no longer works. Subsequent logins require the permanent password.

---

## 📡 API Endpoints Specification

| HTTP Method | Route | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/jwt/create/` | Public | Validates credentials or auto-provisions `@dailoqa.com` user; returns JWT access/refresh tokens and `password_change_required` flag |
| `POST` | `/api/auth/jwt/refresh/` | Public | Refreshes access token |
| `GET` | `/api/auth/me/` | Bearer Token | Returns current authenticated user profile, permissions, and `password_change_required` status |
| `POST` | `/api/auth/change-password/` | Bearer Token | Authenticated password rotation; verifies current password, enforces minimum 6 chars, clears change requirement flag |
| `POST` | `/api/auth/forgot-password/` | Public | Submits email for password reset; generates SHA-256 hashed 15-min token; returns anti-enumeration generic message |
| `POST` | `/api/auth/reset-password/` | Public | Consumes raw token string + new password; validates expiration and single-use state; updates password securely |

---

## 🛡️ Security Architecture & Anti-Enumeration Design

### 1. Zero Plaintext Storage
Temporary passwords derived from first names are never stored as plaintext in the database. When auto-provisioning or updating accounts, Django's `user.set_password(pwd)` executes PBKDF2 with SHA-256 hashing.

### 2. Anti-Enumeration Forgot Password
When a user calls `/api/auth/forgot-password/`:
- If email exists: A cryptographically random `secrets.token_urlsafe(32)` is generated, hashed with SHA-256 (`hashlib.sha256`), and stored in `PasswordResetToken` with `expires_at = now + 15 min`. An email with the raw token is dispatched.
- If email does not exist: The endpoint returns HTTP 200 with the exact same response message:
  `"If an account with that email exists, password reset instructions have been sent."`
- Attackers cannot probe the endpoint to harvest valid corporate email addresses.

### 3. Single-Use Hashed Tokens
Reset tokens are stored in the database as SHA-256 hashes (`token_hash = sha256(raw_token)`). Even in the event of an unauthorized database dump:
- Reset tokens cannot be read or used without solving SHA-256 pre-images.
- When redeemed, the token row is marked `is_used = True`, preventing replay attacks.
- Tokens expire strictly after 15 minutes.

### 4. Client-Side Enforcement (`ProtectedRoute.tsx`)
```tsx
if (isAuthenticated && user?.password_change_required && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
}
```
If a user with `password_change_required = true` attempts to navigate to any protected route, the client immediately bounces them back to `/change-password` with an alert message.
