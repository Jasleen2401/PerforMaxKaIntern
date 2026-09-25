# Implementation Plan: Remove "Export Status" Button, Add Per-Form PDF Export

## Context

Two related changes on the appraisal cycle performance review page (`pages/appraisal/AppraisalList.tsx`):

**Today:**
- Line 226–228 renders an **"Export Status"** button that has no `onClick` handler — it's a dead placeholder. The same placeholder also exists in the legacy `AppraisalList_RESTORE.tsx`.
- The **Self-Assessment** page (`pages/appraisal/SelfAssessment.tsx`) and **Manager Evaluation** page (`pages/appraisal/ManagerEvaluation.tsx`) have no export affordance. Once an appraisal is `FINALIZED`, these forms become read-only (`isReadOnly = !!formData.submitted || !isOwner` at line 102 of `SelfAssessment.tsx`) but the user has no way to take a copy of the answers offline.
- A non-functional **"Export PDF"** button exists at line 90–93 of `ResultPage.tsx` — also no `onClick`. Out of scope for this change but worth noting; it's a similar dead placeholder.

**Existing PDF export pattern** (the "style my tech made") lives in `controller/report/ReportController.java` + `service/impl/report/ReportServiceImpl.java` + `util/JasperReportUtil.java`:

- Backend: `@GetMapping("/{report-name}/download")` endpoints return `byte[]` rendered by Jasper, wrapped by a private helper `createDownloadResponse(content, fileName, format)`.
- Frontend: `features/report/reportApi.ts` exposes a generic `downloadReport` mutation that uses a custom `responseHandler` to convert the response into a Blob and trigger a browser download via a synthetic `<a download>` link.

The plan follows that same pattern so the new exports feel like part of the existing reports family.

## Goal

1. Remove the dead "Export Status" button from `AppraisalList.tsx`.
2. Add an "Export PDF" button to both the Self-Assessment page and the Manager Evaluation page.
3. The buttons render **always** but are **disabled** (greyed out, `cursor-not-allowed`) until the appraisal is approved and forms are view-only — i.e. `appraisal.status === 'FINALIZED'`.
4. The PDF generation, endpoint shape, and download mechanism match the existing `reportApi.ts` pattern exactly so it slots into the codebase cleanly.

## Scope of Files

**Backend** (`epms_backend/`)
- `src/main/java/ace/org/epms_backend/controller/report/ReportController.java` — two new download endpoints.
- `src/main/java/ace/org/epms_backend/service/report/ReportService.java` — two new method signatures.
- `src/main/java/ace/org/epms_backend/service/impl/report/ReportServiceImpl.java` — implementations that load the answered form and render via Jasper.
- `src/main/resources/reports/` (or wherever existing `.jrxml` templates live) — two new Jasper templates: `self_assessment_form.jrxml`, `manager_evaluation_form.jrxml`.
- (optional) `src/main/java/ace/org/epms_backend/dto/report/` — small DTOs to feed the templates if existing response shapes don't fit.

**Frontend** (`epms_frontend/`)
- `src/pages/appraisal/AppraisalList.tsx` — remove the "Export Status" button at lines 226–228.
- `src/features/report/reportApi.ts` — register `self-assessment` and `manager-evaluation` as valid `endpoint` values for the existing `downloadReport` mutation (no new mutation needed — the generic one already accepts an arbitrary endpoint string).
- `src/pages/appraisal/SelfAssessment.tsx` — add the Export PDF button in the page header.
- `src/pages/appraisal/ManagerEvaluation.tsx` — add the Export PDF button in the page header.

**No DB migration required.**

---

## Step 1 — Remove the "Export Status" Button

In `AppraisalList.tsx`, delete lines 226–228:

```tsx
<button className="px-6 py-3 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all flex items-center gap-2">
  <Share2 className="w-4 h-4 text-slate-400" /> Export Status
</button>
```

If the `Share2` lucide import becomes unused, drop it from the imports list at the top of the file. Verify with `grep Share2 AppraisalList.tsx` after deletion.

`AppraisalList_RESTORE.tsx` is a backup of an older revision — leave it alone unless you confirm it's no longer referenced anywhere.

---

## Step 2 — Backend: Two New Download Endpoints

### 2a. `ReportService` interface

Add to `ReportService.java`:

```java
byte[] exportSelfAssessmentForm(Long appraisalId, String format);
byte[] exportManagerEvaluationForm(Long appraisalId, String format);
```

### 2b. `ReportServiceImpl`

For each method:

1. Load the appraisal via `appraisalRepository.findById(appraisalId)`.
2. Guard with an HTTP 409 if `appraisal.status != FINALIZED` so partial/unapproved forms can never be exported by API even if the UI gate is bypassed:
   ```java
   if (appraisal.getStatus() != AppraisalStatus.FINALIZED) {
       throw new IllegalCycleStateException(
           "Form can only be exported after the appraisal is finalized.");
   }
   ```
