# Individual Development Plan (IDP) Implementation Plan

## 1. Goal

Add an Individual Development Plan module to EPMS as a mostly standalone growth-planning feature.

The IDP module should let HR/managers create development plans for employees, define development goals, track progress updates, and complete/cancel plans. It should reuse existing EPMS patterns from PIP, continuous feedback, employees, reporting lines, audit logging, notifications, RTK Query, and route/sidebar organization.

Do not modify appraisal scoring, KPI scoring, PIP logic, or 360 feedback logic.

## 2. Why IDP Fits This Project

The current system already covers evaluation and correction:

- Appraisal cycles
- Self-assessment
- Manager evaluation
- KPI goals and scoring
- 360 feedback
- Continuous feedback
- PIP
- Reports
- Notifications
- Audit logs

The missing standardized EPMS piece is employee growth after review. IDP completes the performance loop:

```text
Review -> Strengths/Gaps -> Development Goals -> Progress -> Next Review
```

IDP should be positive and development-focused, while PIP remains corrective/performance-risk focused.

## 3. Implementation Strategy

Build IDP as a new module with these backend resources:

```text
DevelopmentPlan
DevelopmentGoal
DevelopmentProgressUpdate
```

And these frontend pages:

```text
/idp
/idp/new
/idp/:id
```

The module should follow the existing PIP structure closely, but be lighter.

Use PIP as the closest reference:

- `model/pip/PipRecord.java`
- `controller/PipController.java`
- `service/impl/PipServiceImpl.java`
- `mapper/PipMapper.java`
- `services/pipApi.ts`
- `features/pip/types.ts`
- `routes/pipRoutes.tsx`
- `pages/pip/*`
- `components/pip/*`

## 4. Backend Package/File Plan

Create these files.

```text
epms_backend/src/main/java/ace/org/epms_backend/enums/IdpStatus.java
epms_backend/src/main/java/ace/org/epms_backend/enums/DevelopmentGoalStatus.java
epms_backend/src/main/java/ace/org/epms_backend/enums/DevelopmentGoalCategory.java

epms_backend/src/main/java/ace/org/epms_backend/model/idp/DevelopmentPlan.java
epms_backend/src/main/java/ace/org/epms_backend/model/idp/DevelopmentGoal.java
epms_backend/src/main/java/ace/org/epms_backend/model/idp/DevelopmentProgressUpdate.java

epms_backend/src/main/java/ace/org/epms_backend/dto/idp/IdpCreateRequest.java
epms_backend/src/main/java/ace/org/epms_backend/dto/idp/IdpUpdateRequest.java
epms_backend/src/main/java/ace/org/epms_backend/dto/idp/IdpResponse.java
epms_backend/src/main/java/ace/org/epms_backend/dto/idp/DevelopmentGoalRequest.java
epms_backend/src/main/java/ace/org/epms_backend/dto/idp/DevelopmentGoalUpdateRequest.java
epms_backend/src/main/java/ace/org/epms_backend/dto/idp/DevelopmentGoalResponse.java
epms_backend/src/main/java/ace/org/epms_backend/dto/idp/DevelopmentProgressRequest.java
epms_backend/src/main/java/ace/org/epms_backend/dto/idp/DevelopmentProgressResponse.java

epms_backend/src/main/java/ace/org/epms_backend/repository/DevelopmentPlanRepository.java
epms_backend/src/main/java/ace/org/epms_backend/repository/DevelopmentGoalRepository.java
epms_backend/src/main/java/ace/org/epms_backend/repository/DevelopmentProgressUpdateRepository.java

epms_backend/src/main/java/ace/org/epms_backend/mapper/IdpMapper.java
epms_backend/src/main/java/ace/org/epms_backend/mapper/DevelopmentGoalMapper.java
epms_backend/src/main/java/ace/org/epms_backend/mapper/DevelopmentProgressMapper.java

epms_backend/src/main/java/ace/org/epms_backend/service/IdpService.java
epms_backend/src/main/java/ace/org/epms_backend/service/DevelopmentGoalService.java
epms_backend/src/main/java/ace/org/epms_backend/service/DevelopmentProgressService.java

epms_backend/src/main/java/ace/org/epms_backend/service/impl/IdpServiceImpl.java
epms_backend/src/main/java/ace/org/epms_backend/service/impl/DevelopmentGoalServiceImpl.java
epms_backend/src/main/java/ace/org/epms_backend/service/impl/DevelopmentProgressServiceImpl.java

epms_backend/src/main/java/ace/org/epms_backend/controller/IdpController.java
epms_backend/src/main/java/ace/org/epms_backend/controller/DevelopmentGoalController.java
epms_backend/src/main/java/ace/org/epms_backend/controller/DevelopmentProgressController.java
```

