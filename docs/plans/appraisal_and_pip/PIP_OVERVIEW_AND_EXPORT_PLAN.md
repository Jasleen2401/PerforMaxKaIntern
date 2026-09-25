# Implementation Plan: PIP Overview Department Dropdown + Per-PIP PDF Export

## Context

Two changes scoped to the PIP module:

**Change 1 — Department dropdown on the PIP overview page.**
In `epms_frontend/src/pages/pip/PipListPage.tsx`, the department filter dropdown is currently built from only the departments of employees who already have a PIP (lines 57–58):

```ts
const departmentsWithPips = allPips.map(pip => getEmployee(pip.employeeId)?.currentDepartmentName).filter(Boolean) as string[];
const departments = ['All Departments', ...new Set(departmentsWithPips)];
```

You want it to bind to **all departments from the `departments` table**, regardless of whether any employee in that department currently has a PIP.

**Change 2 — Individual PIP PDF export.**
Add an **Export PDF** button on the per-PIP detail page (`PipDetailsPage.tsx`). The button should be visible at all times but **disabled (frozen) until the PIP is finalized**. In your code, "finalized" means `pip.status === 'COMPLETED'` or `pip.status === 'CLOSED'` — those are the two terminal states already gated against further edits elsewhere in the file.

The export should follow the same pattern used by your existing report downloads and by the recently-fixed Self-Assessment / Manager Evaluation form exports.

## Existing Infrastructure to Reuse

- `useGetDepartmentsQuery` (and `useGetActiveDepartmentsQuery`) already exist in `epms_frontend/src/features/org/departmentApi.ts`. Backed by `GET /departments` (or `/departments/active`).
- `useDownloadReportMutation` in `epms_frontend/src/features/report/reportApi.ts` — the recently-fixed `queryFn`-based downloader. Accepts any `endpoint` string.
- Backend `ReportController` already has the `createDownloadResponse` helper, and `ReportServiceImpl` already has the `generateReport` private method that delegates to `JasperReportUtil`.
- `PipDetailDTO.java` already exists in `dto/report/` — useful for shaping the per-PIP export payload.
- Jasper templates live in `epms_backend/src/main/resources/reports/`.

## Scope of Files

**Backend** (`epms_backend/`)
- `src/main/java/ace/org/epms_backend/service/report/ReportService.java` — add one method signature.
- `src/main/java/ace/org/epms_backend/service/impl/report/ReportServiceImpl.java` — add `exportPipDetailReport(...)`.
- `src/main/java/ace/org/epms_backend/controller/report/ReportController.java` — add one new `@GetMapping("/pip-detail/download")`.
- `src/main/resources/reports/pip_detail_report.jrxml` — **NEW** Jasper template.
- (optional) `src/main/java/ace/org/epms_backend/dto/report/PipDetailReportObjectiveDTO.java` — **NEW**, small line-item DTO for the objectives table in the PDF if `PipDetailDTO` doesn't already carry the right shape.

**Frontend** (`epms_frontend/`)
- `src/pages/pip/PipListPage.tsx` — switch the department source to `useGetDepartmentsQuery`.
- `src/pages/pip/PipDetailsPage.tsx` — add the Export PDF button, gated on `COMPLETED`/`CLOSED`.

No DB migration. No new enum values.

---

## Step 1 — Department Dropdown: Bind to All Departments

In `epms_frontend/src/pages/pip/PipListPage.tsx`:

1. **Add the import** near the top, next to the existing employee API import:
   ```ts
   import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
   ```

2. **Add the query** alongside the existing hooks (around line 41):
   ```ts
   const { data: allDepartments = [] } = useGetDepartmentsQuery();
   ```
   Use `useGetActiveDepartmentsQuery` instead if archived/inactive departments should be hidden — your call.

3. **Replace lines 57–58** (the derived list):
   ```ts
   const departmentsWithPips = allPips.map(...)... // remove
   const departments = ['All Departments', ...new Set(departmentsWithPips)]; // remove
   ```
   with:
   ```ts
   const departments = [
     'All Departments',
     ...allDepartments
       .map(d => d.departmentName)
       .filter(Boolean)
       .sort((a, b) => a.localeCompare(b)),
   ];
   ```

