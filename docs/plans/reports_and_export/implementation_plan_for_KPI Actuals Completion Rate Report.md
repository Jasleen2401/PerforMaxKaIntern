# KPI Actuals Completion Rate Report — Implementation Plan

## Overview

Build a new **KPI Actuals Completion Rate Report** from scratch. It identifies which employees haven't updated their KPI `actualValue` fields in 30+ days within an active cycle, groups them by department, and shows an overdue item count per employee. Accessible by **Manager** (own team only) and **HR/Admin** (org-wide). Exportable as **PDF** or **Excel (.xlsx)**.

This follows the exact same full-stack pattern already established by the existing KPI reports (e.g., `KpiSummaryReport`):
> DTO → `ReportService` interface → `ReportServiceImpl` → `ReportController` → `KpiActualsReportModal.tsx` → `KpiActualsReportButton.tsx` → mounted in `GoalManagement.tsx` and `TeamKpiDashboard.tsx`.

---

## How "Overdue" is Determined

`KpiGoalItem` extends `BaseEntity`, which provides `updatedAt` (auto-stamped on every `@PreUpdate`). When a user submits a progress update, the item's `updatedAt` is refreshed.

| Condition | Classification |
|---|---|
| `actualValue` is `null` | Never updated — always overdue |
| `actualValue` is not null, `updatedAt` ≥ 30 days ago | Stale actual — overdue |
| `actualValue` is not null, `updatedAt` < 30 days ago | Up to date |

An employee is **overdue** if they have **at least one** overdue item. `daysSinceLastUpdate` = days since the most recently updated item across the entire goal set.