## 5. Backend Enums

### `IdpStatus`

```java
public enum IdpStatus {
    DRAFT,
    ACTIVE,
    COMPLETED,
    CANCELLED
}
```

### `DevelopmentGoalStatus`

```java
public enum DevelopmentGoalStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED
}
```

### `DevelopmentGoalCategory`

```java
public enum DevelopmentGoalCategory {
    TECHNICAL_SKILL,
    SOFT_SKILL,
    LEADERSHIP,
    COMMUNICATION,
    PRODUCTIVITY,
    CAREER_GROWTH,
    OTHER
}
```

## 6. Backend Entities

Use `BaseEntity` for created/updated timestamps and follow the Lombok/JPA style used by PIP entities.

Do not use Lombok `@Data` on entities.

### `DevelopmentPlan`

Fields:

```text
idpId: Long
employee: Employee
manager: Employee
appraisal: Appraisal nullable
title: String
summary: String TEXT nullable
startDate: LocalDate
endDate: LocalDate
status: IdpStatus
createdBy: Long
isActive: Boolean
goals: List<DevelopmentGoal>
```

Relationships:

```text
employee -> ManyToOne Employee, required
manager -> ManyToOne Employee, required
appraisal -> ManyToOne Appraisal, nullable
goals -> OneToMany mappedBy plan, cascade all, orphanRemoval true
```

Suggested table:

```text
development_plans
```

### `DevelopmentGoal`

Fields:

```text
goalId: Long
plan: DevelopmentPlan
title: String
description: String TEXT nullable
category: DevelopmentGoalCategory
successCriteria: String TEXT nullable
targetDate: LocalDate
status: DevelopmentGoalStatus
progressPercent: Integer
managerComment: String TEXT nullable
employeeComment: String TEXT nullable
updates: List<DevelopmentProgressUpdate>
```

Suggested table:

```text
development_goals
```

### `DevelopmentProgressUpdate`

Fields:

```text
updateId: Long
goal: DevelopmentGoal
progressNote: String TEXT
progressPercent: Integer
updatedBy: Employee
```

Suggested table:

```text
development_progress_updates
```

## 7. DTOs

Use Lombok `@Data` for DTOs. Add validation where useful.

### `IdpCreateRequest`

```text
employeeId: Long required
managerId: Long optional
appraisalId: Long optional
title: String required
summary: String optional
startDate: LocalDate required
endDate: LocalDate required
```

If `managerId` is missing, auto-resolve the active reporting-line manager using `ReportingLineRepository`, the same style as PIP creation.

### `IdpUpdateRequest`

```text
managerId: Long optional
title: String optional
summary: String optional
endDate: LocalDate optional
```

Do not allow direct status updates through this DTO. Use explicit status endpoints.

### `IdpResponse`

```text
idpId: Long
employeeId: Long
employeeName: String
managerId: Long
managerName: String
appraisalId: Long nullable
title: String
summary: String
startDate: LocalDate
endDate: LocalDate
status: IdpStatus
overallProgress: Integer
goalCount: Integer
completedGoalCount: Integer
createdBy: Long
```

### `DevelopmentGoalRequest`

