# 🎓 Intern Module — Complete Deliverables & Source Files

This directory consolidates all backend, frontend, documentation, migrations, data-seeding, and automated test files created for the **Intern Performance Management & Learning Module** in **PerforMax**.

---

## 🎯 23 Implemented Core Features Checklist

| # | Feature Requirement | Status | Component & API Implementation |
|---|---|---|---|
| 1 | **View Personal Dashboard** | ✅ Implemented | Scorecard with goals, tasks, evaluation cycle, official score, and deadlines |
| 2 | **View Assigned Mentor** | ✅ Implemented | Prominent Mentor Spotlight Card with name, email, designation, department, and active mentorship tag |
| 3 | **View Current Evaluation Cycle** | ✅ Implemented | Active cycle banner with dates, status, current phase, and countdown days remaining |
| 4 | **View Assigned Goals** | ✅ Implemented | KRAs/goals with title, description, weightage %, status, priority, and due dates |
| 5 | **Update Goal Progress** | ✅ Implemented | Interactive real-time progress slider ($0–100\%$) with auto-completion at 100% |
| 6 | **Add Comments to Goals** | ✅ Implemented | Expandable discussion thread under each goal for progress updates and notes |
| 7 | **Reply to Mentor Comments where Permitted** | ✅ Implemented | Direct threaded reply to mentor notes on specific goals |
| 8 | **Submit Evidence Against Goals** | ✅ Implemented | Evidence Submission Modal linked to target goals with deliverable description |
| 9 | **Attach Files** | ✅ Implemented | File attachment input supporting document, code, and archive uploads |
| 10 | **Add URLs** | ✅ Implemented | External URL input for GitHub PRs, Figma design specs, and commits |
| 11 | **View Submitted Evidence** | ✅ Implemented | Evidence Hub listing submissions with mentor verification status and review notes |
| 12 | **Complete Assigned Tasks** | ✅ Implemented | Assigned tasks list with status toggle and pending counter |
| 13 | **View Task Instructions** | ✅ Implemented | Detailed step-by-step guidelines and acceptance criteria provided by mentor |
| 14 | **Mark Work Complete where Permitted** | ✅ Implemented | Permission-checked completion action with audit record |
| 15 | **Complete Date and Other Configured Fields** | ✅ Implemented | Form to record completion date, hours spent, summary notes, and deliverable URL |
| 16 | **Complete Self-Rating when Enabled** | ✅ Implemented | Interactive 1.0 to 10.0 score selector with performance tier indicators |
| 17 | **Fill HR-Published Forms/Questions** | ✅ Implemented | 5 structured reflection questions covering achievements, challenges, skills, mentorship, and goals |
| 18 | **View Mentor Feedback that is Published** | ✅ Implemented | Confidentiality-shielded view revealing mentor qualitative remarks once published |
| 19 | **View Published Ratings/Results** | ✅ Implemented | Official calibrated score (e.g. 94.0%) prominently displayed upon HR release |
| 20 | **View Performance Classification when Published** | ✅ Implemented | Tier badge: *Outstanding Contributor*, *Exceeds Expectations*, *Meets Expectations*, etc. |
| 21 | **View Published Areas for Improvement** | ✅ Implemented | Dedicated recommendations panel highlighting mentor-guided technical growth areas |
| 22 | **Reply to Mentor Comments on Published Feedback** | ✅ Implemented | Interactive feedback reply section allowing intern response to published evaluations |
| 23 | **View Deadlines and Pending Tasks** | ✅ Implemented | Chronological deadlines tracker for tasks, goal milestones, and self-evaluation cutoff |
| 24 | **Removed Unnecessary Features** | ✅ Cleaned | Eliminated confusing corporate PIP alerts, 360 multi-rater, 1-on-1 sync meetings, IDP plans, and multi-year charts |
| 25 | **Flexible Performance Assessment Scoring** | ✅ Implemented | Dynamic HR evaluation parameters & weightages ($Goals\% + Manager\% + Self\% = 100\%$) |
| 26 | **HR Scoring Parameters & Criteria Studio** | ✅ Implemented | Dedicated HR UI to configure custom parameters, weights, normalize, and live simulate scores |

---

## 📂 Directory Structure & File Inventory