3. Load the answered form payload — for self-assessment use the existing `SelfAssessmentService.getFullSelfAssessment(appraisalId)` (returns the same shape `SelfAssessment.tsx` reads). For manager evaluation, use the equivalent service that backs `ManagerEvaluation.tsx`.
4. Build a Jasper parameter map: employee name, employee code, department, cycle name, evaluation period, submission date, signature image (if available), and a `JRBeanCollectionDataSource` over the questions/answers list.
5. Render with `JasperReportUtil.render(templatePath, params, dataSource, format)`.
6. Return the resulting `byte[]`.

### 2c. `ReportController` endpoints

Match the style of the existing `@GetMapping("/{name}/download")` endpoints. Add two methods:

```java
@GetMapping("/self-assessment/download")
public ResponseEntity<byte[]> downloadSelfAssessmentForm(
        @RequestParam Long appraisalId,
        @RequestParam(defaultValue = "pdf") String format) {
    byte[] content = reportService.exportSelfAssessmentForm(appraisalId, format);
    return createDownloadResponse(content, "Self_Assessment_Form", format);
}

@GetMapping("/manager-evaluation/download")
public ResponseEntity<byte[]> downloadManagerEvaluationForm(
        @RequestParam Long appraisalId,
        @RequestParam(defaultValue = "pdf") String format) {
    byte[] content = reportService.exportManagerEvaluationForm(appraisalId, format);
    return createDownloadResponse(content, "Manager_Evaluation_Form", format);
}
```

Use whatever `@PreAuthorize` rule the surrounding endpoints use, but tighten if possible — at minimum the employee themselves, the manager of record, and `HR`/`ADMIN` should be allowed. Anyone else gets 403.

### 2d. Jasper templates

Create `self_assessment_form.jrxml` and `manager_evaluation_form.jrxml` in the same folder as the existing `.jrxml` files. Layout suggestion (one page or paginated):

- **Header band**: company logo, "Self-Assessment Form" / "Manager Evaluation Form" title, cycle name, evaluation period.
- **Subject band**: employee name, employee code, department, designation, manager (for self-assessment form), submitted date.
- **Detail band**: iterate the question/answer dataset — section title, question, response text, rating (if applicable), comments.
- **Footer band**: signature image (if uploaded), generated-on timestamp, page X of Y.

Reuse styles from the existing templates so the typography and color match the rest of the report family.

---

## Step 3 — Frontend: Wiring the Existing `downloadReport` Mutation

The `downloadReport` mutation in `features/report/reportApi.ts` already accepts an arbitrary `endpoint` string and a `fileName`, then hits `/reports/{endpoint}/download` and triggers a browser download. **No new mutation needs to be added.** The two new buttons just call it with the right arguments.

If type strictness becomes an issue, add a string-literal union for the `endpoint` parameter to include `"self-assessment"` and `"manager-evaluation"`.

---

## Step 4 — Self-Assessment Page Button

In `pages/appraisal/SelfAssessment.tsx`:

1. Import the mutation hook near the top:
   ```tsx
   import { useDownloadReportMutation } from '../../features/report/reportApi';
   import { Download } from 'lucide-react';
   ```
2. Initialize the mutation:
   ```tsx
   const [downloadReport, { isLoading: isExporting }] = useDownloadReportMutation();
   ```
3. Compute the gate — the button is enabled only when the appraisal is finalized (read-only and approved). The page already has `formData.submitted` and an `isReadOnly` flag at line 102; the canonical signal that the appraisal is *approved* (not just submitted) is the appraisal status. If the page already loads the parent appraisal, use that:
   ```tsx
   const canExport = appraisal?.status === 'FINALIZED';
   ```
   If not, fetch it via `useGetEmployeeAssessmentQuery(appraisalId)` — `ResultPage.tsx` shows the pattern.
4. Render the button in the page header (next to back arrow / page title), matching the style used elsewhere — for example the `Download` button at lines 90–93 of `ResultPage.tsx`:
   ```tsx
   <button
     onClick={async () => {
       try {
         await downloadReport({
           endpoint: 'self-assessment',
           params: { appraisalId: Number(id), format: 'pdf' },
           fileName: `Self_Assessment_${appraisal?.employeeName ?? 'Form'}.pdf`,
         }).unwrap();
       } catch (err: any) {
         toast.error(err?.data?.message || 'Export failed');
       }
     }}
     disabled={!canExport || isExporting}
     title={canExport ? 'Export this form as PDF' : 'Available after the appraisal is approved'}
     className="inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
     style={{
       background: '#111827',
       color: '#FFFFFF',
       borderRadius: 8,
       padding: '7px 12px',
       fontSize: 13,
       fontWeight: 500,
       border: 'none',
     }}
   >
     <Download size={13} /> {isExporting ? 'Exporting…' : 'Export PDF'}
   </button>
   ```

