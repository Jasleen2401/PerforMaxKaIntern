# 🎓 INTERN / EMPLOYEE — Comprehensive Architecture & Feature Specification

---

## 📌 Persona Overview
- **Role Identifier:** `INTERN` (with compatible roles `["INTERN", "EMPLOYEE"]`)
- **Primary Persona:** Software Engineering Intern, Product Design Intern, QA Automation Intern
- **Hierarchy Level:** Individual Contributor / Cohort Member (Batches A, B, C, D / Sub-Batches A1, A2, etc.)
- **Scope of Control:** Dedicated Intern Dashboard. Tracks assigned weighted goals, logs real-time goal progress with sliders, adds comments to goals and replies to mentor notes, attaches files and URLs for evidence verification, completes assigned tasks with instructions, fills 1–10 self-rating and HR questionnaire, and views published mentor feedback, calibrated score, performance classification, and improvement areas.

---

## 🔑 Login & Access Credentials
| Field | Value |
|---|---|
| **Demo Intern Email** | `jasleen.kaur@dailoqa.com` *(or `alex.dev@company.com`)* |
| **Password Pattern** | **First name in lowercase** (e.g., `jasleen`, `alex`, `tanvi`, `jatin`, `aryan`) |
| **Demo Intern Password** | `jasleen` *(or `AlexPassword123!`)* |
| **OTP Passcode** | **⚡ 1-Click Auto-Fill** / Universal: `123456` |
| **Assigned Reporting Mentor** | `Elena Rostova` (QA Automation & Engineering Lead) |
| **Permissions Assigned** | `["ROLE_INTERN", "ROLE_EMPLOYEE", "GOAL_VIEW_OWN", "EVIDENCE_SUBMIT", "APPRAISAL_SELF_EVALUATE"]` |

---

## 🖥️ Frontend Architecture & Navigation

### 1. Dedicated Tabs & Features in `EmployeeDashboard.tsx`
| Tab Identifier | Component / File Location | Capabilities & Scope |
|---|---|---|
| `overview` | `src/pages/EmployeeDashboard.tsx` | Personal scorecard, Assigned Mentor Spotlight, Active Evaluation Cycle with countdown, Deadlines & Pending Tracker, Published Results Card. |
| `goals` | `src/pages/EmployeeDashboard.tsx` | View assigned goals with weightage, live progress slider ($0–100\%$), comments thread, reply to mentor comments, attach evidence shortcut. |
| `tasks` | `src/pages/EmployeeDashboard.tsx` | View assigned tasks with mentor instructions, mark work complete where permitted, record completion date, hours spent, summary notes, and artifact URL. |
| `evidence` | `src/pages/EmployeeDashboard.tsx` | Evidence Submission Hub: upload file attachments, add PR/Figma URLs, view mentor verification status and review feedback. |
| `evaluation` | `src/pages/EmployeeDashboard.tsx` | Self-appraisal form: interactive 1.0–10.0 score selector, 5 HR-published reflection questions, draft save & final submission. |
| `results` | `src/pages/EmployeeDashboard.tsx` | Published Results Hub: official calibrated score, performance classification badge, mentor qualitative remarks, published areas for improvement, reply to mentor comments. |
| `profile` | `src/pages/EmployeeDashboard.tsx` | Account identity, department, cohort, employee code, and assigned mentor contact card. |

---

## ⚙️ Backend Architecture & Database Models

### 1. Dedicated Intern App Models (`apps.intern.models`)
- `InternTask`:
  - `intern`: ForeignKey `EmployeeProfile`
  - `title`: CharField
  - `category`: Choice (`TECHNICAL`, `ONBOARDING`, `DOCUMENTATION`, `EVALUATION`)
  - `instructions`: TextField (step-by-step mentor instructions and criteria)
  - `priority`: Choice (`HIGH`, `MEDIUM`, `LOW`)
  - `due_date`: DateField
  - `is_completed`: BooleanField
  - `completed_at`: DateField
  - `hours_spent`: DecimalField
  - `completion_notes`: TextField
  - `artifact_url`: CharField
  - `is_permitted_to_complete`: BooleanField
- `InternGoalComment`:
  - `goal`: ForeignKey `Goal`
  - `author`: ForeignKey `User`
  - `author_name`: CharField
  - `author_role`: CharField (`INTERN` / `MENTOR`)
  - `comment`: TextField
  - `is_mentor`: BooleanField
  - `parent`: ForeignKey `self` (hierarchical reply support)
- `InternSelfAppraisalSubmission`:
  - `intern`: ForeignKey `EmployeeProfile`
  - `cycle`: ForeignKey `PerformanceCycle`
  - `self_rating`: DecimalField (1.0 to 10.0)
  - `achievements`: TextField (key technical deliverables)
  - `challenges`: TextField (analytical obstacles overcome)
  - `skills_acquired`: TextField (frameworks & tooling mastered)
  - `mentorship_needs`: TextField (focus areas for next sprint)
  - `reflection_summary`: TextField (overall self-evaluation reflection)
  - `is_submitted`: BooleanField
  - `submitted_at`: DateTimeField
- `InternFeedbackReply`:
  - `intern`: ForeignKey `EmployeeProfile`
  - `appraisal`: ForeignKey `Appraisal`
  - `reply_text`: TextField
  - `created_at`: DateTimeField

### 2. Dedicated API Endpoints (`backend/apps/intern/urls.py`)
| HTTP Method | URL Endpoint | Auth Required | Action Summary |
|---|---|---|---|
| `GET` | `/api/intern/overview/` | Bearer Token | Personal scorecard, mentor info, cycle info, upcoming deadlines, published results. |
| `GET` | `/api/intern/my-goals/` | Bearer Token | Assigned goals with weightage, priority, due date, progress %, comments, and evidence count. |
| `POST` | `/api/intern/my-goals/<uuid:pk>/progress/` | Bearer Token | Update goal progress ($0–100\%$) real-time; auto-completes at 100%. |
| `GET`, `POST` | `/api/intern/my-goals/<uuid:pk>/comments/` | Bearer Token | View comments on goal; add update note or reply to mentor comments. |
| `GET`, `POST` | `/api/intern/evidence/` & `/submit/` | Bearer Token | View submitted evidence; submit new proof of work with file attachments and external URLs. |
| `GET` | `/api/intern/tasks/` | Bearer Token | Retrieve assigned tasks with step-by-step mentor instructions. |
| `POST` | `/api/intern/tasks/<uuid:pk>/complete/` | Bearer Token | Mark work complete where permitted; log completion date, hours, notes, and artifact URL. |
| `GET`, `POST` | `/api/intern/self-appraisal/` | Bearer Token | Fill self-rating (1–10) and answer 5 HR reflection questions (draft / final submit). |
| `GET` | `/api/intern/published-feedback/` | Bearer Token | Retrieve published mentor feedback, calibrated score, classification, and improvement areas. |
| `POST` | `/api/intern/published-feedback/reply/` | Bearer Token | Submit reply to mentor feedback where permitted. |

---

## 🛡️ Privacy & Confidentiality Safeguards
1. **Uncalibrated Ratings Masked**: Interns cannot view draft or uncalibrated manager evaluations before HR approves and marks the cycle as `PUBLISHED`.
2. **Anti-Enumeration & Scoping**: All queries are automatically scoped to the authenticated intern (`employee=profile`), preventing horizontal privilege escalation.
3. **Audit Trail**: Every progress change, comment, task completion, and evidence submission records timestamp, user identity, and completion parameters.
