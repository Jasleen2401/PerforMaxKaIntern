# REPOSITORY AUDIT REPORT
## Intern Performance Management System (PMS)
**Reference Project:** `EmployeePerformanceManagementSystem-EPMS-`  
**Date:** September 2026  
**Auditor:** Senior Software Architect & Engineering Team  

---

## 1. Executive Summary

This audit evaluates the existing `EmployeePerformanceManagementSystem-EPMS-` repository against the requirements of the new **Intern Performance Management System (PMS)**.

The current codebase is an enterprise-scale full-stack application comprising:
* **Backend:** Spring Boot (Java 17/23), Spring Data JPA, Hibernate, MySQL, Spring Security (JWT), JasperReports, Apache POI, and STOMP WebSockets (~532 Java files across 46 REST controllers and ~60 JPA models).
* **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS v4, Redux Toolkit Query (RTK Query), and React Router DOM 7 (~159 TypeScript/TSX files across 62 page components).

While the reference application provides a mature domain model for general employee appraisals, KPIs, continuous feedback, 360° feedback, and PIPs, the **Intern Performance Management System (PMS)** requires:
1. A **Django + Django REST Framework** backend running on **Python 3.11/3.12+**.
2. A **PostgreSQL** relational database with normalized models and UUID keys where practical.
3. A focused role architecture centered on **INTERN**, **MANAGER**, **HR**, and **SUPER ADMIN**.
4. Specific intern lifecycle features currently absent from the reference application: **Evidence Submission with Manager Review**, **Attendance Tracking**, **Training & Course Progress**, **Configurable Evaluation Criteria & Scoring**, **Recognition & Rewards**, and **Intern-tailored Performance Cycles**.
5. Preservation of the working reference code without destructive overwrites, providing a clean modular migration path.

---

## 2. Repository Structure Analysis

```
EmployeePerformanceManagementSystem-EPMS-/
├── .git/                                # Git repository history & branches
├── docs/                                # Project documentation & architecture specifications
├── epms_backend/                        # Existing Spring Boot (Java) backend
│   ├── src/main/java/ace/org/epms_backend/
│   │   ├── config/                      # Security, JWT, CORS, WebSockets, OpenAPI
│   │   ├── controller/                  # 46 REST Controllers (appraisal, kpi, feedback, etc.)
│   │   ├── dto/                         # Data Transfer Objects
│   │   ├── enums/                       # Domain enums (RoleType, Statuses, etc.)
│   │   ├── events/                      # Notification event listeners
│   │   ├── exception/                   # 23 custom exception classes & global advice
│   │   ├── mapper/                      # MapStruct entity-DTO mappers
│   │   ├── model/                       # ~60 JPA entities organized by domain
│   │   ├── repository/                  # 50 Spring Data JPA repositories
│   │   ├── service/                     # Business logic interfaces and implementations
│   │   └── util/                        # Helper utilities (Excel export, etc.)
│   ├── src/main/resources/              # application.properties, db migrations (V1-V4)
│   └── pom.xml                          # Maven build definition (Spring Boot 4.0.5 parent)
├── epms_frontend/                       # Existing React SPA
│   ├── src/
│   │   ├── app/                         # Redux store configuration
│   │   ├── components/                  # UI components, layouts, protected routes
│   │   ├── features/                    # Domain API slices and state
│   │   ├── pages/                       # 62 route pages (admin, appraisal, kpi, pip)
│   │   ├── routes/                      # Modular React Router configurations
│   │   └── services/                    # RTK Query baseQuery with JWT reauth
│   ├── package.json                     # Vite 8, React 19, Redux Toolkit 2, Tailwind v4
│   └── vite.config.ts                   # Bundler configuration
├── backend/                             # Target Django Backend (to be created)
└── presentation_assets/                 # Architecture & workflow SVGs
```

---

## 3. Technology Detection & State

