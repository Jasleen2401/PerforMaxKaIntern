# Intern Performance Management System (PMS)

A production-quality, modular, end-to-end web platform engineered to streamline intern onboarding, objective setting, evidence-backed progress tracking, multi-phase appraisal scoring, and executive reporting.

---

## 🌟 Key Capabilities

- **🔐 Robust Role-Based Access Control (RBAC):** Strict database- and route-level authorization across 4 distinct personas: `INTERN`, `MANAGER`, `HR`, and `SUPER_ADMIN`.
- **🎯 Dynamic Goal & KPI Tracking:** Managers assign weighted goals with quantitative KPIs; interns log progress with automatic completion updates.
- **📎 Verifiable Evidence Reviews:** Interns attach PR links, design specs, or documents; managers review, approve, or request revisions.
- **⚖️ Transparent Mathematical Scoring Engine:** Weighted evaluation combining Goal Completion (40%), Manager Criteria Assessment (40%), and Intern Self-Assessment (20%) with configurable criteria weights.
- **🔒 Privacy Gated Appraisal Lifecycles:** Appraisals transition through `DRAFT -> SUBMITTED -> UNDER_REVIEW -> HR_APPROVED -> PUBLISHED`. Interns are strictly barred from viewing manager ratings until HR officially publishes the cycle.
- **📅 Daily Attendance Tracking:** High-integrity daily attendance logging with unique `(employee, date)` constraints.
- **🎓 Training & Curriculum Tracking:** Track course completion rates, hours, and skill acquisitions.
- **📊 Executive Reports & Analytics:** SQL-aggregated dashboards for Intern Personal Performance, Team Roster Overview, and HR Bell Curve Analytics with CSV export.
- **📜 Immutable Tamper-Evident Audit Trail:** Every administrative mutation and appraisal event is logged with actor, entity ID, and metadata.
- **📖 OpenAPI 3.0 & Swagger UI:** Fully interactive schema documentation with JWT Bearer authentication.

---

## 📁 Sorted Architecture & Folder Directory Map

The codebase is organized into modular, domain-isolated directories for immediate, intuitive navigation:

```
Performax/
│
├── workspaces/                   # 👥 Role-Based Workspaces (Fast Developer Access)
│   ├── hr_workspace/             #    HR Partner: cycle setup, criteria, org reports
│   ├── manager_workspace/        #    Manager: team reviews, goal assignment, PIPs
│   ├── intern_workspace/         #    Intern: self-assessment, attendance, progress
│   └── superadmin_workspace/     #    Super Admin: user management, roles, audit logs
│
├── backend/                      # ⚙️ Django REST API & Business Logic
│   ├── config/                   #    Settings, URLs, JWT, SQLite/PostgreSQL fallback
│   ├── apps/
│   │   ├── hr/                   #    ⚡ Dedicated HR API views & endpoints
│   │   ├── manager/              #    ⚡ Dedicated Manager API views & endpoints
│   │   ├── intern/               #    ⚡ Dedicated Intern API views & endpoints
│   │   ├── superadmin/           #    ⚡ Dedicated SuperAdmin API views & endpoints
│   │   ├── accounts/             #    User model, JWT tokens, Email OTP
│   │   ├── employees/            #    Employee profiles, mentors, hierarchy
│   │   ├── performance/          #    Appraisal cycles, templates, scoring engine
│   │   ├── goals/                #    SMART goals, KPIs, milestone tracking
│   │   ├── evidence/             #    Proof uploads, manager approval workflow
│   │   ├── feedback/             #    Continuous 360 feedback, comments
│   │   ├── attendance/           #    Daily clock-in/out records
│   │   ├── training/             #    Courses & employee enrollments
│   │   ├── reports/              #    Analytics services & CSV exports
│   │   └── audit/                #    Immutable audit trails
│   └── seed_intern_pms.py        #    Realistic demo database seeder
│
├── epms_frontend/                # 🌐 React 18 + Vite + Tailwind Frontend
│   └── src/
│       ├── logins/               #    Role login hubs (admin, hr, manager, intern)
│       ├── pages/                #    UI pages (admin/, appraisal/, kpi/, continuous/, pip/)
│       ├── features/             #    Redux Toolkit state slices & RTK Query APIs
│       └── components/           #    Reusable design system components
│
├── database/                     # 🗄️ Database Management
│   ├── scripts/                  #    SQL maintenance & corruption recovery scripts
│   └── README.md                 #    Schema design, ER diagram & commands
│
└── docs/                         # 📚 Architecture Specs & Plans
    ├── plans/                    #    All 16 planning docs organized by domain
    └── *.md                      #    System design, RBAC specs, and API docs
```

---

