# EPMS — Employee Performance Management System
## Full-Stack Project Analysis

**Repository:** `EmployeePerformanceManagementSystem-EPMS-`
**Scanned:** May 2026
**Scope:** `epms_backend/` (Java/Spring Boot) + `epms_frontend/` (React/TypeScript/Vite)

---

## 1. Executive Summary

EPMS is a substantial, feature-rich Employee Performance Management platform spanning **532 Java files** in the backend and **159 TypeScript/TSX files** across **62 page components** in the frontend. It implements an end-to-end performance lifecycle — onboarding employees, structuring the org (departments, teams, job levels, positions, roles, permissions), running cyclical appraisals with self-assessment + manager evaluation, continuous feedback, 1-on-1 meetings, KPI goal-setting and scoring, 360° feedback, Performance Improvement Plans (PIPs), notifications, audit logging, and exportable reports (PDF/Excel via JasperReports and Apache POI).

The architecture is conventional and clean — a layered Spring Boot REST API with JPA/Hibernate against MySQL, JWT auth with role + level + permission-based authorization, plus a Redux-Toolkit-Query React 19 SPA. The codebase is well-organized by domain (appraisal, kpi, pip, feedback360, continuous, employee/org). The biggest risks are operational (secrets committed in `application.properties`, `ddl-auto=update` in source control, weak JWT secret discoverable in two places, single login attempt counter shared across IPs) rather than architectural.

---

## 2. Technology Stack

### Backend
| Layer | Choice |
|---|---|
| Runtime | Java 17 |
| Framework | Spring Boot **4.0.5** *(see flag in §7)* |
| Persistence | Spring Data JPA + Hibernate, MySQL 8 |
| Security | Spring Security + `jjwt 0.12.6` (HMAC-SHA, BCrypt) |
| API Docs | springdoc-openapi 2.8.3 (Swagger UI) |
| Messaging | Spring WebSocket + STOMP + SockJS (for live notifications) |
| Mail | Spring Boot Mail (Mailtrap sandbox configured) |
| Reporting | JasperReports 7.0.4 (PDF) + Apache POI 5.4.1 (Excel) |
| DTO mapping | MapStruct 1.5.5 |
| Boilerplate | Lombok 1.18.36 |
| Async/Scheduling | `@EnableAsync`, `@EnableScheduling` (notification cleanup, cycle reminders) |

### Frontend
| Layer | Choice |
|---|---|
| Bundler | Vite 8 |
| UI | React 19 + Tailwind v4 (via `@tailwindcss/vite`) |
| State | Redux Toolkit 2 + RTK Query |
| Routing | react-router-dom 7 (modular route files per domain) |
| Real-time | `@stomp/stompjs` + `sockjs-client` |
| Charts | Recharts 3 |
| Notifications | react-toastify 11 |
| Dates | date-fns 4 |
| Icons | lucide-react |

---

## 3. Backend Architecture

### 3.1 Package layout (ace.org.epms_backend)
```
config/            CORS, JWT filter, Security, WebSocket, OpenAPI, Jackson, EmailTemplate
controller/        46 REST controllers (top-level + appraisal/, feedback360/, report/ subpkgs)
service/           38+ service interfaces; impl/ for implementations (some sub-packages for kpi, appraisal, feedback360, report)
repository/        50 Spring Data JPA repositories
model/             ~60 JPA entities, organised by domain (appraisal/, kpi/, pip/, feedback360/, continuous/, employee/, auth/)
dto/               Request/response DTOs by domain
mapper/            MapStruct mappers
enums/             24 enums (statuses, role types, notification types, etc.)
exception/         23 custom exceptions + GlobalExceptionHandlerAdvice + JwtAuthenticationEntryPoint
events/            ApplicationEvent listeners (NotificationListener)
util/              Excel helpers + misc
```
A `BaseEntity` provides auditing fields (`createdAt`, `updatedAt`, soft-delete `isDeleted`/`deletedAt`), and Hibernate's `@SQLDelete`/`@SQLRestriction` is used in domains like continuous feedback to implement soft delete cleanly.