```text
idpId: Long required
title: String required
description: String optional
category: DevelopmentGoalCategory required
successCriteria: String optional
targetDate: LocalDate required
```

### `DevelopmentGoalUpdateRequest`

```text
title: String optional
description: String optional
category: DevelopmentGoalCategory optional
successCriteria: String optional
targetDate: LocalDate optional
status: DevelopmentGoalStatus optional
managerComment: String optional
employeeComment: String optional
```

### `DevelopmentGoalResponse`

```text
goalId: Long
idpId: Long
title: String
description: String
category: DevelopmentGoalCategory
successCriteria: String
targetDate: LocalDate
status: DevelopmentGoalStatus
progressPercent: Integer
managerComment: String
employeeComment: String
```

### `DevelopmentProgressRequest`

```text
goalId: Long required
progressNote: String required
progressPercent: Integer required, 0-100
```

### `DevelopmentProgressResponse`

```text
updateId: Long
goalId: Long
progressNote: String
progressPercent: Integer
updatedBy: Long
updatedByName: String
createdAt: timestamp
```

## 8. Repositories

### `DevelopmentPlanRepository`

```java
List<DevelopmentPlan> findByEmployeeId(Long employeeId);
List<DevelopmentPlan> findByManagerId(Long managerId);
List<DevelopmentPlan> findByEmployeeIdOrManagerId(Long employeeId, Long managerId);
List<DevelopmentPlan> findByStatus(IdpStatus status);
```

### `DevelopmentGoalRepository`

```java
List<DevelopmentGoal> findByPlan_IdpId(Long idpId);
```

### `DevelopmentProgressUpdateRepository`

```java
List<DevelopmentProgressUpdate> findByGoal_GoalIdOrderByCreatedAtDesc(Long goalId);
Optional<DevelopmentProgressUpdate> findFirstByGoal_GoalIdOrderByCreatedAtDesc(Long goalId);
```

## 9. Mappers

Use MapStruct like existing mappers.

### `IdpMapper`

Responsibilities:

- Map `DevelopmentPlan` to `IdpResponse`
- Map employee/manager IDs and names
- Ignore entity relationships during request-to-entity mapping

Required mappings:

```java
@Mapping(source = "employee.id", target = "employeeId")
@Mapping(source = "employee.staffName", target = "employeeName")
@Mapping(source = "manager.id", target = "managerId")
@Mapping(source = "manager.staffName", target = "managerName")
@Mapping(source = "appraisal.appraisalId", target = "appraisalId")
IdpResponse toResponse(DevelopmentPlan entity);
```

`overallProgress`, `goalCount`, and `completedGoalCount` can be set in service enrichment instead of mapper.

### `DevelopmentGoalMapper`

Map:

```text
DevelopmentGoal -> DevelopmentGoalResponse
DevelopmentGoalRequest -> DevelopmentGoal
```

### `DevelopmentProgressMapper`

Map:

```text
DevelopmentProgressUpdate -> DevelopmentProgressResponse
DevelopmentProgressRequest -> DevelopmentProgressUpdate
```

## 10. Service Behavior

### `IdpService`

Methods:

```java
IdpResponse createIdp(IdpCreateRequest request);
IdpResponse updateIdp(Long id, IdpUpdateRequest request);
IdpResponse getById(Long id);
List<IdpResponse> getAll();
List<IdpResponse> getByEmployee(Long employeeId);
List<IdpResponse> getByInvolvedUser(Long userId);
IdpResponse activate(Long id);
IdpResponse complete(Long id);
IdpResponse cancel(Long id);
void delete(Long id);
```

Business rules:

- HR or Manager can create IDP.
- If manager is not supplied, resolve from active reporting line.
- `endDate` cannot be before `startDate`.
- New IDP starts as `DRAFT`.
- Only `DRAFT` IDP can be deleted.
- Only `DRAFT` IDP can be activated.
- Only `ACTIVE` IDP can be completed or cancelled.
- Only HR or the assigned manager can activate, complete, cancel, or delete.
- Employee, assigned manager, HR, and Admin can view.
- `overallProgress` is the average of goal `progressPercent`.
- If no goals exist, `overallProgress = 0`.

