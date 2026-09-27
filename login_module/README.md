# 🔐 Login & Authentication Module — Complete Deliverables & Source Files

This directory consolidates all backend, frontend, documentation, migration, and security test files developed for the **PerforMax Dynamic Authentication, Onboarding & Credential Rotation System**.

---

## 📂 Directory Structure & File Inventory

```
login_module/
├── README.md                                          # This documentation and file manifest
├── docs/
│   └── AUTH_ARCHITECTURE.md                           # Complete security specification & flow diagrams
├── backend/
│   ├── apps/
│   │   └── accounts/
│   │       ├── models.py                              # User model extensions & PasswordResetToken model
│   │       ├── serializers.py                         # Dynamic provisioning, JWT token & password serializers
│   │       ├── views.py                               # Forgot, Reset, and Change password REST views
│   │       ├── urls.py                                # Auth routes: /jwt/create/, /change-password/, etc.
│   │       ├── migrations/
│   │       │   └── 0003_user_password_change_required_and_more.py  # Django schema migration
│   │       └── services/
│   │           └── email_service.py                   # SMTP & Resend API password reset dispatcher
│   ├── config/
│   │   └── settings/
│   │       └── base.py                                # Domain & reset token security settings
│   ├── seed_dailoqa_interns.py                        # Seeder for 80 Dailoqa intern accounts
│   └── tests_security_auth.py                         # 18 automated security & integration tests
└── frontend/
    ├── pages/
    │   ├── LoginPage.tsx                              # Upgraded login with forgot-pwd link & intern hint
    │   ├── ChangePasswordPage.tsx                     # Forced first-time & rotation password form
    │   ├── ForgotPasswordPage.tsx                     # Anti-enumeration password recovery request page
    │   └── ResetPasswordPage.tsx                      # Secure token redemption & new password page
    ├── components/
    │   └── auth/
    │       └── ProtectedRoute.tsx                     # Route-level forced change-password interceptor
    ├── features/
    │   ├── auth/
    │   │   ├── authApi.ts                             # RTK Query mutation hooks for auth endpoints
    │   │   ├── authSlice.ts                           # Redux state handling passwordChangeRequired flag
    │   │   └── authTypes.ts                           # TypeScript definitions for auth payloads & tokens
    │   └── employee/
    │       └── employeeTypes.ts                       # Extended employee interface with password flags
    └── routes/
        ├── generalRoutes.tsx                          # Route registration for /change-password
        └── publicRoutes.tsx                           # Route registration for /forgot-password & /reset-password
```

---

## 🗺️ Project Mapping Reference

The active source code runs within the project structure at:

| Component | Active Project Location | Login Module Standalone Location | Purpose |
|---|---|---|---|
| **User Models** | `backend/apps/accounts/models.py` | `login_module/backend/apps/accounts/models.py` | Added `password_change_required`, `password_changed_at`, and `PasswordResetToken` |
| **Auth Serializers** | `backend/apps/accounts/serializers.py` | `login_module/backend/apps/accounts/serializers.py` | Implements auto-provisioning for `@dailoqa.com`, temporary password checking, and token hashing |
| **Auth Views** | `backend/apps/accounts/views.py` | `login_module/backend/apps/accounts/views.py` | Added `ForgotPasswordView`, `ResetPasswordView`, and updated `ChangePasswordView` |
| **Auth URLs** | `backend/apps/accounts/urls.py` | `login_module/backend/apps/accounts/urls.py` | Registered `/change-password/`, `/forgot-password/`, `/reset-password/` |
| **Schema Migration** | `backend/apps/accounts/migrations/0003_*.py` | `login_module/backend/apps/accounts/migrations/0003_*.py` | Database migration applying user schema changes |
| **Email Service** | `backend/apps/accounts/services/email_service.py` | `login_module/backend/apps/accounts/services/email_service.py` | Sends password reset email via SMTP with Resend fallback |
| **Django Settings** | `backend/config/settings/base.py` | `login_module/backend/config/settings/base.py` | Added `ALLOWED_EMAIL_DOMAINS`, `PASSWORD_RESET_TIMEOUT_MINUTES` |
| **Login Page** | `epms_frontend/src/pages/LoginPage.tsx` | `login_module/frontend/pages/LoginPage.tsx` | UI with password hint, forgot password link, and first-time login redirection |
| **Change Password Page** | `epms_frontend/src/pages/ChangePasswordPage.tsx` | `login_module/frontend/pages/ChangePasswordPage.tsx` | Mandatory first-time password rotation page with validation indicators |
| **Forgot Password Page** | `epms_frontend/src/pages/ForgotPasswordPage.tsx` | `login_module/frontend/pages/ForgotPasswordPage.tsx` | Request password reset link with anti-enumeration message |
| **Reset Password Page** | `epms_frontend/src/pages/ResetPasswordPage.tsx` | `login_module/frontend/pages/ResetPasswordPage.tsx` | Consumes token, validates strength, sets permanent password |
| **Protected Route Guard** | `epms_frontend/src/components/auth/ProtectedRoute.tsx` | `login_module/frontend/components/auth/ProtectedRoute.tsx` | Redirects any user with `password_change_required = true` to `/change-password` |
| **Auth State & API** | `epms_frontend/src/features/auth/` | `login_module/frontend/features/auth/` | Redux slice, types, and RTK Query hooks managing password change status |
| **Security Tests** | `backend/tests_security_auth.py` | `login_module/backend/tests_security_auth.py` | 18 automated security test cases validating all auth scenarios |

---

## 🔑 Demo Credentials

- **Intern Email:** `jasleen.kaur@dailoqa.com` *(or any `@dailoqa.com` address)*
- **First-Time Password:** `jasleen` *(lowercase first name)*
- **OTP Code:** `123456` *(or ⚡ 1-Click Auto-Fill)*
- **Forced Flow:** On first login, user is directed to `/change-password`. After setting a new password, the temporary password (`jasleen`) is permanently disabled.

---

## 🧪 Running Automated Security Verification

```bash
# Activate virtual environment
cd backend
.\.venv\Scripts\activate

# Run the full 18-case security suite
python -m unittest tests_security_auth.py -v
```

All 18 tests will verify:
1. Dynamic provisioning for new `@dailoqa.com` users
2. Rejection of unauthorized domains (e.g. `@gmail.com`, `@yahoo.com`)
3. Temporary password verification against lowercase first name
4. No plaintext password storage (PBKDF2 SHA-256 validation)
5. `password_change_required = True` flag in JWT token
6. Password change endpoint clearing the requirement flag
7. Invalidation of temporary password once changed
8. Anti-enumeration behavior on forgot-password endpoint
9. SHA-256 token hashing and 15-minute expiration
10. Single-use token enforcement
