# 🎓 INTERN / EMPLOYEE — Comprehensive Architecture & Feature Specification

---

## 📌 Persona Overview
- **Role Identifier:** `INTERN` (with compatible roles `["INTERN", "EMPLOYEE"]`)
- **Primary Persona:** Software Engineering Intern, Product Design Intern, QA Automation Intern
- **Hierarchy Level:** Individual Contributor / Cohort Member (Batches A, B, C, D / Sub-Batches A1, A2, etc.)
- **Scope of Control:** Self-scoped. Tracks assigned weighted goals, logs KPI progress, submits verifiable evidence (PR URLs, design links), completes self-assessments (1–10 scale), logs daily attendance, completes training curriculum, and views finalized published appraisal cards.

---

## 🔑 Login & Access Credentials
| Field | Value |
|---|---|
| **Demo Intern Email** | `alex.dev@company.com` *(or any of the 80 `@dailoqa.com` intern emails)* |
| **Password Pattern** | **First name in lowercase** (e.g., `alex`, `tanvi`, `jatin`, `jasleen`, `aryan`) |
| **Demo Intern Password** | `AlexPassword123!` (for `alex.dev@company.com`) |
| **OTP Passcode** | **⚡ 1-Click Auto-Fill** / Universal: `123456` |
| **Permissions Assigned** | `["ROLE_INTERN", "ROLE_EMPLOYEE", "GOAL_VIEW_OWN", "EVIDENCE_SUBMIT", "APPRAISAL_SELF_EVALUATE"]` |

---

## 🖥️ Frontend Architecture & Navigation

### 1. Dedicated Pages & Components
| Route / Path | Component / File Location | Purpose & Capabilities |
|---|---|---|
| `/dashboard` | `src/pages/EmployeeDashboard.tsx` | Personal scorecard: Goal completion %, overall calibrated score, active cycle countdown, evidence submission feed, training progress. |
| `/kpi/my` | `src/pages/kpi/MyKpiGoalsPage.tsx` | View all assigned goals & KPIs, update progress sliders ($0–100\%$), check assigned weights. |
| `/kpi/history/:userId` | `src/pages/kpi/EmployeeKpiHistory.tsx` | Personal KPI Journey: historical progress charts across past cycles and batches. |
| `/appraisal` | `src/pages/appraisals/AppraisalListPage.tsx` | Fill self-assessment ratings (1–10 scale) and qualitative summary; view final published score breakdown once cycle is released. |
| `/continuous-feedback` | `src/pages/continuous/ContinuousFeedbackPage.tsx`| View feedback received from managers & peers; send peer recognition/feedback. |
| `/meetings` | `src/pages/meetings/OneOnOneMeetingsPage.tsx` | View scheduled 1-on-1 syncs, meeting notes, and action items assigned by manager. |
| `/idp` | `src/pages/idp/IdpManagementPage.tsx` | Personal Individual Development Plan: enroll in courses, mark learning milestones. |
| `/360-feedback/pending` | `src/pages/feedback360/Feedback360PendingPage.tsx`| Fill anonymous multi-rater 360 feedback requested by peers. |
| `/360-feedback/my-report` | `src/pages/feedback360/Feedback360ReportPage.tsx` | Personal 360 Feedback Report with radar chart comparing self vs peer vs manager scores. |

### 2. Sidebar Navigation Items
- **Core Intelligence:** Executive Dashboard, Performance Appraisals, Continuous Feedback, 1-on-1 Sync Meetings, PIP Recovery Plans (if on PIP), IDP Development Plans.
- **360° Multi-Rater:** Pending 360 Reviews, My 360 Feedback Report.
- **KRAs & Objectives:** KPI Intelligence Hub, My Goals & KRAs, My KPI Journey.

---

## ⚙️ Backend Architecture & Endpoints

### 1. Core Models (`backend/apps/`)
- `apps.goals.models.Goal`, `KPI`, `GoalProgress` (`employee_id` filter)
- `apps.evidence.models.EvidenceSubmission` (`submitted_by` filter)
- `apps.performance.models.Appraisal`, `AppraisalRating` (`employee_id` filter)
- `apps.attendance.models.AttendanceRecord` (`employee_id`, `date`)
- `apps.training.models.EmployeeTraining`, `TrainingCourse`

### 2. Dedicated API Endpoints
| HTTP Method | URL Endpoint | Permissions Required | Action Summary |
|---|---|---|---|
| `GET` | `/api/dashboard/employee` | `ROLE_INTERN` / `ROLE_EMPLOYEE` | Personal summary: average score, goal completion %, active appraisal status. |
| `GET` | `/api/goals/my-goals/` | `ROLE_INTERN` | Returns active goals assigned to current authenticated intern. |
| `POST` | `/api/goals/{id}/progress/` | `ROLE_INTERN` | Update progress on a KPI with numerical value or percentage. |
| `POST` | `/api/evidence/` | `ROLE_INTERN` | Submit evidence link (GitHub PR, Figma design, doc link) with description. |
| `GET` | `/api/performance/appraisals/my-appraisals/` | `ROLE_INTERN` | Returns intern's appraisals across cycles. |
| `POST` | `/api/performance/appraisals/{id}/submit-self/` | `ROLE_INTERN` | Submit self-ratings (1–10 scale) and self-evaluation comments. |
| `POST` | `/api/attendance/punch/` | `ROLE_INTERN` | Log daily attendance check-in. |
| `POST` | `/api/training/courses/{id}/progress/` | `ROLE_INTERN` | Update course completion percentage. |

---

## 🔒 Security, Privacy & Invariants
- **Strict Self-Data Isolation:** Interns can only read and mutate their own goals, evidence, self-assessments, and attendance.
- **Mathematical Scoring Transparent Formula:**
  $$\text{Final Score} = (\text{Goal Score} \times 0.40) + (\text{Manager Criteria Score} \times 0.40) + (\text{Self Criteria Score} \times 0.20)$$
- **Privacy Shield:** Manager ratings, manager comments, and final calibrated score fields remain masked and unreturned by the API until the cycle state is explicitly `PUBLISHED` by HR.