Only goal sets with status `APPROVED`, `LOCKED`, or `SCORED` are included (DRAFT goals haven't started tracking actuals yet).

---

## Proposed Changes

---

### Backend — DTOs

#### [NEW] `KpiActualsEmployeeRowDTO.java`
Path: `…/dto/report/KpiActualsEmployeeRowDTO.java`

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class KpiActualsEmployeeRowDTO {
    private Long   employeeId;
    private String employeeName;
    private String departmentName;
    private String positionName;
    private int    totalKpiItems;      // total active items in goal set
    private int    overdueItemCount;   // items where actualValue is null OR updatedAt >= 30 days
    private String lastUpdatedAt;      // ISO string of most recent item updatedAt
    private long   daysSinceLastUpdate; // computed from most recent item updatedAt
    private boolean isOverdue;         // daysSinceLastUpdate >= thresholdDays OR any item null
}
```

#### [NEW] `KpiActualsCompletionReportDTO.java`
Path: `…/dto/report/KpiActualsCompletionReportDTO.java`

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class KpiActualsCompletionReportDTO {
    private String generatedAt;
    private Long   cycleId;
    private String cycleName;
    private int    thresholdDays;            // default 30
    private int    totalEmployees;
    private int    overdueEmployeeCount;
    private int    upToDateEmployeeCount;
    private double overdueRate;              // (overdueCount / total) * 100
    private List<KpiActualsEmployeeRowDTO> employeeRows;
}
```

---

### Backend — Repository

#### [MODIFY] `KpiGoalsRepository.java`

Add one new query to fetch approved/locked/scored goal sets for a cycle, with optional manager-scoping:

```java
@Query("SELECT k FROM KpiGoals k " +
       "WHERE k.cycle.cycleId = :cycleId " +
       "AND k.isCurrent = true " +
       "AND k.status IN ('APPROVED','LOCKED','SCORED') " +
       "AND (:managerId IS NULL OR k.manager.id = :managerId OR k.employee.id IN " +
       "  (SELECT rl.employee.id FROM ReportingLine rl " +
       "   WHERE rl.manager.id = :managerId AND rl.isActive = true))")
List<KpiGoals> findApprovedGoalsForActualsReport(
    @Param("cycleId") Long cycleId,
    @Param("managerId") Long managerId);
```

When `managerId` is `null` (HR/Admin call), the `OR` clause is skipped and all goals in the cycle are returned.

---

### Backend — Service Interface

#### [MODIFY] `ReportService.java`

Add two method signatures in the `// KPI Achievement` section:

```java
// KPI Actuals Completion
KpiActualsCompletionReportDTO getKpiActualsCompletionReport(
    Long cycleId, Long managerId, Long departmentId, int thresholdDays);

byte[] exportKpiActualsCompletionReport(
    Long cycleId, Long managerId, Long departmentId, int thresholdDays, String format);
```

---

### Backend — Service Implementation

#### [MODIFY] `ReportServiceImpl.java`

Implement the two new methods:

**`getKpiActualsCompletionReport(...)` logic:**
1. Call `kpiGoalsRepository.findApprovedGoalsForActualsReport(cycleId, managerId)` to get goal sets.
2. Optionally filter by `departmentId` (same pattern used in `getKpiAchievementReport`).
3. For each `KpiGoals`:
   - Get employee info + department via `employeeDepartmentRepository`.
   - Collect all active `KpiGoalItem`s (where `isActive = true`).
   - Compute `overdueItemCount`: items where `actualValue == null` OR `ChronoUnit.DAYS.between(item.getUpdatedAt(), Instant.now()) >= thresholdDays`.
   - Compute `lastUpdatedAt`: `items.stream().map(i -> i.getUpdatedAt()).max(...)`.
   - Compute `daysSinceLastUpdate` from `lastUpdatedAt` (or MAX_VALUE if null).
   - `isOverdue = overdueItemCount > 0`.
   - Build `KpiActualsEmployeeRowDTO`.
4. Build `KpiActualsCompletionReportDTO` with summary counts and sorted list (most overdue first by `daysSinceLastUpdate` DESC).

**`exportKpiActualsCompletionReport(...)` logic:**
- For `format = "pdf"`: generate using `JasperReportUtil` with a new `.jrxml` template.
- For `format = "xlsx"`: generate programmatically using Apache POI (same library already in project), writing headers + rows directly — **no `.jrxml` needed for Excel**.

> **Note on Excel generation**: The existing Excel export pattern in `JasperReportUtil` uses Jasper for both PDF and XLSX. For this report we can follow the same approach: add a new `.jrxml` file in `src/main/resources/reports/` and delegate both formats through `JasperReportUtil.generateReport(...)`.

---

### Backend — Controller

#### [MODIFY] `ReportController.java`

Add two new endpoints following the established pattern:

```java
// KPI Actuals Completion Rate
@GetMapping("/kpi-actuals-completion")
@PreAuthorize("hasAnyRole('MANAGER','HR','ADMIN')")
public ResponseEntity<ApiResponse<KpiActualsCompletionReportDTO>> getKpiActualsCompletionReport(
        @RequestParam Long cycleId,
        @RequestParam(required = false) Long managerId,
        @RequestParam(required = false) Long departmentId,
        @RequestParam(defaultValue = "30") int thresholdDays) {
    return ResponseEntity.ok(ApiResponse.success(
        reportService.getKpiActualsCompletionReport(cycleId, managerId, departmentId, thresholdDays)));
}

@GetMapping("/kpi-actuals-completion/download")
@PreAuthorize("hasAnyRole('MANAGER','HR','ADMIN')")
public ResponseEntity<byte[]> downloadKpiActualsCompletionReport(
        @RequestParam Long cycleId,
        @RequestParam(required = false) Long managerId,
        @RequestParam(required = false) Long departmentId,
        @RequestParam(defaultValue = "30") int thresholdDays,
        @RequestParam(defaultValue = "pdf") String format) {
    byte[] content = reportService.exportKpiActualsCompletionReport(
        cycleId, managerId, departmentId, thresholdDays, format);
    return createDownloadResponse(content, "KPI_Actuals_Completion_Report", format);
}
```

**Access-control logic (applied in ServiceImpl, not just by role)**:
- If caller is `MANAGER` → pass their `managerId`; `departmentId` is ignored.
- If caller is `HR` or `ADMIN` → `managerId = null`; `departmentId` filter is applied if provided.

---

### Backend — JasperReport Template

#### [NEW] `kpi_actuals_completion_report.jrxml`
Path: `src/main/resources/reports/kpi_actuals_completion_report.jrxml`

Columns to render in the report table:

| Column | Field |
|---|---|
| Employee Name | `employeeName` |
| Department | `departmentName` |
| Position | `positionName` |
| Total KPI Items | `totalKpiItems` |
| Overdue Items | `overdueItemCount` |
| Last Updated | `lastUpdatedAt` |
| Days Since Update | `daysSinceLastUpdate` |
| Status | `isOverdue` → "OVERDUE" / "UP TO DATE" |

Report header parameters: `reportTitle`, `cycleName`, `generatedAt`, `thresholdDays`, `overdueRate`.

---

### Frontend — API Service

#### [MODIFY] `kpiApi.ts`

Add a new RTK Query endpoint to the existing `kpiApi` slice (or `reportApi` if it exists):

```typescript
getKpiActualsCompletionReport: builder.query<
  ApiResponse<KpiActualsCompletionReportDTO>,
  { cycleId: number; managerId?: number; departmentId?: number; thresholdDays?: number }
>({
  query: ({ cycleId, managerId, departmentId, thresholdDays = 30 }) => ({
    url: `/reports/kpi-actuals-completion`,
    params: { cycleId, managerId, departmentId, thresholdDays },
  }),
}),
```

---

### Frontend — Type Definitions

Add to the frontend types file (e.g., `kpiTypes.ts` or inline in the modal):

```typescript
export interface KpiActualsEmployeeRowDTO {
  employeeId: number;
  employeeName: string;
  departmentName: string;
  positionName: string;
  totalKpiItems: number;
  overdueItemCount: number;
  lastUpdatedAt: string | null;
  daysSinceLastUpdate: number;
  isOverdue: boolean;
}

export interface KpiActualsCompletionReportDTO {
  generatedAt: string;
  cycleId: number;
  cycleName: string;
  thresholdDays: number;
  totalEmployees: number;
  overdueEmployeeCount: number;
  upToDateEmployeeCount: number;
  overdueRate: number;
  employeeRows: KpiActualsEmployeeRowDTO[];
}
```

---

### Frontend — Button Component

#### [NEW] `KpiActualsReportButton.tsx`
Path: `epms_frontend/src/components/kpi/KpiActualsReportButton.tsx`

Mirrors `KpiSummaryReportButton.tsx` exactly — a small button that opens `KpiActualsReportModal` on click:

```tsx
const KpiActualsReportButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={/* same style as KpiSummaryReportButton */}>
        <AlertCircle size={13} /> Actuals Completion
      </button>
      {open && <KpiActualsReportModal onClose={() => setOpen(false)} />}
    </>
  );
};
```

---

### Frontend — Modal Component

#### [NEW] `KpiActualsReportModal.tsx`
Path: `epms_frontend/src/components/kpi/KpiActualsReportModal.tsx`

Mirrors the layout of `KpiSummaryReportModal.tsx`:

**Left Sidebar (280px):**
- `Department` filter dropdown — HR/Admin only (same `CollapsibleSection` pattern)
- `Appraisal Cycle` selector (single-select, not multi-select like KpiSummary)
- `Threshold Days` input (default 30, min 1, max 365)

**Right Preview Panel:**
- **Summary cards row**: Total Employees | Overdue | Up to Date | Overdue Rate %
- **Employee table** (sorted by `daysSinceLastUpdate` DESC):
  - Employee Name + avatar
  - Department
  - KPI Items (total)
  - Overdue Items (badge, red if > 0)
  - Last Updated (human-readable, e.g. "32 days ago")
  - Status badge: `OVERDUE` (red) / `UP TO DATE` (green)
- Shows "Select a cycle to preview" when no cycle is selected

**Download action bar (bottom-right):**
- Excel icon button → triggers `format=xlsx`
- "Generate PDF Report" primary button → triggers `format=pdf`

**Role-based filtering:**
- `isManager && !isAdminOrHr`: automatically passes `user.id` as `managerId` to the API; department filter is hidden.
- `isAdminOrHr`: passes `managerId = undefined`; shows department filter.

---

### Frontend — Page Integration

#### [MODIFY] `GoalManagement.tsx`

Import and add `<KpiActualsReportButton />` in the header action bar next to the existing `<KpiSummaryReportButton />`:

```tsx
import KpiActualsReportButton from '../../components/kpi/KpiActualsReportButton';
// ...
<KpiActualsReportButton />
<KpiSummaryReportButton />
```

#### [MODIFY] `TeamKpiDashboard.tsx`

Same addition in the header action bar next to `<KpiSummaryReportButton />`.

---

## Data Flow Summary

```
User clicks "Actuals Completion" button
  → KpiActualsReportModal opens
  → User selects cycle (+ optional dept filter for HR)
  → GET /api/v1/reports/kpi-actuals-completion?cycleId=X&thresholdDays=30
      → ReportController → ReportServiceImpl
          → KpiGoalsRepository.findApprovedGoalsForActualsReport(cycleId, managerId)
          → For each KpiGoals: check KpiGoalItem.updatedAt vs threshold
          → Build KpiActualsCompletionReportDTO
      ← Return JSON
  → Modal preview renders summary cards + table
  → User clicks PDF/Excel
  → GET /api/v1/reports/kpi-actuals-completion/download?format=pdf
      → JasperReportUtil → kpi_actuals_completion_report.jrxml
      ← byte[] → file download
```

---

## Verification Plan

### Backend
- Compile: `.\mvnw.cmd clean compile` — zero errors.
- Manual API test: `GET /api/v1/reports/kpi-actuals-completion?cycleId=1&thresholdDays=30` with Manager JWT → returns only team data; with HR JWT → returns org-wide data.
- Verify `overdueItemCount` is correct for an employee whose KPI item `updatedAt` is > 30 days old.
- Download PDF and Excel and confirm they open correctly.

### Frontend
- Open `GoalManagement` as Manager → click "Actuals Completion" → modal opens → select cycle → table loads.
- Open as HR → department filter is visible.
- Overdue employees show red badge, up-to-date show green.
- PDF and Excel downloads trigger and files are valid.

---

## Open Questions

> [!NOTE]
> **Q1 — Excel via Jasper or raw POI?** The existing reports all use `.jrxml` for both PDF and Excel. If you'd prefer a plain Apache POI Excel writer for this report (simpler, no Jasper template needed for xlsx), let me know and the plan will be adjusted accordingly.

> [!NOTE]
> **Q2 — Threshold configurable per request?** The plan allows the frontend to send `thresholdDays` (defaulting to 30). If you want it hardcoded to 30 days only, the input field and parameter can be removed.

> [!NOTE]
> **Q3 — Include employees with no goal set?** Currently, only employees with an `APPROVED`/`LOCKED`/`SCORED` goal set are included. Employees who were never assigned a KPI (status = `DRAFT` or no goal set) are excluded. Should "never assigned" employees appear in the report as a separate row?