The `disabled:opacity-50 disabled:cursor-not-allowed` Tailwind classes give the "frozen" look you described. The `title` tooltip explains *why* it's disabled so users aren't confused.

---

## Step 5 — Manager Evaluation Page Button

In `pages/appraisal/ManagerEvaluation.tsx`, mirror Step 4 exactly with three changes:

- `endpoint: 'manager-evaluation'`
- `fileName: \`Manager_Evaluation_${appraisal?.employeeName ?? 'Form'}.pdf\``
- The gate is still `appraisal?.status === 'FINALIZED'` — a manager can have *submitted* their evaluation without the appraisal being *approved* yet, and we only want exports after approval.

---

## Step 6 — Gating Logic Detail

The intended UX you described is "freeze (unclickable) until the appraisal is approved (when they all become see-only)". In this codebase, that maps to:

| `appraisal.status` | Form is read-only? | Export PDF enabled? |
|---|---|---|
| `PENDING` | no (employee filling in) | no |
| `SELF_ASSESSED` | yes for employee, no for manager filling in | no |
| `EVALUATED` | yes for everyone | no |
| `HR_APPROVED` | yes for everyone | no (still awaiting final approval) |
| `FINALIZED` | yes for everyone | **yes** |

If "approved" in your team's vocabulary means `HR_APPROVED` instead of `FINALIZED`, swap the gate to `['HR_APPROVED', 'FINALIZED'].includes(appraisal?.status)`. Pick one and apply it identically on both pages plus the backend guard in Step 2b.

---

## Step 7 — Tests

**Backend:**

- `ReportServiceImplTest.exportSelfAssessmentForm_returnsPdfBytes_whenFinalized`
- `ReportServiceImplTest.exportSelfAssessmentForm_throws409_whenNotFinalized`
- Same two cases for `exportManagerEvaluationForm`.
- Permission check: a logged-in user who is not the employee, manager, HR, or Admin gets 403.

**Frontend:**

- Render `SelfAssessment.tsx` with `appraisal.status = 'PENDING'` → Export button is rendered, `disabled`, tooltip says "Available after the appraisal is approved".
- Same page with `status = 'FINALIZED'` → button is enabled, clicking it calls `downloadReport` with `endpoint: 'self-assessment'`.
- Same two cases for `ManagerEvaluation.tsx`.
- `AppraisalList.tsx` no longer renders any element with text "Export Status".

**Manual smoke test:**

1. Open a `PENDING` appraisal's self-assessment as the employee → confirm the Export PDF button is greyed out with the tooltip.
2. Submit the self-assessment → button still greyed (status is now `SELF_ASSESSED`, not yet final).
3. Push the appraisal through manager evaluation → HR approval → finalization. Reload — button becomes clickable, click it, confirm a `Self_Assessment_<name>.pdf` is downloaded with the answered form rendered.
4. Repeat for the manager evaluation page from the manager's account.
5. Try hitting `GET /api/v1/reports/self-assessment/download?appraisalId={non-finalized id}` directly → confirm 409.
6. Open the appraisal cycle review page → confirm "Export Status" is gone.

---

## Order of Work

1. **Frontend cleanup** — remove the "Export Status" button (Step 1). Smallest change; ship first.
2. **Backend endpoints + Jasper templates** (Step 2). Largest piece.
3. **Backend tests** (Step 7, backend section).
4. **Frontend buttons** — add to Self-Assessment and Manager Evaluation pages (Steps 3, 4, 5).
5. **Frontend tests + manual smoke** (Step 7, frontend section).

Estimated effort: **~0.5 day frontend** (button + cleanup), **~1.5 days backend** (endpoint, service, two Jasper templates, tests).

---

## Acceptance Criteria

- The "Export Status" button is gone from `AppraisalList.tsx`.
- An "Export PDF" button is visible on both `SelfAssessment.tsx` and `ManagerEvaluation.tsx`, styled like the existing Download button in `ResultPage.tsx`.
- The button is disabled with `cursor-not-allowed` and a tooltip until `appraisal.status === 'FINALIZED'` (or `HR_APPROVED`, per team decision).
- Clicking the enabled button downloads a properly named PDF of the answered form, rendered with Jasper, matching the styling of existing reports.
- `GET /api/v1/reports/self-assessment/download` and `/manager-evaluation/download` return 409 if the appraisal is not finalized, and 403 if the caller is not the employee, manager, HR, or Admin.
- Existing report download flows (`reportApi.ts` consumers, `ReportController` endpoints) are unchanged.