### 3.2 Authentication & authorization
- **JWT** via custom `JwtAuthFilter` (extends `OncePerRequestFilter`) — extracts `Authorization: Bearer …`, validates signature & expiry, additionally checks a blacklist (`TokenBlacklistService`) on each request.
- **Access token** lifetime: 30 minutes. **Refresh token** lifetime: 7 days. Refresh endpoint re-issues only the access token (refresh stays the same — see §7 finding).
- **Logout invalidation**: tokens issued before `lastLogoutTime` are rejected (good cross-device kill switch).
- **Brute-force lock**: 3 failed attempts ⇒ account locked for 15 min.
- Stateless sessions, CSRF disabled (consistent for JWT), CORS limited to `http://localhost:5173`/`127.0.0.1:5173`.
- **Authorization model**: Role-based (`ROLE_ADMIN/HR/MANAGER/EMPLOYEE`) **plus** permission strings (loaded via `RoleLevelPermission`), **plus** job-level (`level`) gates. This is essentially RBAC + ABAC, and `@PreAuthorize` is used 87 times across controllers and `@EnableMethodSecurity` is on.

### 3.3 REST surface (selected base paths)
```
/api/v1/auth                       login, refresh, me, logout, forgot/reset password, validate, unlock, revoke-sessions
/api/v1/emp                        employee CRUD, set-password (public)
/api/v1/employees, /api/v1/hr
/api/v1/departments | teams | positions | job-levels | roles | permissions
/api/v1/employee-departments       department assignment history
/api/v1/appraisal-cycles, /api/v1/appraisals, /api/v1/appraisal-forms, /api/v1/appraisal-form-sets, /api/v1/appraisal-summaries
/api/v1/financial-years, /api/v1/performance-categories, /api/v1/categories, /api/v1/questions
/api/v1/self-assessments, /api/v1/manager-evaluations, /api/v1/scores
/api/v1/feedback (continuous), /api/v1/tags
/api/v1/360-feedback/{requests|feedbacks|summary}, /api/v1/feedback-selection, /api/v1/feedback/config
/api/v1/pip, /api/v1/pip/objectives, /api/v1/pip/progress, /api/v1/pip/reviews
/api/v1/kpi, /api/v1/kpi/categories, /api/v1/kpi-history
/api/v1/dashboard, /api/v1/notifications, /api/v1/reports
/api/v1/diagnostics, /api/v1/public-diagnostics            <-- requires auth (despite naming)
/api/v1/histories, /api/v1/performance-history
/ws                                STOMP WebSocket endpoint (SockJS), JWT-validated on CONNECT
/uploads/**                        static file serving (profile images, e-signatures)
```

### 3.4 WebSocket / notifications
`WebSocketConfig` registers `/ws` with SockJS, enables an in-memory broker for `/queue` + `/topic`, and uses `setUserDestinationPrefix("/user")` for per-user notifications. A `ChannelInterceptor` reads the `Authorization` header on STOMP CONNECT and populates the principal. `NotificationListener` (an `ApplicationListener` of `NotificationEvent`) fans events out to a single recipient, a role, or "all employees". Notifications are also persisted (the `Notification` entity), with `NotificationCleanupScheduler` doing soft-delete cleanup.

---

## 4. Domain Model — What the App Does

The data model paints a complete performance-cycle product. Key aggregates:

**Org & identity**
`Employee` (with NRC fields, marital status, contact info, salary, profile image, lockout state) → many-to-many `Role` via `EmployeeRole`; `Permission` mapped per `Role × JobLevel` via `RoleLevelPermission`; `Department`, `Team`, `Position`, `JobLevel`, `EmployeeDepartment` (history), `ReportingLine`, `EmployeeTeam`.

**Appraisal cycle**
`FinancialYear` → `AppraisalCycle` (with self-assessment / manager / finalization deadlines, status enum `DRAFT…ACTIVE…CLOSED`) → `AppraisalForm` (built from `FormCategory` + `Question`) grouped into `AppraisalFormSet`. Each employee gets one `Appraisal` per cycle, status flowing `PENDING → SELF_ASSESSED → EVALUATED → HR_APPROVED → FINALIZED → ARCHIVED`. `SelfAssessment` + `SelfAssessmentAnswer` and `ManagerEvaluation` + `ManagerEvaluationAnswer` hang off the appraisal. `AppraisalSummary` and `AppraisalHistory` capture finalized results; `UnlockRequest` lets HR reopen a locked appraisal. Both employee and manager have e-signature columns and signed-at timestamps.

