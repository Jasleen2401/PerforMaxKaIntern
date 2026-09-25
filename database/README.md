# 🗄️ Performax Database Architecture & Scripts

## Overview
Performax supports both **PostgreSQL** (Production) and **SQLite** (Local Development) via dynamic environment fallback.

- **Engine:** PostgreSQL 14+ / SQLite 3
- **ORM:** Django ORM with automated migrations
- **Seed Script:** `backend/seed_intern_pms.py`

---

## Directory Contents

| Path | Purpose |
|---|---|
| `database/scripts/check_corrupted_phases.sql` | Diagnostic script to identify corrupted appraisal cycle workflow phases |
| `database/scripts/cleanup_corrupted_phases.sql` | Automated cleanup query to repair inconsistent appraisal phase states |

---

## Core Entities & Tables

```
User (accounts_user)
  ├── EmployeeProfile (employees_employeeprofile)
  │     ├── Department (organization_department)
  │     ├── Manager (accounts_user)
  │     └── Team (organization_team)
  │
  ├── PerformanceCycle (performance_performancecycle)
  │     ├── Appraisal (performance_appraisal)
  │     │     ├── AppraisalRating (performance_appraisalrating)
  │     │     └── EvaluationCriterion (performance_evaluationcriterion)
  │     │
  │     └── Goal (goals_goal)
  │           ├── KPI (goals_kpi)
  │           └── EvidenceSubmission (evidence_evidencesubmission)
  │
  ├── ContinuousFeedback (feedback_feedback)
  ├── AttendanceRecord (attendance_attendancerecord)
  ├── PerformanceImprovementPlan (performance_performanceimprovementplan)
  ├── RecognitionReward (performance_recognitionreward)
  └── AuditLog (audit_auditlog)
```

---

## Useful Database Commands

```powershell
# Run database migrations
cd backend
python manage.py migrate

# Seed database with full demo dataset
python seed_intern_pms.py

# Inspect database schema
python manage.py inspectdb

# Open interactive database shell
python manage.py dbshell
```
