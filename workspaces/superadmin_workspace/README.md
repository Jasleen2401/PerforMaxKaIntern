# 👑 Super Admin Workspace

Welcome to the **Super Admin Workspace**. This folder contains everything you need to develop, test, and maintain the Super Admin features of PERFORMAX (EPMS).

---

## 🔑 Your Login Credentials
- **Login Email:** `admin@company.com`
- **Username:** `admin`
- **Password:** `Admin@123` *(or `AdminPassword123!`)*
- **OTP Passcode:** `123456` *(or ⚡ 1-Click Auto-Fill)*
- **Assigned Role:** `SUPER_ADMIN`

---

## 🛠️ Your Code Locations

### 1. Frontend Development:
- **Module Entry:** `epms_frontend/src/modules/superadmin/SuperAdminModule.tsx`
- **Employee Management:** `epms_frontend/src/pages/admin/EmployeeList.tsx`
- **Permissions Matrix:** `epms_frontend/src/pages/admin/org/RolePermissionMatrix.tsx`
- **Audit Logs:** `epms_frontend/src/pages/admin/AuditLogsPage.tsx`
- **Strategic Analytics:** `epms_frontend/src/pages/admin/StrategicAnalyticsPage.tsx`

### 2. Backend Development:
- **App Directory:** `backend/apps/superadmin/`
- **Views / API Logic:** `backend/apps/superadmin/views.py`
- **URL Routing:** `backend/apps/superadmin/urls.py`
- **Audit Model:** `backend/apps/audit/models.py`

---

## 📡 Dedicated API Endpoints
All Super Admin specific endpoints are grouped under `/api/superadmin/`:

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/superadmin/dashboard/` | Overall system metrics and recent audit events |
| `GET` | `/api/superadmin/audit-logs/` | System-wide immutable audit trail |
| `GET` | `/api/superadmin/employees/` | Complete employee directory across all departments |
| `POST` | `/api/superadmin/employees/<id>/lock-status/` | Toggle account active/lock status |
| `GET` | `/api/superadmin/security-matrix/` | Active RBAC permission mapping |

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
Open **`http://localhost:5173/`** and sign in as Super Admin.