**Scoring**
`ScoringWeight` parameterizes weights across categories; `AppraisalCalculationService` computes a `ScoreBreakdownResponse`. `PerformanceCategory` + `PerformanceGrade` enum implement banded grades.

**KPI**
`KpiLibrary`+`KpiLibraryDetails` (a per-position catalog), `KpiCategory`, `KpiGoals` (versioned with `isCurrent`) → `KpiGoalItem` (target, weight%, actual, score%, weighted score, status), `KpiProgress` (logged updates), `KpiFinalScore`, `KpiHistoryLog`.

**360° feedback**
`FeedbackRequest` (target × evaluator × cycle × relationship — unique constraint), `Feedback` + `FeedbackResponse`, `FeedbackSummary`, `DepartmentFeedbackConfig`. `isAnonymous=true` by default.

**Continuous feedback & 1-on-1**
`ContinuousFeedback` (soft-deleted), `FeedbackReply`, `FeedbackTag`, `OneOnOneMeeting` + `MeetingComment`, `PerformanceHistory`.

**PIP**
`PipRecord` (with severity, status flow `DRAFT…ACTIVE…COMPLETED/CLOSED`, scheduled review dates as `@ElementCollection`, manager/employee private notes, final outcome), `PipObjective`, `PipReview`, `PipProgressLog`, `PipProgress`.

**Cross-cutting**
`Notification`, `AuditLog` (with `AuditAction`/`AuditStatus` enums), `BlacklistedToken`, `PasswordResetToken`/`ResetToken`.

The schema clearly distinguishes templates (form sets, KPI library, scoring weights) from per-cycle instances (appraisals, KPI goals), which is the right shape for this domain.

---

## 5. Frontend Architecture

### 5.1 Layout
```
src/
  app/store.ts                Redux store; auth + notification slices + RTK Query api reducer
  services/                   RTK Query api + baseQuery (with reauth/refresh interceptor)
  features/<domain>/          API slices + types + (slice) per domain — auth, employee, org, appraisal,
                              continuous, dashboard, kpi, pip, notification, report
  pages/                      62 route components, organised admin/, appraisal/, continuous/, kpi/, pip/
  routes/                     Modular route arrays: public, general, admin, appraisal, kpi, pip, continuous
  components/                 Shared layout (Header, Sidebar, MainLayout, NotificationBell)
                              + ProtectedRoute, + domain widgets (appraisal/, kpi/, pip/, dashboard/)
  context/                    ActiveCycleProvider (currently-active appraisal cycle in context)
  hooks/                      reduxHooks, useAuth, useWebSocket, …
  types/, utils/, assets/
```

### 5.2 Auth flow
- `authSlice` persists access/refresh tokens to `localStorage` and re-hydrates on load.
- `baseQueryWithReauth` retries any 401 by hitting `/auth/refresh-token`; on success, replays the original request; on failure, dispatches `logout` and clears storage.
- A `storage` event listener in `App.tsx` syncs logout across tabs.
- `ProtectedRoute` enforces `isAuthenticated`, optional `allowedRoles`, `minLevel`/`maxLevel`, and `requiredPermissions` — same shape as backend RBAC+ABAC.
- A loading state (`Restoring Session…`) renders while `/auth/me` is in flight.

### 5.3 Routing
Routes are split into seven modular arrays and composed inside `App.tsx`. HR/Admin areas (`/employees`, `/departments`, `/roles`, `/permissions`, `/analytics`, etc.) and KPI library management are wrapped by `<ProtectedRoute allowedRoles={["ADMIN","HR"]}>`. Manager-only flows like KPI assignment and team KPI dashboard use `["MANAGER","ADMIN","HR"]`. There's also a special manager route gated by `maxLevel={4}` + `requiredPermissions={["APPROVAL_CREATE"]}` showing the ABAC plumbing is exercised.