## 🛠 Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11+, Django 5.1+, Django REST Framework, `djangorestframework-simplejwt`, `drf-spectacular`, `django-filter`, `psycopg2-binary` |
| **Database** | PostgreSQL 16 (UUID v4 primary keys, normalized schema, transactional DDL) |
| **Frontend** | React 19, TypeScript, Vite, Redux Toolkit, RTK Query, Tailwind CSS, Lucide Icons |
| **Testing** | Django `TestCase`, DRF `APITestCase`, Pytest (25/25 passing automated tests) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python:** 3.11 or 3.12
- **PostgreSQL:** 16 (`brew install postgresql@16 && brew services start postgresql@16`)
- **Node.js:** 18+

### 2. Database Setup
```bash
# Connect to PostgreSQL and create database & user
psql postgres -c "CREATE USER intern_pms_user WITH PASSWORD 'intern_pms_password';"
psql postgres -c "ALTER USER intern_pms_user CREATEDB;"
psql postgres -c "CREATE DATABASE intern_pms_db OWNER intern_pms_user;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE intern_pms_db TO intern_pms_user;"
```

### 3. Backend Setup & Seed
```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations & seed realistic demo data
python manage.py migrate
python seed_intern_pms.py

# Start Django backend server
python manage.py runserver 0.0.0.0:8000
```
- API Base: `http://localhost:8000/api/`
- Interactive Swagger UI: `http://localhost:8000/api/docs/`
- ReDoc UI: `http://localhost:8000/api/redoc/`

### 4. Frontend Setup
```bash
cd epms_frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
- Frontend application runs at: `http://localhost:5173/`

---

## 👥 Built-in Demo User Accounts

The database seeder (`backend/seed_intern_pms.py`) initializes realistic accounts across all personas:

| Role | Username | Email | Default Password | Description |
|---|---|---|---|---|
| **SUPER_ADMIN** | `admin` | `admin@company.com` | `AdminPassword123!` | System administrator with full access to audit logs & global settings. |
| **HR** | `hr_sarah` | `sarah.hr@company.com` | `SarahPassword123!` | Head of People; manages cycles, criteria weights, and publishes appraisals. |
| **MANAGER** | `manager_marcus` | `marcus.tech@company.com` | `MarcusPassword123!` | Engineering Lead; assigns goals, reviews evidence, evaluates interns. |
| **MANAGER** | `manager_elena` | `elena.qa@company.com` | `ElenaPassword123!` | QA Lead & Mentor. |
| **INTERN** | `intern_alex` | `alex.dev@company.com` | `AlexPassword123!` | Backend intern with goals, evidence, attendance, and published appraisal. |
| **INTERN** | `intern_maya` | `maya.ux@company.com` | `MayaPassword123!` | Frontend & UI/UX intern. |
| **INTERN** | `intern_liam` | `liam.qa@company.com` | `LiamPassword123!` | QA Automation intern. |

---

## 🧪 Automated Testing & Verification

The test suite covers model invariants, database constraints, scoring formulas, and role-based permissions:

```bash
cd backend
source venv/bin/activate
python manage.py test apps --verbosity=2
```

**Results:**
```text
Ran 25 tests in 15.634s
OK (25 tests passed, 0 failures, 0 warnings)
```

---

## 📚 Comprehensive Documentation Index

All architectural specifications, persona guides, and reports are located in the `docs/` folder:

### 🎭 Persona Guides & Architecture Sorted by Login:
- 👑 **[docs/SUPER_ADMIN_ARCHITECTURE.md](docs/SUPER_ADMIN_ARCHITECTURE.md)**: Full Super Admin capabilities, audit trails, security matrix, and org governance.
- 🏢 **[docs/HR_PARTNER_ARCHITECTURE.md](docs/HR_PARTNER_ARCHITECTURE.md)**: HR review cycles, 1–10 criteria weights, approval & publish lifecycles, and PIP tracking.
- 👨‍💼 **[docs/MANAGER_ARCHITECTURE.md](docs/MANAGER_ARCHITECTURE.md)**: Engineering/QA Manager goal assignment, evidence reviews, team evaluations, and 1-on-1s.
- 🎓 **[docs/INTERN_ARCHITECTURE.md](docs/INTERN_ARCHITECTURE.md)**: Intern scorecard, self-assessment, evidence submissions, attendance, and training tracking.

### 🏛️ System & Engineering Specifications:
- 🏛️ **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: System topology, component diagram, RBAC matrix, and lifecycle state machines.
- 🔑 **[docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)**: JWT token flow, claims specification, and authentication endpoints.
- 📡 **[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)**: Complete REST API directory with request and response payloads.
- 🗄️ **[docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md)**: Normalized relational schema ERD, 21 models, indexes, and constraints.
- 💻 **[docs/DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md)**: Local developer setup, workflows, and styling guidelines.
- 🚢 **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Dockerfile, Docker Compose, Gunicorn, Nginx SSL, and backup operations.
- 🧪 **[docs/TESTING.md](docs/TESTING.md)**: Test matrix, invariant checks, coverage, and CI configuration.
- ⚖️ **[docs/DECISIONS.md](docs/DECISIONS.md)**: Architectural Decision Records (ADR 001 to ADR 007).
- 🔍 **[docs/REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md)**: Architectural audit and gap analysis of reference implementation.
