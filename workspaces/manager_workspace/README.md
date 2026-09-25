# 👨‍💼 Manager Workspace (Tech & QA Leads)

Welcome to the **Manager Workspace**. This folder contains everything you need to develop, test, and maintain the Manager & Team Lead features of PERFORMAX (EPMS).

---

## 🔑 Your Login Credentials
- **Tech Manager Email:** `marcus.tech@company.com`
- **Username:** `manager_marcus`
- **Password:** `MarcusPassword123!`
- **QA Manager Email:** `elena.qa@company.com`
- **Password:** `ElenaPassword123!`
- **OTP Passcode:** `123456` *(or ⚡ 1-Click Auto-Fill)*
- **Assigned Role:** `MANAGER`

---

## 🛠️ Your Code Locations

### 1. Frontend Development:
- **Module Entry:** `epms_frontend/src/modules/manager/ManagerModule.tsx`
- **Manager Dashboard:** `epms_frontend/src/pages/ManagerDashboard.tsx`
- **Team Roster & KPIs:** `epms_frontend/src/pages/kpi/TeamKpiOverviewPage.tsx`
- **Goal Management:** `epms_frontend/src/pages/kpi/GoalManagementPage.tsx`
- **1-on-1 Sync Meetings:** `epms_frontend/src/pages/meetings/OneOnOneMeetingsPage.tsx`
- **360 Reviews:** `epms_frontend/src/pages/feedback360/Feedback360PendingPage.tsx`

### 2. Backend Development:
- **App Directory:** `backend/apps/manager/`
- **Views / API Logic:** `backend/apps/manager/views.py`
- **URL Routing:** `backend/apps/manager/urls.py`
- **Goal & KPI Models:** `backend/apps/goals/models.py`
- **Evidence Models:** `backend/apps/evidence/models.py`

---

## 📡 Dedicated API Endpoints
All Manager specific endpoints are grouped under `/api/manager/`:

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/manager/dashboard/` | Team size, pending PR reviews, urgent review actions |
| `GET` | `/api/manager/team-goals/` | All goals & completion progress for direct reports |
| `GET` | `/api/manager/evidence-reviews/` | Submitted PRs and artifacts needing manager sign-off |
| `POST` | `/api/manager/evidence-reviews/<id>/decision/` | Approve or request revisions on submitted evidence |
| `GET` | `/api/manager/appraisals/` | Team appraisal submissions and manager ratings |

---

## 🚀 How to Run & Test
```bash
# 1. Start backend server
cd backend
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000

# 2. Start frontend server (in another tab)
cd epms_frontend
npm run dev
```
Open **`http://localhost:5173/`** and sign in as Tech Manager.
