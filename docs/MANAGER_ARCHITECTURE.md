# 👨‍💼 MANAGER (TECH & QA LEADS) — Comprehensive Architecture & Feature Specification

---

## 📌 Persona Overview
- **Role Identifier:** `MANAGER` (with compatible role `["MANAGER"]`)
- **Primary Persona:** Engineering Manager, Tech Lead, Mentor, Evaluator
- **Hierarchy Level:** Team / Squad Lead
- **Scope of Control:** Team-scoped authority. Manages assigned direct reports (interns), sets weighted goals & KPIs, reviews submitted code PRs/evidence, submits manager criteria evaluations (1–10 scale), conducts 1-on-1 syncs, and initiates PIPs for underperformers.

---

## 🔑 Login & Access Credentials
| Field | Value |
|---|---|
| **Tech Manager Email** | `marcus.tech@company.com` |
| **Tech Manager Username**| `manager_marcus` |
| **Password** | `MarcusPassword123!` |
| **QA Manager Email** | `elena.qa@company.com` |
| **Password** | `ElenaPassword123!` |
| **OTP Passcode** | Live via Resend / Universal: `123456` |
| **Permissions Assigned** | `["ROLE_MANAGER", "GOAL_ASSIGN", "EVIDENCE_REVIEW", "APPRAISAL_EVALUATE", "APPRAISAL_VIEW_TEAM"]` |

---

## 🖥️ Frontend Architecture & Navigation

### 1. Dedicated Pages & Components
| Route / Path | Component / File Location | Purpose & Capabilities |
|---|---|---|
| `/dashboard` | `src/pages/ManagerDashboard.tsx` | Team roster overview, team average score, urgent pending evidence reviews, team KPI progress bars, pending self-assessments. |
| `/kpi/team` | `src/pages/kpi/TeamKpiOverviewPage.tsx` | View all assigned goals across direct reports, check real-time completion percentage ($0–100\%$). |
| `/kpi/manage` | `src/pages/kpi/GoalManagementPage.tsx` | Create, assign, edit, and re-weight goals for team members. Enforces $\sum \text{weights} = 100\%$. |
| `/performance-history/manager` | `src/pages/continuous/PerformanceHistoryManagerPage.tsx`| Team Pulse: timeline of historical scores, appraisal outcomes, and progress per direct report. |
| `/appraisal` | `src/pages/appraisals/AppraisalListPage.tsx` | Review intern self-assessments, fill manager ratings (1–10 scale) + qualitative feedback, and submit to HR. |
| `/continuous-feedback` | `src/pages/continuous/ContinuousFeedbackPage.tsx`| Send praise, constructive feedback, or performance notes directly to direct reports. |
| `/meetings` | `src/pages/meetings/OneOnOneMeetingsPage.tsx` | Schedule and document 1-on-1 syncs, action items, and follow-ups with interns. |
| `/pip` | `src/pages/pip/PipManagementPage.tsx` | Create and manage Performance Improvement Plans (PIPs) for at-risk interns with target check-in dates. |
| `/360-feedback/pending` | `src/pages/feedback360/Feedback360PendingPage.tsx`| Complete pending 360 multi-rater feedback requests for team members and peers. |
| `/360-feedback/my-report` | `src/pages/feedback360/Feedback360ReportPage.tsx` | View personal 360 multi-rater radar chart and aggregate competency breakdowns. |

### 2. Sidebar Navigation Items
- **Core Intelligence:** Executive Dashboard, Performance Appraisals, Team Pulse, Continuous Feedback, 1-on-1 Sync Meetings, PIP Recovery Plans, IDP Development Plans.
- **360° Multi-Rater:** Pending 360 Reviews, My 360 Feedback Report, 360 Cycles & Matrix.
- **KRAs & Objectives:** KPI Intelligence Hub, Team Performance, Team KPI History, Goal Management, KRA Library.

---

## ⚙️ Backend Architecture & Endpoints

### 1. Core Models (`backend/apps/`)
- `apps.goals.models.Goal`, `KPI`, `GoalProgress`
- `apps.evidence.models.EvidenceSubmission`, `EvidenceReviewStatus`
- `apps.performance.models.Appraisal`, `AppraisalRating`
- `apps.organization.models.Team`, `TeamMembership`
- `apps.employees.models.EmployeeProfile` (`manager_id` foreign key)

### 2. Dedicated API Endpoints
| HTTP Method | URL Endpoint | Permissions Required | Action Summary |
|---|---|---|---|
| `GET` | `/api/dashboard/manager` | `ROLE_MANAGER` | Returns team-specific metrics, team size, pending reviews, urgent reviews list. |
| `GET`/`POST` | `/api/goals/` | `ROLE_MANAGER` | List team goals and assign new weighted goals to interns. |
| `POST` | `/api/goals/{id}/kpis/` | `ROLE_MANAGER` | Attach measurable KPIs (numerical, percentage, boolean) to a goal. |
| `GET`/`PATCH` | `/api/evidence/` & `/api/evidence/{id}/` | `ROLE_MANAGER` | Review submitted PR links and approve or request revisions with reviewer remarks. |
| `POST` | `/api/performance/appraisals/{id}/submit-manager/` | `ROLE_MANAGER` | Submit manager criteria ratings (1–10 scale) and qualitative feedback. |
| `POST` | `/api/performance/pip/` | `ROLE_MANAGER` | Initiate a PIP with root cause analysis and target milestones for an intern. |
| `POST` | `/api/meetings/` | `ROLE_MANAGER` | Log 1-on-1 sync meeting notes and action items. |

---

## 🔒 Security & Data Isolation
- **Row-Level Team Isolation:** Managers can only view and evaluate employees who are their direct reports (`manager=request.user`) or members of teams they manage.
- **Manager Rating Lockdown:** Once a manager submits their ratings to HR (`status='UNDER_REVIEW'`), ratings cannot be altered unless rejected back by HR or overridden by Super Admin.
