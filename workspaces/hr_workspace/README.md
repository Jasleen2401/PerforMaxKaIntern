# 🏢 HR Partner Workspace

Welcome to the **HR Partner Workspace**. This folder contains everything you need to develop, test, and maintain the HR features of PERFORMAX (EPMS).

---

## 🔑 Your Login Credentials
- **Login Email:** `sarah.hr@company.com`
- **Username:** `hr_sarah`
- **Password:** `SarahPassword123!`
- **OTP Passcode:** `123456` *(or ⚡ 1-Click Auto-Fill)*
- **Assigned Role:** `HR`

---

## 🛠️ Your Code Locations

### 1. Frontend Development:
- **Module Entry:** `epms_frontend/src/modules/hr/HrModule.tsx`
- **HR Dashboard:** `epms_frontend/src/pages/HrDashboard.tsx`
- **Appraisal Review:** `epms_frontend/src/pages/appraisals/AppraisalListPage.tsx`
- **1–10 Criteria Management:** `epms_frontend/src/pages/admin/EvaluationCriteriaPage.tsx`
- **Cycle Management:** `epms_frontend/src/pages/admin/PerformanceCycleManagement.tsx`
- **PIP & IDP Tracking:** `epms_frontend/src/pages/pip/PipManagementPage.tsx`

### 2. Backend Development:
- **App Directory:** `backend/apps/hr/`
- **Views / API Logic:** `backend/apps/hr/views.py`
- **URL Routing:** `backend/apps/hr/urls.py`
- **Performance Models:** `backend/apps/performance/models.py`

---

## 📡 Dedicated API Endpoints
All HR specific endpoints are grouped under `/api/hr/`:

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/hr/dashboard/` | Organization-level review metrics and pipeline health |
| `GET` | `/api/hr/cycles/` | List and manage performance review cycles |
| `POST` | `/api/hr/cycles/<id>/publish/` | Trigger official release of final calibrated scores to interns |
| `GET` | `/api/hr/criteria/` | Configure 1–10 competency weights (must sum to 100%) |
| `GET` | `/api/hr/pips/` | Organization-wide active PIP plans |
| `GET` | `/api/hr/analytics/bell-curve/` | Score distribution across performance bands |

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
Open **`http://localhost:5173/`** and sign in as HR Partner.