| Component | Reference Repository Implementation | Target Intern PMS Stack |
|---|---|---|
| **Backend Runtime** | Java 17 / OpenJDK 23 | Python 3.11 / 3.12+ |
| **Backend Framework** | Spring Boot 4.0.5, Spring MVC | Django 5.x + Django REST Framework |
| **Database** | MySQL 8.0 / 9.2 (`epms_present`) | PostgreSQL 16+ |
| **Authentication** | Spring Security + custom JWT + token blacklist | SimpleJWT + custom User model + Django Auth |
| **Authorization** | RBAC (`ROLE_ADMIN/HR/MANAGER/EMPLOYEE`) + ABAC permissions | Role-based (`INTERN`, `MANAGER`, `HR`, `SUPER_ADMIN`) + DRF Permissions |
| **Frontend Framework** | React 19 + TypeScript + Vite 8 | React + TypeScript + Vite + Axios / RTK |
| **State Management** | Redux Toolkit 2 + RTK Query | RTK Query / Axios client services |
| **Styling** | Tailwind CSS v4 | Tailwind CSS / Responsive UI |
| **API Docs** | SpringDoc OpenAPI 2.8.3 (Swagger UI) | drf-spectacular (OpenAPI 3.0 / Swagger UI) |

---

## 4. Existing Functionality (What is Already Implemented)

1. **Organization & Identity:**
   * Employee profiles, Departments, Teams, Positions, Job Levels.
   * Role and Permission management (`RoleLevelPermission` matrix).
2. **Appraisal Management:**
   * Appraisal Cycles, Financial Years.
   * Dynamic form sets, categories, and question templates.
   * Self-assessment submission and Manager evaluation with e-signature support.
   * Score calculation with category weights and performance grade bands.
3. **KPI Management:**
   * Central KPI library categorized by position.
   * Versioned employee goal setting and progress log tracking.
   * Mid-cycle and final KPI scoring calculations.
4. **Continuous Feedback & 1-on-1:**
   * Peer praise/coaching messages with tags and threaded replies.
   * 1-on-1 meeting scheduling and comment logs.
5. **360° Feedback:**
   * Multi-evaluator feedback requests (peer, manager, direct report).
   * Anonymous responses and aggregated summaries.
6. **Performance Improvement Plans (PIP):**
   * Tiered severity levels, action items/objectives, scheduled review dates.
7. **Cross-Cutting Services:**
   * STOMP WebSocket notifications.
   * Structured audit logging (`AuditLog` entity).
   * PDF (JasperReports) and Excel (Apache POI) export utilities.

---

## 5. Missing Functionality (Gaps for Intern PMS)

To fulfill the **Intern Performance Management System (PMS)** specification, the following critical capabilities must be introduced:

1. **Intern-Specific Role & Access Boundaries:**
   * Dedicated `INTERN` role with strict least-privilege scoping:
     - Interns can view only assigned goals, KPIs, self-assessments, and published reviews.
     - Interns cannot see other interns' evaluations or elevate permissions.
2. **Evidence Submission & Verification Workflow (`EvidenceSubmission`):**
   * Enables interns to attach concrete artifacts (file attachments or live URLs) to assigned goals.
   * Review state machine (`PENDING`, `APPROVED`, `REJECTED`) managed by direct managers.
3. **Attendance & Engagement Tracking (`AttendanceRecord`):**
   * Daily check-in, check-out, status (`PRESENT`, `ABSENT`, `HALF_DAY`, `ON_LEAVE`), and manager/HR notes.
   * Database-level unique constraint (`employee`, `attendance_date`) to prevent duplicate logs.
4. **Training & Skill Development (`TrainingCourse` & `EmployeeTraining`):**
   * Course catalog management by HR (provider, duration, curriculum).
   * Intern enrollment tracking with completion percentages and completion dates.
5. **Recognition & Awards (`RecognitionReward`):**
   * Formal recognition tokens awarded to high-performing interns by managers and HR.
6. **Configurable Scoring & Evaluation Criteria (`EvaluationCriterion` & `AppraisalRating`):**
   * Configurable criteria weights and maximum scores stored in the database.
   * Transparent, reproducible scoring service combining Goal completion %, KPI achievement, self-assessment, and manager rating.
7. **Django REST Framework Architecture:**
   * Clean app separation: `accounts`, `organization`, `employees`, `performance`, `goals`, `feedback`, `evidence`, `attendance`, `training`, `notifications`, `reports`, `audit`.
