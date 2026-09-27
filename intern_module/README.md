# 🎓 Intern Module — Complete Deliverables & Source Files

This directory consolidates all backend, frontend, documentation, and data-seeding files created for the **Intern Performance Management & Learning Module** in **PerforMax**.

---

## 📂 Directory Structure & File Inventory

```
intern_module/
├── README.md                                  # This documentation and file manifest
├── backend/
│   ├── apps/
│   │   └── intern/
│   │       ├── __init__.py                    # Module init
│   │       ├── urls.py                        # Dedicated /api/intern/* route patterns
│   │       └── views.py                       # REST API views with privacy gating & score calculation
│   └── seed_scripts/
│       ├── seed_intern_pms.py                 # Full DB seed: cycles, goals, criteria, evidence, appraisals
│       └── seed_dailoqa_interns.py            # Intern accounts, batches (A, B, C, D), and credentials
├── frontend/
│   ├── modules/
│   │   └── InternModule.tsx                   # Dedicated Intern Portal navigation hub
│   ├── pages/
│   │   └── EmployeeDashboard.tsx              # Interactive Intern & Employee scorecard dashboard
│   ├── features/
│   │   ├── dashboardApi.ts                    # RTK Query hooks for scorecard, goals, evidence, appraisals
│   │   ├── dashboardTypes.ts                  # TypeScript definitions for intern API responses
│   │   └── authApi.ts                         # Role & profile authentication endpoints
│   ├── components/
│   │   └── Sidebar.tsx                        # Role-aware sidebar navigation tailored for Intern role
│   └── hooks/
│       └── useAuth.ts                         # Client-side role resolution & permission checks
└── docs/
    └── INTERN_ARCHITECTURE.md                 # Complete architectural specification & API documentation
```

---

## 🗺️ Project Mapping Reference

The active source code runs within the project structure at:

| Intern Module Component | Active Project Location | Purpose |
|---|---|---|
| **Backend Views** | `backend/apps/intern/views.py` | Implements `/scorecard/`, `/my-goals/`, `/my-goals/<id>/progress/`, `/evidence/submit/`, `/my-appraisals/` |
| **Backend URLs** | `backend/apps/intern/urls.py` | Configures `intern` namespace under `/api/intern/` |
| **PMS Database Seed** | `backend/seed_intern_pms.py` | Creates 80+ interns, managers, cycles, KPIs, and appraisals |
| **Account Seed** | `backend/seed_dailoqa_interns.py` | Creates `@dailoqa.com` intern test accounts |
| **Intern Portal View** | `epms_frontend/src/modules/intern/InternModule.tsx` | Hub with direct cards to Dashboard, Goals, Appraisals, and IDP |
| **Scorecard Dashboard** | `epms_frontend/src/pages/EmployeeDashboard.tsx` | Live goal sliders ($0–100\%$), evidence submission modal, self-appraisals, and metrics |
| **API Integration** | `epms_frontend/src/features/dashboard/dashboardApi.ts` | RTK Query endpoints connected to `/api/intern/` |
| **Data Types** | `epms_frontend/src/features/dashboard/dashboardTypes.ts` | Type definitions for `InternScorecard`, `InternGoal`, `InternAppraisal` |
| **Architecture Spec** | `docs/INTERN_ARCHITECTURE.md` | Persona definition, privacy gating rules, database relationships |

---

## 🔑 Demo Intern Credentials

- **Demo Email:** `alex.dev@company.com` *(or any intern email such as `tanvi.sharma@dailoqa.com`)*
- **Demo Password:** `AlexPassword123!` *(or lowercase first name: `tanvi`, `alex`, `jasleen`)*
- **OTP Passcode:** `123456` *(or ⚡ 1-Click Auto-Fill)*
- **Assigned Role:** `INTERN` / `ROLE_INTERN`

---

## 📡 API Endpoints Summary

| HTTP Method | Route | Description |
|---|---|---|
| `GET` | `/api/intern/scorecard/` | Returns total goals, completed count, average progress %, active appraisal status, published score |
| `GET` | `/api/intern/my-goals/` | Retrieves all active assigned goals with weightage, cycle, and assigned manager |
| `POST` | `/api/intern/my-goals/<uuid:pk>/progress/` | Real-time slider update ($0–100\%$) and automatic status update (`IN_PROGRESS` / `COMPLETED`) |
| `POST` | `/api/intern/evidence/submit/` | Submits PR / Figma / report URLs with verification notes for assigned goals |
| `GET` | `/api/intern/my-appraisals/` | Privacy-gated appraisals (masks unpublished manager ratings, reveals calibrated score when published) |

---

## 🚀 Running the Project

```bash
# 1. Start Django Backend
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# 2. Start Frontend
cd epms_frontend
npm install
npm run dev
```
Open **`http://localhost:5173/`** and log in with the intern credentials.
