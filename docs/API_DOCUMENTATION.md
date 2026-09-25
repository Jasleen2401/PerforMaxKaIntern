# Complete REST API Documentation — Intern PMS

## 1. Overview & Base URLs

The **Intern Performance Management System (PMS)** exposes standard RESTful JSON APIs.

- **Base URL (Local Development):** `http://localhost:8000/api`
- **Interactive Swagger UI:** `http://localhost:8000/api/docs/`
- **ReDoc UI:** `http://localhost:8000/api/redoc/`
- **OpenAPI 3.0 Schema (JSON/YAML):** `http://localhost:8000/api/schema/`

### Standard Request Headers
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: application/json
```

### Standard Pagination Format
All list endpoints support DRF pagination:
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/goals/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## 2. API Endpoint Directory

### 2.1 Authentication (`/api/auth/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `POST` | `/api/auth/login/` | Exchange credentials for JWT access/refresh tokens. | Public |
| `POST` | `/api/auth/token/refresh/` | Refresh expired access token. | Public |
| `POST` | `/api/auth/refresh-token/` | Alias for token refresh. | Public |
| `GET` | `/api/auth/me/` | Fetch current user and profile data. | Authenticated |
| `POST` | `/api/auth/change-password/` | Update current user's password. | Authenticated |

---

### 2.2 Organization & Hierarchy (`/api/organization/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/organization/departments/` | List or create departments. | Authenticated (POST: HR/Admin) |
| `GET`, `PUT`, `DELETE` | `/api/organization/departments/{id}/` | Retrieve, update, or remove department. | Authenticated (PUT/DEL: HR/Admin) |
| `GET`, `POST` | `/api/organization/teams/` | List or create teams. | Authenticated (POST: HR/Admin/Manager) |
| `GET`, `PUT`, `DELETE` | `/api/organization/teams/{id}/` | Retrieve, update, or delete team. | Authenticated |
| `GET`, `POST` | `/api/organization/memberships/` | List or assign intern to a team. | Authenticated (POST: HR/Admin/Manager) |
| `DELETE` | `/api/organization/memberships/{id}/` | Remove intern from a team. | HR/Admin/Manager |

---

### 2.3 Employees & Profiles (`/api/employees/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/api/employees/profiles/` | List profiles (filtered by department, manager, status). | Authenticated |
| `GET`, `PUT` | `/api/employees/profiles/{id}/` | Retrieve or update employee profile. | Authenticated (Self, Manager, HR) |
| `POST` | `/api/employees/create-employee/` | Atomically create User account and EmployeeProfile. | HR, Super Admin |

#### Request Example: Create Employee (`POST /api/employees/create-employee/`)
```json
{
  "username": "intern_charlie",
  "email": "charlie@company.com",
  "password": "CharliePassword123!",
  "role": "INTERN",
  "employee_code": "INT-2025-004",
  "first_name": "Charlie",
  "last_name": "Davis",
  "department": "8f83b194-c119-482d-8957-827cfa4a34b2",
  "manager": "b3e0d691-628b-4029-9e73-b3c14d9a6c11",
  "designation": "Software Intern",
  "joining_date": "2025-07-01",
  "phone_number": "+1-555-0299"
}
```

---

### 2.4 Performance Cycles & Scoring Criteria (`/api/performance/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/performance/cycles/` | List or create performance cycles. | Authenticated (POST: HR/Admin) |
| `GET`, `PUT` | `/api/performance/cycles/{id}/` | Retrieve or update cycle status (DRAFT/ACTIVE/CLOSED). | Authenticated (PUT: HR/Admin) |
| `GET`, `POST` | `/api/performance/criteria/` | List or create evaluation criteria & weights. | Authenticated (POST: HR/Admin) |
| `GET`, `PUT` | `/api/performance/criteria/{id}/` | Update criterion weight, max score, or active flag. | HR, Super Admin |
| `GET` | `/api/performance/scoring-policy/` | Fetch current breakdown weights and active criteria. | Authenticated |

---

### 2.5 Goals & KPIs (`/api/goals/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/goals/` | List goals or assign a new goal to an intern. | Authenticated (POST: Manager/HR) |
| `GET`, `PUT`, `DELETE` | `/api/goals/{id}/` | Retrieve, edit, or delete a goal. | Authenticated |
| `POST` | `/api/goals/{id}/progress/` | Intern logs progress update percentage and notes. | Intern (Assigned), Manager |
| `GET`, `POST` | `/api/goals/kpis/` | List or attach KPI metrics to a goal. | Authenticated (POST: Manager/HR) |
| `PUT` | `/api/goals/kpis/{id}/` | Update achieved value on a KPI metric. | Authenticated |