```
intern_module/
├── README.md                                          # This documentation and feature manifest
├── docs/
│   └── INTERN_ARCHITECTURE.md                         # Complete architectural & API specification
├── backend/
│   ├── apps/
│   │   ├── intern/
│   │   │   ├── __init__.py                            # Module package init
│   │   │   ├── models.py                              # InternTask, InternGoalComment, InternSelfAppraisal, InternFeedbackReply
│   │   │   ├── migrations/
│   │   │   │   └── 0001_initial.py                    # Applied database migration
│   │   │   ├── urls.py                                # Dedicated /api/intern/* endpoints
│   │   │   └── views.py                               # Comprehensive REST API views for all 23 features + dynamic weights
│   │   ├── performance/
│   │   │   ├── models.py                              # Dynamic weights & cycle-specific criteria models
│   │   │   ├── serializers.py                         # Scoring parameters & criteria serializers
│   │   │   ├── views.py                               # Scoring parameters HR endpoints & actions
│   │   │   ├── tests.py                               # Unit tests for flexible scoring calculation
│   │   │   ├── migrations/                            # AlterEvaluationCriterion migrations
│   │   │   └── services/
│   │   │       └── scoring.py                         # Dynamic ScoringService engine
│   │   └── frontend_compat_views.py                   # Frontend score breakdown adapter
│   ├── seed_scripts/
│   │   ├── seed_intern_pms.py                         # Full DB seed: cycles, goals, criteria, evidence, appraisals
│   │   └── seed_dailoqa_interns.py                    # Intern accounts, batches, and credentials
│   └── tests_intern_dashboard.py                      # 10 automated test cases verifying all features
└── frontend/
    ├── modules/
    │   └── InternModule.tsx                           # Dedicated Intern Portal navigation hub
    ├── pages/
    │   ├── EmployeeDashboard.tsx                      # Focused Intern Dashboard + HR Parameters & Weightage Matrix
    │   └── appraisal/
    │       ├── PerformanceCategoryManagement.tsx      # HR Evaluation Parameters & Weightages Studio
    │       └── CreateCycle.tsx                        # Cycle creator with dynamic weight distributions
    ├── features/
    │   ├── dashboardApi.ts                            # RTK Query hooks for scoring parameters & intern APIs
    │   ├── dashboardTypes.ts                          # TypeScript definitions for scoring weights & parameters
    │   └── authApi.ts                                 # Profile and authentication endpoints
    ├── components/
    │   └── Sidebar.tsx                                # Role-aware sidebar navigation tailored for Intern role
    └── hooks/
        └── useAuth.ts                                 # Client-side role resolution & permission checks
```

---

## 🗺️ Project Mapping Reference

The active source code runs within the project structure at:

| Intern Module Component | Active Project Location | Purpose |
|---|---|---|
| **Backend Models** | `backend/apps/intern/models.py` | Defines `InternTask`, `InternGoalComment`, `InternSelfAppraisalSubmission`, `InternFeedbackReply` |
| **Backend Migrations** | `backend/apps/intern/migrations/` | Schema migration for intern database tables |
| **Backend Views** | `backend/apps/intern/views.py` | Implements `/overview/`, `/my-goals/`, `/progress/`, `/comments/`, `/evidence/`, `/tasks/`, `/self-appraisal/`, `/published-feedback/` |
| **Backend URLs** | `backend/apps/intern/urls.py` | Configures `intern` namespace under `/api/intern/` |
| **Automated Tests** | `backend/tests_intern_dashboard.py` | 10 comprehensive automated unit tests covering all features |
| **Intern Dashboard Page** | `epms_frontend/src/pages/EmployeeDashboard.tsx` | Interactive React component with all 23 checklist features |
| **API Integration** | `epms_frontend/src/features/dashboard/dashboardApi.ts` | RTK Query endpoints connected to `/api/intern/` |
| **Data Types** | `epms_frontend/src/features/dashboard/dashboardTypes.ts` | TypeScript definitions for all intern models |

---

## 🔑 Demo Intern Credentials

- **Demo Email:** `jasleen.kaur@dailoqa.com` *(or `alex.dev@company.com`)*
- **Demo Password:** `jasleen` *(or `AlexPassword123!`)*
- **OTP Passcode:** `123456` *(or ⚡ 1-Click Auto-Fill)*
- **Assigned Mentor:** `Elena Rostova (QA Automation Lead)`

---

## 📡 API Endpoints Summary

| HTTP Method | Route | Description |
|---|---|---|
| `GET` | `/api/intern/overview/` | Returns personal scorecard, assigned mentor info, active cycle, upcoming deadlines, and published results |
| `GET` | `/api/intern/my-goals/` | Retrieves assigned goals with weightage, cycle, progress %, comment threads, and evidence count |
| `POST` | `/api/intern/my-goals/<uuid:pk>/progress/` | Real-time progress update ($0–100\%$) with auto-completion status update |
| `GET`, `POST` | `/api/intern/my-goals/<uuid:pk>/comments/` | Fetch goal comments and post new progress notes or reply to mentor comments |
| `GET`, `POST` | `/api/intern/evidence/` & `/submit/` | View submitted evidence and submit new proof of work with file attachments and external URLs |
| `GET` | `/api/intern/tasks/` | Retrieve assigned tasks with detailed step-by-step instructions from mentor |
| `POST` | `/api/intern/tasks/<uuid:pk>/complete/` | Mark work complete where permitted; log completion date, hours spent, summary notes, and artifact URL |
| `GET`, `POST` | `/api/intern/self-appraisal/` | Fill 1–10 self-rating and answer 5 HR-published reflection questions (save draft or submit final) |
| `GET` | `/api/intern/published-feedback/` | Retrieve published mentor feedback, score, classification, and published improvement areas |
| `POST` | `/api/intern/published-feedback/reply/` | Reply to mentor feedback where permitted |

---

## 🧪 Running Automated Tests

```bash
# Activate virtual environment
cd backend
.\.venv\Scripts\activate

# Run the 10 automated test cases
python manage.py test tests_intern_dashboard -v 2
```

All 10 test cases run and pass with exit code 0 (`OK`).
