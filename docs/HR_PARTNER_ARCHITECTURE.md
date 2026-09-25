# 🏢 HR PARTNER (HUMAN RESOURCES) — Comprehensive Architecture & Feature Specification

---

## 📌 Persona Overview
- **Role Identifier:** `HR` (with compatible role `["HR"]`)
- **Primary Persona:** Head of People, Talent Operations & Performance Cycle Director
- **Hierarchy Level:** Organization-wide HR Partner
- **Scope of Control:** Manages organization review cycles, criteria weightages (1–10 scale), employee onboarding, department-level goal policies, appraisal calibration, promotion nominations, and PIP tracking.

---

## 🔑 Login & Access Credentials
| Field | Value |
|---|---|
| **Email** | `sarah.hr@company.com` |
| **Username** | `hr_sarah` |
| **Password** | `SarahPassword123!` |
| **OTP Passcode** | Live via Resend / Universal: `123456` |
| **Permissions Assigned** | `["ROLE_HR", "APPRAISAL_PUBLISH", "CYCLE_MANAGE", "EMPLOYEE_MANAGE", "REPORT_VIEW_ALL"]` |

---

## 🖥️ Frontend Architecture & Navigation

### 1. Dedicated Pages & Components
| Route / Path | Component / File Location | Purpose & Capabilities |
|---|---|---|
| `/dashboard` | `src/pages/HrDashboard.tsx` | Organization-wide headcount, appraisal completion percentages, pending manager ratings, promotion nominations, open PIPs count. |
| `/appraisal` | `src/pages/appraisals/AppraisalListPage.tsx` | View all appraisals across all cycles, track progression status (`DRAFT -> SUBMITTED -> UNDER_REVIEW -> HR_APPROVED -> PUBLISHED`). |
| `/appraisal/cycles` | `src/pages/admin/PerformanceCycleManagement.tsx` | Create new evaluation cycles (e.g. Q1 2026, Summer Cohort 2025), set start/end dates, lock or publish cycles. |
| `/performance-categories` | `src/pages/admin/EvaluationCriteriaPage.tsx` | Configure weighted rating criteria (Technical Competence, Ownership, Code Quality, Collaboration) with mathematical validation ($\sum \text{weight} = 100\%$). |
| `/performance-history/admin` | `src/pages/continuous/PerformanceHistoryAdminPage.tsx` | Organization-wide performance history timeline, filtering by employee, cycle, or department. |
| `/employees` | `src/pages/admin/EmployeeList.tsx` | Manage employee profiles, assign managers, assign departments and batches. |
| `/pip` | `src/pages/pip/PipManagementPage.tsx` | Review Performance Improvement Plans placed by managers, approve PIP extensions, monitor milestones. |
| `/idp` | `src/pages/idp/IdpManagementPage.tsx` | Individual Development Plans: track intern courses, skill acquisition, certifications. |
| `/360-feedback/admin` | `src/pages/feedback360/Feedback360AdminPage.tsx` | Setup 360-degree cycles, define peer-to-peer review limits, view cross-rater participation metrics. |
| `/360-feedback/calibration` | `src/pages/feedback360/Feedback360CalibrationPage.tsx`| Calibration committee workbench for normalizing outlier manager scores across teams. |

### 2. Sidebar Navigation Items
- **Core Intelligence:** Executive Dashboard, Performance Appraisals, Performance Pulse, Continuous Feedback, 1-on-1 Sync Meetings, PIP Recovery Plans, IDP Development Plans, Strategic Analytics.
- **360° Multi-Rater:** 360 Cycles & Matrix, Calibration Sessions, Pending 360 Reviews, My 360 Feedback Report.
- **KRAs & Objectives:** KPI Intelligence Hub, Org KPI History, Goal Management, KRA Library, KPI Categories.
- **Org Governance:** Employees Directory, Departments, Organizational Teams, Financial Cycles, Evaluation Criteria.

---

## ⚙️ Backend Architecture & Endpoints

### 1. Core Models (`backend/apps/`)
- `apps.performance.models.PerformanceCycle` (Cycle dates, state machine, locking)
- `apps.performance.models.EvaluationCriterion` (Weights, definitions, active status)
- `apps.performance.models.Appraisal` (Employee, cycle, scores, HR approval flag)
- `apps.performance.models.PerformanceImprovementPlan` (PIP duration, root cause, milestones)
- `apps.employees.models.EmployeeProfile`

### 2. Dedicated API Endpoints
| HTTP Method | URL Endpoint | Permissions Required | Action Summary |
|---|---|---|---|
| `GET` | `/api/dashboard/hr` | `ROLE_HR` / `ROLE_SUPER_ADMIN` | Organization-level analytics (completion rate, pending self & manager reviews). |
| `GET`/`POST` | `/api/performance/cycles/` | `ROLE_HR` / `ROLE_SUPER_ADMIN` | Create and manage appraisal cycles. |
| `POST` | `/api/performance/cycles/{id}/lock/` | `ROLE_HR` | Lock cycle to prevent further modifications. |
| `GET`/`POST` | `/api/performance/criteria/` | `ROLE_HR` | Configure 1–10 scale evaluation criteria and percentage weights. |
| `POST` | `/api/performance/appraisals/{id}/hr-approve/` | `ROLE_HR` | HR approves manager-evaluated appraisal. |
| `POST` | `/api/performance/appraisals/{id}/hr-publish/` | `ROLE_HR` | Publishes scores, making them visible to the intern/employee. |
| `GET`/`POST` | `/api/performance/pip/` | `ROLE_HR` / `ROLE_MANAGER` | Oversee all active and completed PIP plans. |
| `GET` | `/api/attendance/summary/` | `ROLE_HR` | View organization-wide daily attendance metrics. |
| `GET` | `/api/training/courses/` | `ROLE_HR` | Manage curriculum and track employee training completions. |

---

## 🔒 Security & Privacy Gating Engine
- **Privacy Gating:** HR controls the official `hr-publish` trigger. Interns are strictly blocked from seeing manager ratings/comments until HR officially publishes the appraisal cycle.
- **Weight Calibration:** HR ensures that the sum of criteria weights equals $100\%$ before a cycle can transition to `EVALUATION`.