### `DevelopmentGoalService`

Methods:

```java
DevelopmentGoalResponse createGoal(DevelopmentGoalRequest request);
DevelopmentGoalResponse updateGoal(Long goalId, DevelopmentGoalUpdateRequest request);
DevelopmentGoalResponse updateStatus(Long goalId, DevelopmentGoalStatus status);
List<DevelopmentGoalResponse> getByPlan(Long idpId);
void deleteGoal(Long goalId);
```

Business rules:

- Goals can be added to `DRAFT` or `ACTIVE` plans.
- Goals cannot be added to `COMPLETED` or `CANCELLED` plans.
- Default status is `NOT_STARTED`.
- Default progress is `0`.
- `targetDate` should fall between plan `startDate` and `endDate`.
- HR/assigned manager can create/update/delete goals.
- Employee can update `employeeComment`.
- Manager can update `managerComment`.

Keep the first implementation simple: allow HR/manager full goal update, employee progress/comment update through progress endpoint.

### `DevelopmentProgressService`

Methods:

```java
DevelopmentProgressResponse addProgress(DevelopmentProgressRequest request);
List<DevelopmentProgressResponse> getByGoal(Long goalId);
```

Business rules:

- Progress can only be added when parent plan is `ACTIVE`.
- Progress percent must be 0-100.
- Employee or assigned manager can add progress.
- On add progress:
  - Save progress update.
  - Set goal `progressPercent` to request value.
  - If percent is 0, status can remain `NOT_STARTED`.
  - If percent is between 1 and 99, status becomes `IN_PROGRESS`.
  - If percent is 100, status becomes `COMPLETED`.
- Do not auto-complete the IDP. Let manager/HR complete explicitly.

## 11. Authorization

Use `@PreAuthorize` on controllers and service-level ownership checks where needed.

Suggested controller-level rules:

```java
@PreAuthorize("hasAnyRole('HR', 'MANAGER')")
POST /api/v1/idp

@PreAuthorize("isAuthenticated()")
GET /api/v1/idp/{id}

@PreAuthorize("hasAnyRole('HR', 'ADMIN')")
GET /api/v1/idp

@PreAuthorize("isAuthenticated()")
GET /api/v1/idp/employee/{employeeId}

@PreAuthorize("isAuthenticated()")
GET /api/v1/idp/involved/{userId}

@PreAuthorize("hasAnyRole('HR', 'MANAGER')")
PUT /api/v1/idp/{id}

@PreAuthorize("hasAnyRole('HR', 'MANAGER')")
PUT /api/v1/idp/{id}/activate

@PreAuthorize("hasAnyRole('HR', 'MANAGER')")
PUT /api/v1/idp/{id}/complete

@PreAuthorize("hasAnyRole('HR', 'MANAGER')")
PUT /api/v1/idp/{id}/cancel

@PreAuthorize("hasRole('HR')")
DELETE /api/v1/idp/{id}
```

Important: `@PreAuthorize` alone is not enough for ownership. The service should still check whether the current user is the assigned manager, the employee, HR, or Admin before returning or changing sensitive records.

Reuse:

```text
AuthService.getCurrentUser()
EmployeeRoleService.getRolesByEmployeeId(...)
ReportingLineRepository
```

## 12. Backend Controllers

### `IdpController`

Base path:

```text
/api/v1/idp
```

Endpoints:

```http
POST   /api/v1/idp
GET    /api/v1/idp
GET    /api/v1/idp/{id}
GET    /api/v1/idp/employee/{employeeId}
GET    /api/v1/idp/involved/{userId}
PUT    /api/v1/idp/{id}
PUT    /api/v1/idp/{id}/activate
PUT    /api/v1/idp/{id}/complete
PUT    /api/v1/idp/{id}/cancel
DELETE /api/v1/idp/{id}
```

