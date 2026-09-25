# Implementation Plan: Standalone Score Preview Page

## Context

Today, an employee's score breakdown is only visible on the **Result Page** (`pages/appraisal/ResultPage.tsx`, route `/appraisal/:id/results`). That page mixes three concerns:

1. **Score viewing** — raw component scores, weighted scores, final total, grade.
2. **Calculate-and-persist action** — `POST /appraisals/{id}/calculate-score` saves the result, writes `AppraisalSummary`, and fires `APPRAISAL_SUMMARY_READY` notifications.
3. **Sign-off / approval flow** — employee and manager signatures, performance category certification, PDF export.

Because of this bundling, the only time employees, managers, or HR can see the score is *after* the manager has clicked **Calculate Score** and the appraisal is essentially finalized. There is no way to peek at "what would the score be right now" mid-cycle.

## Key Finding

The backend already has a **read-only** score endpoint that does not require finalization:

- `GET /api/v1/appraisals/{id}/score-breakdown` → `AppraisalCalculationServiceImpl.getScoreBreakdown()`
- The method is annotated `@Transactional(readOnly = true)` and calls `buildBreakdown(appraisal)`.
- `buildBreakdown` computes raw component scores, weighted scores, and the final total from whatever data exists in the system right now. It does **not** persist anything, fire notifications, or change the appraisal status.

So a "Score Preview" page is **a pure frontend addition**. No new backend endpoint, no DB change.

## Goal

Create a dedicated **Score Preview** page that:

- Shows the score breakdown at any point in the appraisal lifecycle — including before the manager calculates and approves.
- Is strictly read-only (no Calculate button, no signatures, no notifications).
- Honors role-based visibility: employees see their own preview, managers see their team's, HR/Admin see everyone.
- Clearly labels the score as *preview* / *provisional* when the appraisal is not yet finalized, so nobody mistakes a mid-cycle peek for a final result.

## Scope of Files

**Frontend** (`epms_frontend/`)
- `src/pages/appraisal/ScorePreviewPage.tsx` — **NEW**
- `src/routes/appraisalRoutes.tsx` — register the new route
- `src/pages/appraisal/AppraisalDetail.tsx` — add a "View Score Preview" entry point (the current "Results" button at line 198 stays, but is hidden until finalized)
- `src/pages/appraisal/AppraisalList.tsx` — add a "Preview Score" link in the row actions
- `src/pages/feedback360/` and any "my appraisals" listings — add a small "Score so far" affordance per row (optional)

**Backend** — no changes required for the core feature. Optional: a stricter permission check on `GET /score-breakdown` so that an employee can only read their own, a manager can read their direct reports, HR/Admin can read all. If this is already enforced, leave it.

---

## Step 1 — The New Page `ScorePreviewPage.tsx`

Route: `/appraisal/:id/score`. The page uses **only** `useGetScoreBreakdownQuery` plus `useGetEmployeeAssessmentQuery` for header info. It does **not** import `useCalculateScoreMutation`, `useUploadEmployeeSignatureMutation`, or `useUploadManagerSignatureMutation`.

Sections, top to bottom:

1. **Header** — employee name, cycle name, current appraisal status badge (`PENDING`, `SELF_ASSESSED`, `EVALUATED`, `HR_APPROVED`, `FINALIZED`). A back arrow returns to `/appraisal/:id`.

2. **Stage banner** — colored strip indicating preview vs. final:
   - `PENDING` / `SELF_ASSESSED` → blue: "Preview — self-assessment in progress. Scores will change as more data is submitted."
   - `EVALUATED` → amber: "Provisional — manager evaluation complete, awaiting HR approval."
   - `HR_APPROVED` / `FINALIZED` → green: "Final score."
   - If breakdown returns zeros for one or more components, show a yellow callout: "Some components have no data yet. The total reflects only what has been submitted so far."

3. **Score banner** — large display of `breakdown.finalTotalScore`, the grade (`breakdown.finalGrade`), and the performance category name. Reuse the color helpers (`getScoreBg`, `getScoreText`) lifted from `ResultPage.tsx` so styling stays consistent.

4. **Component breakdown table** — four rows, one per component:

   | Component | Raw Score | Weight | Weighted Score |
   |---|---|---|---|
   | KPI | `kpiRawScore` | `kpiWeight`% | `kpiWeightedScore` |
   | Manager Evaluation | `managerRawScore` | `managerWeight`% | `managerWeightedScore` |
   | Self Assessment | `selfRawScore` | `selfWeight`% | `selfWeightedScore` |
   | 360° Feedback | `feedbackRawScore` | `feedbackWeight`% | `feedbackWeightedScore` |
   | **Total** | — | 100% | **`finalTotalScore`** |

   For rows with `rawScore == 0`, render a "Pending" pill next to the raw column instead of "0.00", to avoid implying a real zero score.

5. **Formula display** — small monospace block:
   `Total = (KPI × 0.40) + (Manager × 0.30) + (Self × 0.20) + (Feedback × 0.10)` (using actual cycle weights).

6. **Footer note** — "This is a preview. The final score is recorded only after the manager calculates and the appraisal is finalized." Always shown for non-finalized states.

7. **No Calculate, no signature pads, no Export PDF.** This page is for viewing only. Export should remain on the Result Page where the canonical record lives.

### Visual treatment

Match the layout language of `ResultPage.tsx` (panel style, fonts, color tokens) so users feel they're looking at the same family of pages, not a different system.