4. **Leave the filter logic at line 62 alone** — it matches against `employee?.currentDepartmentName`, which is still the right comparison. Selecting a department that has no PIPs will simply yield an empty filtered list, which is the desired UX (the user sees "no PIPs in this department").

5. Confirm `DepartmentResponse` exposes `departmentName` in `features/org/orgTypes.ts` — if the field is named differently (e.g. `name`), use that field name instead.

That's the entire frontend change for Change 1.

---

## Step 2 — Backend: PIP Detail Report Endpoint

### 2a. Service interface

In `ReportService.java`, add:

```java
byte[] exportPipDetailReport(Long pipId, String format);
```

### 2b. Service implementation

In `ReportServiceImpl.java`, mirror the pattern used by `exportSelfAssessmentForm` (lines 999–1066). Sketch:

```java
@Override
@Transactional(readOnly = true)
public byte[] exportPipDetailReport(Long pipId, String format) {
    PipRecord pip = pipRecordRepository.findById(pipId)
        .orElseThrow(() -> new NotFoundException("PIP not found: " + pipId));

    // Guard: only export after the PIP is finalized
    if (pip.getStatus() != PipStatus.COMPLETED && pip.getStatus() != PipStatus.CLOSED) {
        throw new InvalidAppraisalStateException(
            "PIP can only be exported after it is finalized (COMPLETED or CLOSED).");
    }

    // Subject info
    Employee employee = pip.getEmployee();
    EmployeeDepartment ed = employeeDepartmentRepository
        .findByEmployeeIdAndIsCurrentTrue(employee.getId()).orElse(null);

    // Objective rows
    List<PipObjective> objectives = pipObjectiveRepository.findByPip_PipId(pipId);
    List<PipDetailReportObjectiveDTO> rows = objectives.stream()
        .map(o -> PipDetailReportObjectiveDTO.builder()
            .objectiveTitle(o.getTitle())
            .objectiveDescription(o.getDescription())
            .targetMetric(o.getTargetMetric())
            .progressPercent(o.getProgressPercent() != null ? o.getProgressPercent().toPlainString() + "%" : "0%")
            .status(o.getStatus() != null ? o.getStatus().name() : "—")
            .build())
        .toList();

    // Header params
    Map<String, Object> params = new HashMap<>();
    params.put("reportTitle", "Performance Improvement Plan");
    params.put("pipTitle", pip.getTitle());
    params.put("employeeName", employee.getStaffName());
    params.put("employeeCode", employee.getEmployeeCode());
    params.put("departmentName", ed != null && ed.getCurrentDepartment() != null
        ? ed.getCurrentDepartment().getDepartmentName() : "N/A");
    params.put("positionName", employee.getPosition() != null ? employee.getPosition().getPositionName() : "N/A");
    params.put("managerName", pip.getManager() != null ? pip.getManager().getStaffName() : "N/A");
    params.put("severity", pip.getSeverity() != null ? pip.getSeverity().name() : "—");
    params.put("status", pip.getStatus().name());
    params.put("outcome", pip.getOutcome() != null ? pip.getOutcome().name() : "—");
    params.put("startDate", pip.getStartDate() != null ? pip.getStartDate().toString() : "—");
    params.put("endDate", pip.getEndDate() != null ? pip.getEndDate().toString() : "—");
    params.put("finalComment", pip.getFinalComment() != null ? pip.getFinalComment() : "");

    return generateReport("reports/pip_detail_report.jrxml", params, rows, format);
}
```

Inject `pipRecordRepository`, `pipObjectiveRepository`, and `employeeDepartmentRepository` if they're not already wired in `ReportServiceImpl` (the employee repo is — check the constructor).

Adjust field names (e.g. `getTitle()`, `getDescription()`, `getOutcome()`) to whatever your `PipRecord` / `PipObjective` entities actually expose. If `pip.getFinalComment()` doesn't exist, use whatever field captures the manager's final remarks.

### 2c. Controller endpoint

