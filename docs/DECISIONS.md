# Architectural Decision Records (ADR) — Intern PMS

This document records the foundational technical and architectural decisions made while engineering the **Intern Performance Management System (PMS)**.

---

## ADR 001: Architecture Transition from Spring Boot to Django REST Framework

### Status
Accepted & Implemented

### Context
The reference repository (`EmployeePerformanceManagementSystem-EPMS`) utilized Java 17, Spring Boot 3, and MySQL. While functional, it exhibited excessive boilerplate, rigid ORM entity mappings, and fragmented micro-service patterns that hindered rapid iteration for intern-specific workflows.

### Decision
Re-architect the production backend using **Python 3.11+ and Django 5.1 with Django REST Framework (DRF)**, while preserving the existing Spring Boot implementation untouched under `epms_backend/` as reference.

### Consequences
- **Positive:** Rapid development velocity, built-in ORM migration safety, declarative serializer validation, native SimpleJWT ecosystem, and out-of-the-box OpenAPI 3 schema generation via `drf-spectacular`.
- **Negative:** Lower raw multi-threaded CPU throughput compared to Java, mitigated by multi-process Gunicorn deployment and database-level aggregations.

---

## ADR 002: Primary Database Selection — PostgreSQL 16 with UUID v4

### Status
Accepted & Implemented

### Context
The original system utilized MySQL with auto-incrementing integer IDs. Auto-increment IDs expose the system to ID enumeration attacks and make multi-region database sharding complex.

### Decision
Standardize on **PostgreSQL 16** with `uuid.uuid4` primary keys across all relational entities.

### Consequences
- **Positive:** Cryptographically secure IDs, support for rich JSONB metadata fields in `AuditLog` and `EvidenceSubmission`, transactional DDL migrations, and advanced window functions for scoring percentiles.
- **Negative:** Slightly larger index footprint compared to 4-byte integers (mitigated by B-tree indexes).

---

## ADR 003: Stateless Authentication via JWT with Role Claims

### Status
Accepted & Implemented

### Context
Client applications require authenticated access without session affinity or server-side session memory overhead.

### Decision
Implement stateless JWT authentication via `djangorestframework-simplejwt`. The access token embeds custom claims (`role`, `username`, `email`, and `profile_id`), allowing the React frontend to adapt UI navigation immediately without secondary roundtrips to `/auth/me`.

### Consequences
- **Positive:** Scalable stateless API requests, decoupled frontend authentication state, 60-minute access lifetime with rolling refresh tokens.
- **Negative:** Tokens cannot be revoked before expiration unless token blacklisting or sliding key revocation is maintained.

---

## ADR 004: Evidence Submission & Review Lifecycle

### Status
Accepted & Implemented

### Context
In intern performance evaluation, objective goal achievement requires verifiable proof (PR links, documents, Storybook deployments, test reports) rather than self-reported completion numbers.

### Decision
Introduce a dedicated `EvidenceSubmission` model linked to `Goal` with an explicit 4-state review machine:
`PENDING -> APPROVED | REVISION_REQUESTED | REJECTED`.

### Consequences
- **Positive:** Objective accountability; managers cannot mark goals complete without reviewing proof; interns receive concrete feedback if revisions are requested.
- **Negative:** Adds a step to the goal completion workflow.

---

## ADR 005: Multi-Factor Configurable Scoring Formula

### Status
Accepted & Implemented

### Context
Intern evaluation requires balancing empirical output (goals/KPIs) with behavioral competencies (mentorship reception, code quality, communication) and self-reflection.

### Decision
Implement `ScoringService` with the following weighted composition:
$$\text{Overall Score} = (0.40 \times \text{Goals}) + (0.40 \times \text{Manager Criteria}) + (0.20 \times \text{Self-Assessment})$$
All weights are stored in `EvaluationCriterion` rows, allowing HR to adjust policy weights dynamically.

### Consequences
- **Positive:** 100% reproducible, transparent, mathematical scoring; no ambiguous grading.
- **Negative:** Requires all evaluation components to be completed before a final score is calculated.

---

## ADR 006: Attendance Tracking without Verification Overhead

### Status
Accepted & Implemented

### Context
The user specifically requested: *"remove attendance check-in/out verification"*. Standard enterprise HR attendance models record daily attendance without blocking managers with daily verification queues.

### Decision
Attendance is recorded as daily records (`AttendanceRecord`) with a database unique constraint on `(employee, attendance_date)`. The verification/approval queue was removed, treating attendance as an informative factor for evaluation and report analytics.

### Consequences
- **Positive:** Zero administrative friction; prevents duplicate clock-ins; calculates attendance rate percentage automatically.
- **Negative:** Relies on HR or managers to regularize absent days if disputes arise.

---

## ADR 007: Immutable Audit Trail

### Status
Accepted & Implemented

### Context
Performance reviews and administrative role modifications can lead to compliance inquiries.

### Decision
Create `AuditLog` model recording `actor`, `action`, `entity_type`, `entity_id`, `metadata`, and `ip_address`. The audit service logs all critical mutations (role promotions, appraisal publications, database seeds).

### Consequences
- **Positive:** Full regulatory compliance, traceability, and forensic audit capability.
- **Negative:** Additional row write on sensitive mutations.