### 5.4 Real-time
`useWebSocket.ts` (hard-coded `http://localhost:8080/ws`) opens a STOMP/SockJS connection on login and subscribes to user-specific and role-broadcast topics for the `NotificationBell`.

---

## 6. Feature Inventory

- **Auth & account safety**: login, forgot/reset password with email link, set-password for new hires, JWT refresh, logout (token blacklisted server-side and `lastLogoutTime` set), HR/Admin unlock, Admin "revoke all sessions" for a user.
- **Org admin**: CRUD for employees, departments, teams, positions, job levels, roles, permissions; permission matrix view; role × level × permission assignment; employee-department history.
- **Dashboards**: separate Employee, Manager, HR, Admin dashboards plus an `AnalyticsDashboard` (charts via Recharts).
- **Appraisal lifecycle**: financial year & cycle creation, performance categories, form designer (categories + questions + weights), bulk + single assignment, self-assessment, manager evaluation, final result page with e-signatures, unlock requests, lock/finalize, archive.
- **KPI**: position-keyed library, KPI category management, per-employee goal sets (versioned), assignment workspace, my-KPI dashboard, team KPI dashboard, history per employee, final score calculation.
- **Continuous feedback**: typed feedback (praise/coaching/etc.) with tags, replies, private vs visible; 1-on-1 meetings with comments; long-running performance history.
- **360° feedback**: anonymous-by-default per-cycle requests by relationship (peer/manager/report/cross), department-level feedback configuration, summary aggregation.
- **PIP**: full lifecycle — draft → active → in-progress (with scheduled reviews) → completed/closed, severity tiers, objectives & progress logs, reviews, private notes per side.
- **Reports**: JasperReports PDF + Apache POI Excel exports (audit trail, appraisal status, etc.).
- **Notifications**: persisted + WebSocket-pushed; per-user, per-role, and broadcast; scheduled cleanup of old ones.
- **Audit log**: separate `AuditService` writes structured records (action + status + actor) — used in auth flows at minimum.

---

## 7. Findings — Quality, Security, Risk