Return `ResponseEntity<ApiResponse<T>>`, matching the PIP controller style.

### `DevelopmentGoalController`

Base path:

```text
/api/v1/idp/goals
```

Endpoints:

```http
GET    /api/v1/idp/goals/{idpId}
POST   /api/v1/idp/goals
PUT    /api/v1/idp/goals/{goalId}
PUT    /api/v1/idp/goals/{goalId}/status?status=IN_PROGRESS
DELETE /api/v1/idp/goals/{goalId}
```

### `DevelopmentProgressController`

Base path:

```text
/api/v1/idp/progress
```

Endpoints:

```http
GET  /api/v1/idp/progress/{goalId}
POST /api/v1/idp/progress
```

## 13. Notifications

Optional for first pass, but recommended for final polish.

Update:

```text
epms_backend/src/main/java/ace/org/epms_backend/enums/NotificationType.java
epms_backend/src/main/java/ace/org/epms_backend/enums/ReferenceType.java
```

Add notification types:

```text
IDP_CREATED
IDP_ACTIVATED
IDP_UPDATED
IDP_GOAL_ADDED
IDP_PROGRESS_UPDATED
IDP_COMPLETED
```

Add reference type:

```text
IDP
```

Publish notifications with existing `NotificationEvent`.

Suggested events:

- IDP activated -> notify employee.
- Goal added -> notify employee.
- Employee progress updated -> notify manager.
- Manager progress/review updated -> notify employee.
- IDP completed -> notify employee.

Use action URLs:

```text
/idp/{idpId}
```

## 14. Audit Logging

Use existing `AuditService`.

Log:

- IDP create
- IDP update
- IDP activate
- IDP complete
- IDP cancel
- Goal create/update/delete
- Progress update create

Suggested table names:

```text
development_plans
development_goals
development_progress_updates
```

Use existing `AuditAction.INSERT`, `AuditAction.UPDATE`, `AuditAction.DELETE` where available.

## 15. Database Migration

Create:

```text
epms_backend/src/main/resources/db/migration/V003__create_idp_tables.sql
```

If `V003` already exists by the time this is implemented, use the next available migration number.

Tables:

```sql
CREATE TABLE development_plans (
    idp_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    manager_id BIGINT NOT NULL,
    appraisal_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_by BIGINT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    deleted_at DATETIME NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_idp_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_idp_manager FOREIGN KEY (manager_id) REFERENCES employees(id),
    CONSTRAINT fk_idp_appraisal FOREIGN KEY (appraisal_id) REFERENCES appraisals(appraisal_id)
);

CREATE TABLE development_goals (
    goal_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    idp_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL,
    success_criteria TEXT NULL,
    target_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    progress_percent INT DEFAULT 0,
    manager_comment TEXT NULL,
    employee_comment TEXT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    deleted_at DATETIME NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_goal_idp FOREIGN KEY (idp_id) REFERENCES development_plans(idp_id)
);

CREATE TABLE development_progress_updates (
    update_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    goal_id BIGINT NOT NULL,
    progress_note TEXT NOT NULL,
    progress_percent INT NOT NULL,
    updated_by BIGINT NOT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    deleted_at DATETIME NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_progress_goal FOREIGN KEY (goal_id) REFERENCES development_goals(goal_id),
    CONSTRAINT fk_progress_updated_by FOREIGN KEY (updated_by) REFERENCES employees(id)
);
```

Before finalizing migration, verify actual table/column names for `employees` and `appraisals` in existing entities. Adjust foreign key references if the real primary key names differ.

## 16. Frontend File Plan

Create:

```text
epms_frontend/src/features/idp/idpTypes.ts
epms_frontend/src/services/idpApi.ts
epms_frontend/src/routes/idpRoutes.tsx

epms_frontend/src/pages/idp/IdpListPage.tsx
epms_frontend/src/pages/idp/IdpCreatePage.tsx
epms_frontend/src/pages/idp/IdpDetailsPage.tsx

epms_frontend/src/components/idp/IdpStatusBadge.tsx
epms_frontend/src/components/idp/GoalStatusBadge.tsx
epms_frontend/src/components/idp/GoalModal.tsx
epms_frontend/src/components/idp/ProgressUpdateModal.tsx
epms_frontend/src/components/idp/GoalProgressList.tsx
```

Update:

```text
epms_frontend/src/services/api.ts
epms_frontend/src/routes/index.tsx
epms_frontend/src/components/Sidebar.tsx
```

## 17. Frontend Types

Create `epms_frontend/src/features/idp/idpTypes.ts`.

Use constants and union types like PIP:

```ts
export const IdpStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type IdpStatus = (typeof IdpStatus)[keyof typeof IdpStatus];

export const DevelopmentGoalStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
export type DevelopmentGoalStatus = (typeof DevelopmentGoalStatus)[keyof typeof DevelopmentGoalStatus];

export const DevelopmentGoalCategory = {
  TECHNICAL_SKILL: "TECHNICAL_SKILL",
  SOFT_SKILL: "SOFT_SKILL",
  LEADERSHIP: "LEADERSHIP",
  COMMUNICATION: "COMMUNICATION",
  PRODUCTIVITY: "PRODUCTIVITY",
  CAREER_GROWTH: "CAREER_GROWTH",
  OTHER: "OTHER",
} as const;
export type DevelopmentGoalCategory = (typeof DevelopmentGoalCategory)[keyof typeof DevelopmentGoalCategory];
```

Add interfaces matching backend DTOs.

## 18. RTK Query API

Create `epms_frontend/src/services/idpApi.ts`.

Inject endpoints into existing `api`.

Update `epms_frontend/src/services/api.ts` tagTypes:

```ts
"IDP",
"IdpGoal",
"IdpProgress",
```

Endpoints:

```text
getIdps
getIdpById
getIdpsByEmployee
getIdpsByInvolvedUser
createIdp
updateIdp
activateIdp
completeIdp
cancelIdp
deleteIdp

getGoalsByIdp
createGoal
updateGoal
updateGoalStatus
deleteGoal

getProgressByGoal
addProgress
```

Use cache invalidation like `pipApi.ts`.

## 19. Frontend Routes

Create `epms_frontend/src/routes/idpRoutes.tsx`.

```tsx
import IdpListPage from "../pages/idp/IdpListPage";
import IdpCreatePage from "../pages/idp/IdpCreatePage";
import IdpDetailsPage from "../pages/idp/IdpDetailsPage";

export const idpRoutes = [
  { path: "/idp", element: <IdpListPage /> },
  { path: "/idp/new", element: <IdpCreatePage /> },
  { path: "/idp/:id", element: <IdpDetailsPage /> },
];
```

Update route exports:

```ts
export * from "./idpRoutes";
```

Then verify route composition in `App.tsx` includes exported route arrays in the same pattern as existing route modules.

## 20. Sidebar

Update `epms_frontend/src/components/Sidebar.tsx`.

Add a nav item:

```text
Development Plans
```

Recommended icon:

```ts
GraduationCap
```

Add import from lucide-react.

Show item when:

```text
employee can view own IDP
manager can view assigned IDP
HR/Admin can view all IDP
```

For first implementation, it is acceptable to show to all authenticated users if the page itself renders role-aware data.

## 21. Frontend Page Behavior

### `IdpListPage`

Purpose: role-aware IDP overview.

Data loading:

- HR/Admin: `getIdps`
- Manager/Employee: `getIdpsByInvolvedUser(user.id)`

Display:

- Title
- Employee name
- Manager name
- Status badge
- Start/end date
- Overall progress bar
- Goal count/completed goal count
- Open details button

Filters:

- All
- Draft
- Active
- Completed
- Cancelled

Create button:

- Visible for HR/Manager.
- Goes to `/idp/new`.

### `IdpCreatePage`

Fields:

- Employee selector
- Manager selector optional
- Title
- Summary
- Start date
- End date
- Optional appraisal ID only if easy; otherwise skip in first version

Behavior:

- If manager is not selected, backend auto-resolves.
- On success, navigate to `/idp/{idpId}`.

Use existing employee API for employee options.

### `IdpDetailsPage`

Sections:

- Header with title, status, progress
- Plan metadata
- Status action buttons
- Development goals
- Progress history

Actions:

- HR/manager can activate draft plan.
- HR/manager can complete/cancel active plan.
- HR/manager can add/edit goals.
- Employee/manager can add progress updates when plan is active.

Avoid adding too many form-heavy areas. Use modals like PIP.

## 22. UI Component Notes

Use existing visual style:

- Small badges
- 8px border radius
- Neutral cards/panels
- Progress bars
- Lucide icons
- Compact table/list rows

Suggested badges:

```text
DRAFT -> gray
ACTIVE -> blue/green
COMPLETED -> green
CANCELLED -> red/gray
```

Goal status:

```text
NOT_STARTED -> gray
IN_PROGRESS -> blue
COMPLETED -> green
```

## 23. Validation Rules

Backend must validate:

- Required IDs exist.
- End date is not before start date.
- Goal target date is within plan start/end date.
- Progress percent is 0-100.
- Cannot edit completed/cancelled plans except read-only.
- Cannot add progress to draft/completed/cancelled plans.

Frontend should also validate the same basics for better UX.

## 24. Suggested Minimal First Version

If time is limited, implement only this:

Backend:

- IDP plan CRUD/status endpoints
- Goal CRUD
- Progress add/list
- Basic role/ownership checks

Frontend:

- List page
- Create page
- Detail page
- Add goal modal
- Add progress modal

Skip initially:

- PDF export
- Training catalog
- Attachments
- Deep appraisal integration
- Advanced analytics
- Scheduled reminders

## 25. Testing Checklist

Manual tests:

1. HR creates IDP for employee without selecting manager.
2. Backend resolves manager from reporting line.
3. HR creates IDP with explicit manager.
4. Manager can see assigned IDP.
5. Employee can see own IDP.
6. Unrelated employee cannot see another employee's IDP.
7. Draft IDP can be activated.
8. Goal can be added to draft/active IDP.
9. Progress can be added only to active IDP.
10. Progress update changes goal progress.
11. Progress 100 marks goal completed.
12. Overall plan progress updates after goal progress changes.
13. Completed IDP cannot be edited.
14. Cancelled IDP cannot receive progress.
15. Delete works only for draft IDP.

Backend unit tests recommended:

- Overall progress calculation
- Progress-to-status transition
- Date validation
- Authorization/ownership checks for sensitive service methods

## 26. Code Agent Prompt

Use this prompt for the code agent:

```text
Implement a standalone Individual Development Plan (IDP) module for the EPMS project following IDP_IMPLEMENTATION_PLAN.md.

Follow the existing PIP module patterns for backend entities, DTOs, repositories, mappers, services, controllers, frontend RTK Query APIs, routes, pages, and components.

Keep changes isolated. Do not modify appraisal scoring, KPI scoring, PIP behavior, or 360 feedback behavior. Reuse existing Employee, ReportingLineRepository, AuthService, EmployeeRoleService, ApiResponse, AuditService, NotificationEvent, Redux API service, route structure, and sidebar style.

Implement DevelopmentPlan, DevelopmentGoal, and DevelopmentProgressUpdate with REST endpoints under /api/v1/idp. Add frontend pages at /idp, /idp/new, and /idp/:id. Add route export, sidebar navigation, RTK Query endpoints, status badges, goal modal, and progress update modal.

Use role-aware and ownership-aware access: HR/Admin can see all, assigned manager can manage assigned plans, employee can view and update progress on own active plans.
```