#### Request Example: Log Goal Progress (`POST /api/goals/{id}/progress/`)
```json
{
  "progress_percentage": "85.00",
  "comment": "Completed integration testing with PostgreSQL; documentation updated in README."
}
```

---

### 2.6 Evidence Submission & Review (`/api/evidence/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/evidence/` | List evidence or submit new evidence for a goal. | Authenticated (POST: Intern) |
| `GET` | `/api/evidence/{id}/` | Retrieve evidence details and review history. | Authenticated |
| `POST` | `/api/evidence/{id}/review/` | Review submitted evidence (APPROVE, REJECT, REVISION). | Manager, HR, Super Admin |

#### Request Example: Review Evidence (`POST /api/evidence/{id}/review/`)
```json
{
  "review_status": "APPROVED",
  "review_notes": "All unit tests pass and coverage exceeds the 90% threshold. Great work!"
}
```

---

### 2.7 Appraisals & Evaluations (`/api/performance/appraisals/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/performance/appraisals/` | List appraisals or initiate a cycle evaluation. | Authenticated |
| `GET` | `/api/performance/appraisals/{id}/` | Retrieve appraisal details (ratings hidden from intern until published). | Authenticated |
| `POST` | `/api/performance/appraisals/{id}/submit/` | Submit self-assessment or manager evaluation. | Intern (Self) / Manager |
| `POST` | `/api/performance/appraisals/{id}/publish/` | Publish final appraisal score and ratings to intern. | HR, Super Admin |
| `GET` | `/api/performance/appraisals/{id}/score-breakdown/` | Compute detailed mathematical score breakdown. | Authenticated (Gated for intern) |

#### Request Example: Submit Manager Evaluation (`POST /api/performance/appraisals/{id}/submit/`)
```json
{
  "comments": "Consistently delivers high quality features and collaborates proactively.",
  "ratings": [
    {
      "criterion_id": "2781cb9f-3ef8-4bf0-b184-f7cb63e17cf3",
      "score": "95.00",
      "comments": "Deep comprehension of system architecture and DB tuning."
    },
    {
      "criterion_id": "893c52a0-43ef-447a-8ae8-4235882343e2",
      "score": "90.00",
      "comments": "Takes full ownership of tickets through to production."
    }
  ]
}
```

---

### 2.8 Attendance Tracking (`/api/attendance/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/attendance/` | List attendance logs or record daily presence. | Authenticated (POST: Manager/HR) |
| `GET` | `/api/attendance/{id}/` | Retrieve attendance record. | Authenticated |

---

### 2.9 Training & Development (`/api/training/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/training/courses/` | List or register training courses. | Authenticated (POST: HR/Admin) |
| `GET`, `POST` | `/api/training/enrollments/` | List or enroll interns in courses. | Authenticated (POST: HR/Manager) |
| `PUT` | `/api/training/enrollments/{id}/` | Update course completion percentage or mark completed. | Authenticated |

---

### 2.10 Continuous Feedback & Recognition
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET`, `POST` | `/api/feedback/` | List feedback (scoped by visibility) or give feedback. | Authenticated |
| `GET`, `POST` | `/api/performance/rewards/` | List or award recognition badges to interns. | Authenticated (POST: Manager/HR) |
| `GET`, `POST` | `/api/performance/pips/` | List or institute a Performance Improvement Plan. | Manager, HR, Super Admin |

---

### 2.11 Reports & Executive Analytics (`/api/reports/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/api/reports/my-performance/` | Intern personal performance scorecard. | Intern (Own), Manager (Team), HR |
| `GET` | `/api/reports/team-performance/` | Manager team overview (goals %, pending reviews). | Manager, HR, Super Admin |
| `GET` | `/api/reports/organization-performance/` | Company-wide bell curve and cycle analytics. | HR, Super Admin |
| `GET` | `/api/reports/export/csv/` | Download CSV roster report. | Manager, HR, Super Admin |

---

### 2.12 Notifications & Audit (`/api/notifications/`, `/api/audit/`)
| Method | Endpoint | Description | Role Access |
|---|---|---|---|
| `GET` | `/api/notifications/` | List user in-app alerts (read/unread). | Authenticated (Own) |
| `POST` | `/api/notifications/mark-all-read/` | Mark all unread notifications as read. | Authenticated (Own) |
| `GET` | `/api/audit/logs/` | List system audit log events. | Super Admin |