### High-priority security
1. **Secrets committed to source.** `src/main/resources/application.properties` contains DB credentials (`root` / `Root`), JWT secret, and Mailtrap SMTP credentials. The repo's `.gitignore` lists only `.idea`, `.ai`, `.vscode`, `.agent`, `.claude` — there is no `.env`, no `application-*.properties` exclusion, no `target/`. Rotate the JWT secret, move credentials to environment variables (Spring already supports `${jwt.secret}` placeholder), and add `application-local.properties` to `.gitignore`.
2. **JWT secret duplicated as a hardcoded default.** `JwtService` falls back to the same literal secret value in `@Value("${jwt.secret:GmP9kLz0aQ7w…}")`. Even with env-overriding fixed, anyone reading the source recovers the key. Remove the default and let the app fail to start without the env var.
3. **`PublicDiagnosticController`/`DiagnosticController` leak account data.** The "public" controller is path-mounted at `/api/v1/public-diagnostics` but is not in the `permitAll` list, so it does require auth — but it exposes email, employee id, staff name, and authorities to any authenticated user, which is more access than the diagnostic name implies. Delete these endpoints before production or restrict to `ADMIN`.
4. **Brute-force lock is global per account.** Failed login counter is on the `Employee` row itself, not per-IP. An attacker can lock out any known email permanently (every 15 min). Consider per-IP throttling (bucket4j, or Spring's `HttpFirewall`-friendly approach) in addition to the account-level counter.
5. **CORS open to any origin pattern.** `corsConfigurationSource` calls `setAllowedOriginPatterns(List.of("*"))` **and** `setAllowCredentials(true)`. The `setAllowedOrigins(...)` list intends to restrict to `localhost:5173`, but the `*` pattern combined with credentials is permissive by today's standards and bypasses the strict origin list. Drop the wildcard pattern.
6. **CSRF disabled + cookies via `credentials: include`.** The frontend sets `credentials: "include"` in `fetchBaseQuery` but uses bearer tokens, not cookies, for auth. Either the credentials flag is unnecessary or, if cookies are added later, CSRF protection must come back. Pick one and remove the other path.
7. **JWT secret is short.** The string is 50 base64url-ish chars (~30 bytes after decoding), which is below the recommended 256-bit (32-byte) minimum for HS256. Generate a fresh 32-byte random secret.
8. **Refresh-token reuse.** `refreshToken` returns the same refresh token alongside a new access token. There's no rotation, no replay detection. Implement rotation (one-time refresh tokens stored server-side) for stronger session hygiene.
9. **`ddl-auto=update` in production config.** Convenient in dev, dangerous in prod — silently mutates schema and ships migrations you didn't review. Switch to Flyway/Liquibase, or at least to `validate` for prod profiles.
10. **`spring.jpa.show-sql=true`** logs every statement; remove for prod.

### Medium-priority code quality
11. **19 controllers have no `@PreAuthorize`.** Listed: `AppraisalHistory, ContinuousFeedback, Department, Diagnostic, Employee, EmployeeDepartment, EmployeeRole, FeedbackTag, FormCategory, JobLevel, KpiHistory, Notification, OneOnOneMeeting, PerformanceHistory, Position, PublicDiagnostic, Question, Role, Team`. Authentication is enforced at filter level (anything not in the permit list requires a valid JWT), but **authorization is not** — any logged-in employee can hit them. Audit each one and add role/permission gates where appropriate (e.g., `/api/v1/roles` should be ADMIN-only).
12. **Debug `System.out.println` left in.** 16 occurrences across `NotificationListener`, `AppraisalCycleServiceImpl`, `KpiGoalServiceImpl`, `NotificationCleanupScheduler`. Use SLF4J `log.debug(...)` so they can be filtered out in production.
13. **`printStackTrace()` swallows context.** `NotificationListener.java:50` — replace with `log.error("…", e)` so exceptions reach your log aggregator with structure.
14. **`@Data` on JPA entities** (10 files). Lombok's `@Data` generates `equals/hashCode/toString` over **all** fields, including lazy associations — this triggers proxy initialization and N+1s during logging or `Set` membership, and breaks equality across detached/managed states. The entities that use `@Getter @Setter @EqualsAndHashCode(callSuper=true)` (like `Employee`, `Appraisal`) are doing it correctly; align the rest.
15. **Frontend `: any` is heavy.** 150 occurrences across 159 source files. RTK Query benefits hugely from precise types — sweep through the API slices and replace `any` payloads with the DTO interfaces already defined in `*Types.ts`.
16. **Hardcoded `http://localhost:8080`** in seven frontend files (`baseQuery.ts`, `useWebSocket.ts`, `EmployeeList.tsx`, `ResultPage.tsx`, `EditProfilePage.tsx`, `ProfilePage.tsx`). Move to `import.meta.env.VITE_API_BASE_URL` and ship `.env.example`. Otherwise prod deploys won't work.
17. **Profile/signature image URLs string-concatenate the base URL.** Build a small helper (`assetUrl(path)`) so the env-var migration above is a one-line change and the templates don't have to know about hosts.
18. **Spring Boot parent declared as `4.0.5`.** As of May 2025 the GA line is 3.x — `4.0.5` does not exist as a released artifact. This likely means the project won't resolve dependencies on a clean machine. Either the version is a typo for `3.4.5`/`3.5.x` or this depends on a private repo. Verify on a fresh `mvn -U clean install`.
19. **Lone test file.** `src/test/java/.../EpmsBackendApplicationTests.java` is the only test in the entire backend. For a system that calculates appraisal scores, KPI weighted scores, and PIP severity, this is a meaningful gap — at minimum, unit-test `AppraisalCalculationService` and the KPI scoring math.
20. **Service god-classes.** `KpiGoalServiceImpl` (826 lines), `ReportServiceImpl` (672), `FeedbackRequestServiceImpl` (630), `EmployeeServiceImpl` (532), `AppraisalServiceImpl` (520). Look for natural seams (e.g. split report rendering vs. report data assembly) before they ossify further.
21. **`.gitignore` is missing the basics.** No `target/`, `node_modules/`, `*.env`, `*.log`, `uploads/` — meaning anyone running the app will produce dirty `git status` and may accidentally commit binaries or uploaded PII. The `uploads/profiles` and `uploads/signatures` directories already exist in the working tree.
22. **`ResetToken` and `PasswordResetToken`** appear to be duplicate models for the same concept (with `PassowrdResetTokenRepository` — note the typo). Consolidate to one.

### Lower-priority polish
23. **Typos in identifiers** propagate: `PassowrdResetTokenRepository`, `tailwincss` in `vite.config.ts`. Worth fixing while it's still cheap.
24. **`ActiveCycleProvider`** wraps the entire authenticated app — fine, but make sure it doesn't refetch the active cycle on every navigation.
25. **`ToastContainer`** is rendered inside `BrowserRouter` but outside `Routes` — that's correct; just noting it's in the right place.
26. **`Lombok` annotation processor pinned to 1.18.36** in pom (current GA path is 1.18.34/1.18.36) — fine, just make sure Java 21+ doesn't surprise you later.
27. **Frontend depends on `typescript ~6.0.2`** which doesn't match any released TypeScript version as of May 2025 (latest is 5.5/5.6). Same concern as the Spring Boot 4.0.5 line — verify the dependency graph builds cleanly.

---

## 8. Recommendations (in priority order)

1. **Rotate the JWT secret, DB password, and Mailtrap credentials right now**, then move them out of the repo (`application-local.properties` + `.gitignore`, or env vars).
2. **Fix `.gitignore`** to cover `target/`, `node_modules/`, `*.env*`, `uploads/`, `logs/`.
3. **Audit controllers without `@PreAuthorize`** and either add gates or document why they're open. Special attention to `/api/v1/roles`, `/api/v1/permissions`, employee-management endpoints.
4. **Delete the diagnostic controllers** or restrict to ADMIN.
5. **Tighten CORS** — drop the `*` pattern, keep only the explicit origins.
6. **Implement refresh-token rotation** + per-IP login throttling.
7. **Move to Flyway** (or set `ddl-auto=validate` in prod), turn off SQL echo in prod.
8. **Sweep `System.out.println` → SLF4J** and `printStackTrace` → `log.error`.
9. **Set up `.env`** in the frontend and remove the seven `localhost:8080` literals.
10. **Add unit tests** for the scoring services (appraisal + KPI) — the math is the business.
11. **Verify the Spring Boot `4.0.5` and TypeScript `~6.0.2` versions** actually resolve; correct if typos.
12. **Refactor the 500–800-line services** into smaller, single-purpose components.
13. **Replace `@Data` on JPA entities** with `@Getter @Setter` + explicit `@EqualsAndHashCode(onlyExplicitlyIncluded = true)` keyed on the ID.
14. **Tighten frontend types** — replace `any` with the existing domain types.

---

## 9. What's Done Well

- Clean domain-per-package layering in both halves of the codebase.
- A serious authorization model — RBAC + per-level + per-permission, exercised by both backend (`@PreAuthorize`, method security) and frontend (`ProtectedRoute` with `allowedRoles` / `minLevel` / `maxLevel` / `requiredPermissions`).
- Proper soft delete via Hibernate's `@SQLDelete` + `@SQLRestriction` (not ad-hoc).
- Account lockout, JWT blacklist, and `lastLogoutTime` token-invalidation are all implemented — beyond what most CRUD apps ship.
- Centralized `GlobalExceptionHandlerAdvice` with 23 typed exceptions — error semantics are not an afterthought.
- The frontend uses a single, well-configured RTK Query instance with tag-based invalidation across ~25 entity types — exactly the right shape for a domain this wide.
- Anonymous-by-default 360° feedback with a uniqueness constraint preventing duplicate evaluators per target/cycle/relationship is a thoughtful piece of schema design.
- Modular `routes/*.tsx` files make the App routing tree readable instead of a 200-line `<Routes>`.

---

*This report was generated from a static read of the repository; runtime behaviour, DB state, and CI configuration were not exercised.*