---

## Step 2 — Routing

In `src/routes/appraisalRoutes.tsx`, add the new route next to the existing results route:

```tsx
import ScorePreviewPage from "../pages/appraisal/ScorePreviewPage";

// existing route stays:
{ path: "/appraisal/:id/results", element: <ResultPage /> },
// new:
{ path: "/appraisal/:id/score",   element: <ScorePreviewPage /> },
```

This deliberately keeps the URLs distinct: `/results` is the final, signed-off report; `/score` is the live preview.

---

## Step 3 — Entry Points

### `pages/appraisal/AppraisalDetail.tsx`

Today line 198 routes straight to `/appraisal/:id/results` from a big blue "Results" card. Change the logic to:

- If `appraisal.status === 'FINALIZED'` → keep the existing card, navigates to `/results`.
- Otherwise → swap the card label to **"View Score Preview"** and navigate to `/score`. Use a different color (e.g. the existing `#EEF3FD` / `#0C447C` from ResultPage) so it's visually distinct from the green "final" treatment.

You can also show **both** cards once the appraisal is finalized — one for the live breakdown, one for the canonical signed report — for users who want to compare.

### `pages/appraisal/AppraisalList.tsx`

In each appraisal row's action area, add a small text link "Preview Score" → `/appraisal/{id}/score`. Show it for any status; hide only when the appraisal does not yet exist (impossible in this list, so effectively always shown).

### Manager and HR dashboards

`AppraisalAdminDashboard.tsx` already lists appraisals per cycle. Add the same "Preview Score" link there. Managers benefit most from this — they can sanity-check the trajectory of their team's scores before deciding to finalize.

### Optional: self-service shortcut

In the employee's "My Appraisals" listing (wherever that is rendered), add a "See my score so far" button that opens `/appraisal/{myAppraisalId}/score`. This is the primary user benefit the request is asking for.

---

## Step 4 — Permissions

The backend should already gate `GET /appraisals/{id}/score-breakdown`. Verify in `AppraisalController.java` that the endpoint either uses `@PreAuthorize` or its service method checks ownership. If it currently relies on UI hiding, add a check in `AppraisalCalculationServiceImpl.getScoreBreakdown()`:

```java
Long currentUserId = securityContext.getCurrentUserId();
boolean isOwner   = appraisal.getEmployee().getId().equals(currentUserId);
boolean isManager = appraisal.getManager() != null
                    && appraisal.getManager().getId().equals(currentUserId);
boolean isPrivileged = securityContext.hasAnyRole("HR", "ADMIN");
if (!isOwner && !isManager && !isPrivileged) {
    throw new AccessDeniedException("Not allowed to view this score breakdown.");
}
```

This is defensive — the preview link will be hidden from users who shouldn't see it, but the API must enforce the same rule.

---

## Step 5 — Tests

**Frontend** — render tests for `ScorePreviewPage`:

- Renders breakdown rows with raw, weight, weighted columns.
- Stage banner shows the correct copy for each `appraisal.status`.
- "Pending" pill appears for components whose raw score is zero.
- Page does **not** render Calculate or signature controls regardless of role.
- Final state (`FINALIZED`) shows the green banner.

**Manual smoke test:**

1. Create a cycle, activate it, assign an appraisal.
2. Open `/appraisal/{id}/score` immediately — see all components "Pending", total = 0.00, blue banner.
3. Submit self-assessment → reload → see self-component populated, others still pending, total shows partial weighted contribution from self.
4. Submit manager evaluation → reload → see manager component populated, amber banner.
5. Click Calculate Score on the Result Page → reload Score Preview → see green "Final" banner with the same numbers persisted.
6. Confirm Score Preview never offers a button that changes data.

---

## Step 6 — Status & Notification Hygiene

- Opening the Score Preview must **not** fire any notification, must **not** change `appraisal.status`, and must **not** create an `AppraisalSummary` row. The existing `getScoreBreakdown` endpoint is read-only, so this is satisfied by default.
- The existing Result Page's Calculate button keeps doing exactly what it does today — there is no behavioral change there.

---

## Order of Work

1. **Frontend page skeleton** — `ScorePreviewPage.tsx` with the breakdown table and stage banner.
2. **Route registration** — wire up `/appraisal/:id/score`.
3. **Entry points** — update `AppraisalDetail.tsx`, `AppraisalList.tsx`, `AppraisalAdminDashboard.tsx`, plus the employee self-service shortcut.
4. **Backend permission hardening** (Step 4) if the score-breakdown endpoint is not already secured.
5. **Tests + manual smoke** (Step 5).

Estimated effort: **~1 day frontend** (the API already exists), plus an hour or two of backend hardening if permissions need tightening.

---

## Acceptance Criteria

- A new page at `/appraisal/:id/score` shows the score breakdown for any appraisal at any status.
- The page never fires `calculate-score`, never persists data, never sends notifications.
- The page clearly distinguishes preview / provisional / final states via a colored banner.
- Components with no data yet render a "Pending" pill, not a misleading "0.00" score.
- Entry points exist on `AppraisalDetail`, `AppraisalList`, the admin dashboard, and the employee self-service listing.
- Employees can only preview their own appraisal; managers can preview their direct reports; HR/Admin can preview all — enforced at the API.
- The existing Result Page (`/appraisal/:id/results`) is unchanged and continues to be the canonical place to calculate, sign, and export.
