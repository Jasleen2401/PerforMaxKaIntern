# 👑 SUPER ADMIN — Comprehensive Architecture & Feature Specification

---

## 📌 Persona Overview
- **Role Identifier:** `SUPER_ADMIN` (with dual compatibility roles `["SUPER_ADMIN", "ADMIN"]`)
- **Primary Persona:** System Owner & Chief Governance Administrator
- **Hierarchy Level:** Top-level global authority
- **Inheritance:** Super Admin has **all permissions of HR, Manager, and Intern** plus unrestricted access to system-wide audit logs, database maintenance, user creation, security matrix, department configuration, and cycle force-approvals.

---

## 🔑 Login & Access Credentials
| Field | Value |
|---|---|
| **Email** | `admin@company.com` |
| **Username** | `admin` |
| **Password** | `Admin@123` *(or `AdminPassword123!`)* |
| **OTP Passcode** | Live via Resend / Universal: `123456` |
| **Permissions Assigned** | `["ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ALL"]` |

---

## 🖥️ Frontend Architecture & Navigation

### 1. Dedicated Pages & Components
| Route / Path | Component / File Location | Purpose & Capabilities |
|---|---|---|
| `/dashboard` | `src/pages/admin/AdminDashboard.tsx` (or `ExecutiveDashboard`) | High-level KPI metrics, active cycles, top performers, at-risk alerts, audit logs summary. |
| `/employees` | `src/pages/admin/EmployeeList.tsx` | View, search, filter, edit, activate/deactivate, lock/unlock all employees across all batches. |
| `/employees/create` | `src/pages/admin/EmployeeForm.tsx` | Onboard new interns, managers, HR, and admins with custom designations & departments. |
| `/employees/:id/profile`| `src/pages/admin/EmployeeProfileView.tsx`| Full profile, KPI history, department history, 360 feedback, attendance & training. |
| `/departments` | `src/pages/admin/org/DepartmentList.tsx` | Create & manage organizational departments (Engineering, Product, Batch A, B, C, D). |
| `/job-levels` | `src/pages/admin/org/JobLevelList.tsx` | Configure job grades, levels, salary bands, and hierarchy tracks. |
| `/positions` | `src/pages/admin/org/PositionList.tsx` | Manage corporate positions & functional designations. |
| `/teams` | `src/pages/admin/org/TeamList.tsx` | Manage engineering squads and sub-batch teams (A1, A2, B1, etc.). |
| `/roles` | `src/pages/admin/org/RoleList.tsx` | Define custom security roles and grant global permissions. |
| `/permissions` | `src/pages/admin/org/PermissionList.tsx` | Manage granular API permission flags and access controls. |
| `/permissions/matrix`| `src/pages/admin/org/RolePermissionMatrix.tsx`| Interactive visual matrix for toggling RBAC permissions per role. |
| `/audit-logs` | `src/pages/admin/AuditLogsPage.tsx` | Immutable audit trails: records user log, IP address, timestamp, mutations, and actions. |
| `/analytics` | `src/pages/admin/StrategicAnalyticsPage.tsx` | Enterprise-wide bell curve score distributions, department averages, export CSV/PDF. |
| `/360-feedback/admin` | `src/pages/feedback360/Feedback360AdminPage.tsx` | Configure 360 review matrices, anonymity thresholds, and cycle timelines. |
| `/360-feedback/calibration` | `src/pages/feedback360/Feedback360CalibrationPage.tsx`| Committee review sessions for score calibration and anomaly adjustments. |

### 2. Sidebar Navigation Items
- **Core Intelligence:** Executive Dashboard, Performance Appraisals, Performance Pulse, Continuous Feedback, 1-on-1 Sync Meetings, PIP Recovery Plans, IDP Plans, Strategic Analytics, System Audit Logs.
- **360° Multi-Rater:** 360 Cycles & Matrix, Calibration Sessions, Pending 360 Reviews, My 360 Feedback Report.
- **KRAs & Objectives:** KPI Intelligence Hub, Org KPI History, Goal Management, KRA Library, KPI Categories.
- **Org Governance:** Employees Directory, Departments, Job Levels & Bands, Positions & Tracks, Organizational Teams, Financial Cycles, Evaluation Criteria, Security Roles, Access Permissions, Permissions Matrix, Assign Permissions.

---

## ⚙️ Backend Architecture & Endpoints

### 1. Core Models (`backend/apps/`)
- `apps.accounts.models.User` (`role='SUPER_ADMIN'`, `is_superuser=True`, `is_staff=True`)
- `apps.audit.models.AuditLog` (Actor, action, target entity, timestamp, IP, metadata)
- `apps.organization.models.Department`, `Team`, `TeamMembership`
- `apps.employees.models.EmployeeProfile`
- `apps.performance.models.PerformanceCycle`, `EvaluationCriterion`, `Appraisal`

### 2. Dedicated API Endpoints
| HTTP Method | URL Endpoint | Permissions Required | Action Summary |
|---|---|---|---|
| `GET` | `/api/dashboard/admin` | `ROLE_SUPER_ADMIN` / `ROLE_ADMIN` | Returns company-wide KPIs, counts, score distributions, and cycle health. |
| `GET`/`POST` | `/api/audit/logs/` | `ROLE_SUPER_ADMIN` | Fetch tamper-evident audit trails with search and date filters. |
| `GET`/`POST` | `/api/employees/` | `ROLE_SUPER_ADMIN` / `ROLE_HR` | Full employee CRUD, role assignments, and batch allocations. |
| `POST` | `/api/employees/{id}/activate/` | `ROLE_SUPER_ADMIN` | Activate employee account. |
| `POST` | `/api/employees/{id}/deactivate/` | `ROLE_SUPER_ADMIN` | Deactivate employee account. |
| `POST` | `/api/employees/{id}/unlock/` | `ROLE_SUPER_ADMIN` | Unlock locked employee account. |
| `GET`/`POST` | `/api/organization/departments/`| `ROLE_SUPER_ADMIN` / `ROLE_HR` | Department CRUD & headcount metrics. |
| `GET`/`POST` | `/api/organization/teams/` | `ROLE_SUPER_ADMIN` / `ROLE_HR` | Team and sub-batch CRUD. |
| `GET`/`POST` | `/api/roles/` & `/api/permissions/` | `ROLE_SUPER_ADMIN` | Security role & permission management. |
| `POST` | `/api/performance/cycles/{id}/force-approve/` | `ROLE_SUPER_ADMIN` | Super Admin override to approve/close stuck appraisals. |
| `GET` | `/api/analytics/bell-curve/` | `ROLE_SUPER_ADMIN` / `ROLE_HR` | Bell curve calibration data. |
| `GET` | `/api/analytics/export-csv/` | `ROLE_SUPER_ADMIN` / `ROLE_HR` | Export full performance dataset to CSV. |

---

## 🔒 Security & Data Boundaries
- Super Admin has zero data isolation restrictions (can view and mutate records across all departments and teams).
- Every write action performed by Super Admin generates an immutable record in `AuditLog`.
- Super Admin can impersonate/re-evaluate appraisals and override locked states if necessary.