In `ReportController.java`, immediately after the existing `manager-evaluation/download` block (around line 223), add:

```java
@GetMapping("/pip-detail/download")
public ResponseEntity<byte[]> downloadPipDetailReport(
        @RequestParam Long pipId,
        @RequestParam(defaultValue = "pdf") String format) {
    byte[] content = reportService.exportPipDetailReport(pipId, format);
    return createDownloadResponse(content, "PIP_Detail_Report", format);
}
```

### 2d. Optional DTO

Create `epms_backend/src/main/java/ace/org/epms_backend/dto/report/PipDetailReportObjectiveDTO.java` (only if you don't want to reshape `PipDetailDTO`):

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PipDetailReportObjectiveDTO {
    private String objectiveTitle;
    private String objectiveDescription;
    private String targetMetric;
    private String progressPercent;
    private String status;
}
```

### 2e. Jasper template

Create `epms_backend/src/main/resources/reports/pip_detail_report.jrxml`. Copy `self_assessment_form.jrxml` as a starting point — same band structure works. The parameter and field declarations should look like:

```xml
<parameter name="reportTitle"        class="java.lang.String"/>
<parameter name="pipTitle"           class="java.lang.String"/>
<parameter name="employeeName"       class="java.lang.String"/>
<parameter name="employeeCode"       class="java.lang.String"/>
<parameter name="departmentName"     class="java.lang.String"/>
<parameter name="positionName"       class="java.lang.String"/>
<parameter name="managerName"        class="java.lang.String"/>
<parameter name="severity"           class="java.lang.String"/>
<parameter name="status"             class="java.lang.String"/>
<parameter name="outcome"            class="java.lang.String"/>
<parameter name="startDate"          class="java.lang.String"/>
<parameter name="endDate"            class="java.lang.String"/>
<parameter name="finalComment"       class="java.lang.String"/>

<field name="objectiveTitle"        class="java.lang.String"/>
<field name="objectiveDescription"  class="java.lang.String"/>
<field name="targetMetric"          class="java.lang.String"/>
<field name="progressPercent"       class="java.lang.String"/>
<field name="status"                class="java.lang.String"/>
```

Bands:
- **Title** — `reportTitle`, `pipTitle`, status/outcome pill.
- **Page header** — logo, employee name + code, department, position, manager.
- **Column header** — Objective | Target | Progress | Status.
- **Detail** — one row per objective from the data source.
- **Summary** — severity, start/end dates, final comment block.
- **Page footer** — generated-on timestamp + "Page X of Y".

After saving the template, **restart the backend** so the new file is picked up from the classpath. This was the trap with the Self-Assessment export — don't skip it.

---

## Step 3 — Frontend: Export Button on PIP Details

In `epms_frontend/src/pages/pip/PipDetailsPage.tsx`:

1. **Imports** near the top:
   ```ts
   import { useDownloadReportMutation } from '../../features/report/reportApi';
   import { Download } from 'lucide-react';
   ```

2. **Initialize the mutation** alongside the existing hooks:
   ```ts
   const [downloadReport, { isLoading: isExporting }] = useDownloadReportMutation();
   ```

3. **Compute the gate** near the other derived flags (around the `canManage` line):
   ```ts
   const isFinalized = pip.status === PipStatus.COMPLETED || pip.status === PipStatus.CLOSED;
   ```

4. **Place the button** in the page header — alongside the existing "Finalize PIP" button (around line 228). Use the same style as the Self-Assessment Export PDF button so the visual language is consistent across the app:

   ```tsx
   <button
     onClick={async () => {
       try {
         await downloadReport({
           endpoint: 'pip-detail',
           params: { pipId, format: 'pdf' },
           fileName: `PIP_${pip.employeeName ?? employee?.staffName ?? 'Detail'}.pdf`,
         }).unwrap();
       } catch (err: any) {
         toast.error(err?.data?.message || 'Export failed');
       }
     }}
     disabled={!isFinalized || isExporting}
     title={isFinalized ? 'Export this PIP as PDF' : 'Available after the PIP is finalized'}
     className="inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
     style={{
       background: '#111827',
       color: '#FFFFFF',
       borderRadius: 8,
       padding: '7px 12px',
       fontSize: 13,
       fontWeight: 500,
       border: 'none',
       cursor: isFinalized ? 'pointer' : 'not-allowed',
     }}
   >
     <Download size={13} /> {isExporting ? 'Exporting…' : 'Export PDF'}
   </button>
   ```

   - `disabled` + `disabled:opacity-50 disabled:cursor-not-allowed` gives the "frozen" look you described.
   - The `title` tooltip explains *why* it's disabled so users aren't confused.
   - Sanitize the filename if `pip.employeeName` could contain illegal filename characters:
     ```ts
     const safeName = (pip.employeeName ?? 'Detail').replace(/[\\/:*?"<>|]/g, '_');
     ```

5. The button **stays visible at every status** — only its enabled state flips. This matches the UX the user wants ("freeze the export button before finalizing PIP").

---

## Step 4 — Tests

**Backend:**

- `ReportServiceImplTest.exportPipDetailReport_returnsPdfBytes_whenCompleted`
- `ReportServiceImplTest.exportPipDetailReport_returnsPdfBytes_whenClosed`
- `ReportServiceImplTest.exportPipDetailReport_throws409_whenDraftOrActiveOrExtended`
- `ReportServiceImplTest.exportPipDetailReport_throws404_whenPipMissing`

**Frontend:**

- `PipListPage` — with `useGetDepartmentsQuery` returning `[{ departmentName: 'Engineering' }, { departmentName: 'Sales' }]`, the dropdown renders `All Departments / Engineering / Sales` even when no PIPs exist for those departments.
- `PipListPage` — selecting "Engineering" filters PIPs to engineering employees (existing behavior, regression check).
- `PipDetailsPage` — with `pip.status === 'ACTIVE'`, the Export PDF button is rendered, `disabled`, tooltip says "Available after the PIP is finalized".
- `PipDetailsPage` — with `pip.status === 'COMPLETED'`, button is enabled, clicking it calls `downloadReport` with `endpoint: 'pip-detail'`.
- Same enabled-state test for `status === 'CLOSED'`.

**Manual smoke test:**

1. Open `/pip` overview as HR → confirm the department dropdown shows every department in the table, alphabetically.
2. Select a department with no PIPs → list shows empty state, no crash.
3. Open a `DRAFT` or `ACTIVE` PIP detail → confirm Export PDF button is greyed out with the tooltip.
4. Finalize the PIP via the existing modal → reload → button becomes clickable. Click it. Confirm `PIP_<EmployeeName>.pdf` lands in Downloads and opens cleanly.
5. Try hitting `GET /api/v1/reports/pip-detail/download?pipId={non-finalized}` directly → confirm 409 with the message.
6. Hit `GET /api/v1/reports/pip-detail/download?pipId={nonexistent}` → confirm 404.

---

## Order of Work

1. **Frontend dropdown change** (Step 1). Smallest, ships independently.
2. **Backend endpoint + service + Jasper template** (Step 2). Largest piece.
3. **Backend tests** (Step 4, backend section).
4. **Frontend Export button** (Step 3).
5. **Frontend tests + manual smoke** (Step 4, frontend section).

Estimated effort: **~0.5 day frontend** (dropdown + button), **~1 day backend** (endpoint, service, Jasper template, tests).

---

## Acceptance Criteria

- The PIP overview department dropdown lists every department from the `departments` table, sorted alphabetically, even when no PIP-assigned employees belong to that department.
- An "Export PDF" button is visible on every PIP detail page regardless of status.
- The button is `disabled` (greyed, `cursor-not-allowed`, tooltip "Available after the PIP is finalized") whenever `pip.status` is anything other than `COMPLETED` or `CLOSED`.
- Clicking the enabled button downloads a properly named PDF rendered by Jasper (`PIP_<EmployeeName>.pdf`).
- `GET /api/v1/reports/pip-detail/download` returns 409 if the PIP is not finalized, 404 if the PIP does not exist, and 200 + PDF bytes when finalized.
- Existing PIP filters, finalize flow, and other report downloads continue to work unchanged.