8. **PostgreSQL Integration:**
   * PostgreSQL-optimized schemas, UUID primary keys where practical, indexes, and automated Django migrations.

---

## 6. Technical Risks & Vulnerabilities Identified in Existing Reference

1. **Security & Secrets:**
   * Committed credentials in `epms_backend/src/main/resources/application.properties` (MySQL root credentials, weak JWT secrets, Gmail SMTP app passwords).
   * **Mitigation:** Strict `.env` isolation via `django-environ` / `python-dotenv` with `.env.example` templates and `.gitignore` enforcement.
2. **Framework Divergence:**
   * The reference backend is Java/Spring Boot while the required stack is Python/Django REST Framework.
   * **Mitigation:** Retain `epms_backend` as an immutable reference model. Implement the new Intern PMS in `backend/` using modular Django apps.
3. **Database Concurrency & Constraints:**
   * Missing database constraints for attendance duplicates, negative scores, and unauthorized cross-department data leakage.
   * **Mitigation:** Enforce unique constraints, database-level check constraints, and Django model validators.
4. **Frontend Coupling:**
   * Existing React frontend expects specific Spring Boot endpoints and DTO wrapper shapes (`ApiResponse<T>`).
   * **Mitigation:** Either standardize Django REST Framework output with custom renderers/serializers or build a dedicated, clean client adapter layer to ensure zero mismatch.

---

## 7. Migration & Development Strategy

We adopt a **Parallel Domain Migration Strategy**:
1. **Preserve Reference Code:** Keep `epms_backend/` and `epms_frontend/` intact for verification and domain comparison.
2. **Implement Production Django Backend:** Establish `backend/` adhering to the required 12-app modular architecture.
3. **PostgreSQL Provisioning:** Configure PostgreSQL 16+, database users, connection strings, and run initial migrations.
4. **Custom User & Organization Layer:** Implement custom User model with role hierarchy (`SUPER_ADMIN`, `HR`, `MANAGER`, `INTERN`) and Employee profiles.
5. **Core Performance & Intern Modules:** Build Goals, KPIs, Evidence, Appraisals, Attendance, and Training.
6. **Configurable Scoring Service:** Build a tested mathematical evaluation service with transparent weighting.
7. **Frontend Integration:** Connect the React frontend to the Django REST Framework API, ensuring smooth role-based routing and dashboard rendering.
8. **Automated Verification:** Comprehensive test suite spanning unit tests, permission tests, and end-to-end user workflows.

---

## 8. Proposed Final System Architecture

```
                                  ┌────────────────────────┐
                                  │      React SPA         │
                                  │ (Vite + TS + Tailwind) │
                                  └───────────┬────────────┘
                                              │ HTTP / REST / JWT
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Django 5.x / Django REST Framework Backend                      │
├─────────────────┬─────────────────┬──────────────────┬────────────────┬────────────────┤
│ accounts        │ organization    │ employees        │ goals          │ performance    │
│ (Custom User,   │ (Departments,   │ (Profiles,       │ (Cycles, Goals,│ (Criteria,     │
│  JWT, RBAC)     │  Teams)         │  Reporting lines)│  KPIs, Progress│  Appraisals,   │
│                 │                 │                  │  Evidence)     │  Scoring)      │
├─────────────────┼─────────────────┼──────────────────┼────────────────┼────────────────┤
│ feedback        │ attendance      │ training         │ notifications  │ audit & reports│
│ (Continuous,    │ (Check-in/out,  │ (Courses,        │ (In-app alerts,│ (Action logs,  │
│  Manager notes) │  Status, Logs)  │  Enrollment)     │  Email stubs)  │  Metrics)      │
└─────────────────┴─────────────────┴──────────────────┴────────────────┴────────────────┘
                                              │
                                              ▼
                                 ┌────────────────────────┐
                                 │    PostgreSQL 16+      │
                                 │ (UUIDs, Constraints,   │
                                 │  Indexes, Audit Logs)  │
                                 └────────────────────────┘
```

---

## 9. Conclusion

The repository audit is complete. All 10 inspection criteria have been evaluated. The project foundation is ready to advance to **Milestone 1: Project Foundation & Database Architecture**.
