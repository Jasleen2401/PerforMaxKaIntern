# 🎓 Intern Workspace

Welcome to the **Intern Workspace**. This folder contains everything you need to develop, test, and maintain the Intern features of PERFORMAX (EPMS).

---

## 🔑 Your Login Credentials
- **Demo Intern Email:** `alex.dev@company.com` *(or your `@dailoqa.com` email)*
- **Demo Password:** `AlexPassword123!` *(or your first name in lowercase)*
- **OTP Passcode:** `123456` *(or ⚡ 1-Click Auto-Fill)*
- **Assigned Role:** `INTERN`

---

## 🛠️ Your Code Locations

### 1. Frontend Development:
- **Module Entry:** `epms_frontend/src/modules/intern/InternModule.tsx`
- **Intern Dashboard:** `epms_frontend/src/pages/EmployeeDashboard.tsx`
- **My Goals & Progress:** `epms_frontend/src/pages/kpi/MyKpiGoalsPage.tsx`
- **Self-Appraisal:** `epms_frontend/src/pages/appraisals/AppraisalListPage.tsx`
- **Continuous Feedback:** `epms_frontend/src/pages/continuous/ContinuousFeedbackPage.tsx`
- **IDP & Learning:** `epms_frontend/src/pages/idp/IdpManagementPage.tsx`

### 2. Backend Development:
- **App Directory:** `backend/apps/intern/`
- **Views / API Logic:** `backend/apps/intern/views.py`
- **URL Routing:** `backend/apps/intern/urls.py`
- **Attendance Models:** `backend/apps/attendance/models.py`
- **Training Models:** `backend/apps/training/models.py`

---

## 📡 Dedicated API Endpoints
All Intern specific endpoints are grouped under `/api/intern/`:

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/intern/scorecard/` | Personal completion %, overall score, active cycle status |
| `GET` | `/api/intern/my-goals/` | Active assigned goals and weightages |
| `POST` | `/api/intern/my-goals/<id>/progress/` | Update progress slider on a goal ($0–100\%$) |
| `POST` | `/api/intern/evidence/submit/` | Submit PR / Figma / doc evidence for manager approval |
| `GET` | `/api/intern/my-appraisals/` | Personal self-evaluations and published scores |

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
Open **`http://localhost:5173/`** and sign in as Intern.
