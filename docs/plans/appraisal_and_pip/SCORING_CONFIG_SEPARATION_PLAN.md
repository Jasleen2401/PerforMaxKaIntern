# Implementation Plan: Separate Scoring Configuration into Its Own Page

## Context

Today the "total score calculation" controls — the four scoring weights (KPI, Manager, Self, 360° Feedback) that must sum to 100% — live inside the **Create Appraisal Cycle** page (`pages/appraisal/CreateCycle.tsx`, the right-side "Scoring Weights" panel, lines 269–292). The weights are sent in the same `POST /api/v1/appraisal-cycles` payload as the cycle metadata.

On the backend, however, the data is already separated:
- `AppraisalCycle` entity (table `appraisal_cycles`)
- `ScoringWeight` entity (table `scoring_weights`) — 1:1 to cycle via `cycle_id`, has its own repository

Only the UI and the request DTO bundle them. The split is a UI refactor that aligns the screens with the data model.

## Goal

Move scoring configuration off the Create/Edit Cycle page and onto a dedicated **Scoring Configuration** page per cycle, so that:

- Cycle metadata (name, dates, deadlines, financial year) and scoring policy (weights) are managed independently.
- HR sees a clear formula and a sample calculation, not just four input boxes.
- Weights cannot be silently changed once evaluations are in progress.
- The change is incremental and backward-compatible — existing flows keep working.

## Recommended Approach

**Option 2 (auto-seed defaults) + Lightweight backend route** — keep the existing cycle-create endpoint accepting weight fields for backward compatibility, but introduce a dedicated `PUT /scoring-weights` endpoint and stop sending weights from the new cycle form. Auto-create a default `ScoringWeight` row on cycle creation so a cycle can never exist without weights.

## Scope of Files

**Backend** (`epms_backend/`)
- `src/main/java/ace/org/epms_backend/controller/` — new `ScoringWeightController.java`
- `src/main/java/ace/org/epms_backend/service/` — new `ScoringWeightService` interface + `impl/ScoringWeightServiceImpl.java`
- `src/main/java/ace/org/epms_backend/dto/appraisal/` — new `ScoringWeightRequest.java` and `ScoringWeightResponse.java`
- `src/main/java/ace/org/epms_backend/service/impl/AppraisalCycleServiceImpl.java` — seed defaults on create, add `weightsConfigured` guard on `activate()`
- `src/main/java/ace/org/epms_backend/repository/ScoringWeightRepository.java` — confirm `findByCycle_CycleId` exists (it already does)

**Frontend** (`epms_frontend/`)
- `src/pages/admin/ScoringConfigPage.tsx` — **NEW** page
- `src/features/appraisal/scoringWeightApi.ts` — **NEW** RTK Query slice
- `src/pages/appraisal/CreateCycle.tsx` — remove the Scoring Weights panel, simplify layout to two columns
- `src/pages/admin/AppraisalAdminDashboard.tsx` — add a "Configure Scoring" entry point on the cycle detail
- `src/App.tsx` (or your router file) — register the new route

**No DB migration required** — the `scoring_weights` table already exists.

---

## Step 1 — Backend: Dedicated Scoring Weight Endpoint

### 1a. DTOs

`ScoringWeightRequest.java`:

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ScoringWeightRequest {
    @NotNull private BigDecimal kpiWeight;
    @NotNull private BigDecimal managerWeight;
    @NotNull private BigDecimal selfWeight;
    @NotNull private BigDecimal feedbackWeight;
}
```

`ScoringWeightResponse.java`:

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ScoringWeightResponse {
    private Long id;
    private Long cycleId;
    private BigDecimal kpiWeight;
    private BigDecimal managerWeight;
    private BigDecimal selfWeight;
    private BigDecimal feedbackWeight;
    private Boolean locked;          // true once any appraisal in this cycle is past SELF_ASSESSED
    private String lockReason;       // e.g. "Evaluations in progress" / "Cycle archived"
}
```

### 1b. Service

`ScoringWeightService` exposes `getByCycleId(cycleId)` and `update(cycleId, request)`.

`update()` must:
1. Validate `kpi + manager + self + feedback == 100` (use `BigDecimal.compareTo`).
2. Load the cycle; if `status == ARCHIVED`, reject (HTTP 409, "Archived cycles cannot be modified").
3. Compute lock state: query `appraisalRepository.findByCycle_CycleId(cycleId)` — if any appraisal has status in `EVALUATED`, `HR_APPROVED`, `FINALIZED`, reject with "Weights are locked because evaluations are in progress."
4. Upsert the `ScoringWeight` row.
5. Audit the change via `auditService.log(...)` with `tableName="scoring_weights"`.

### 1c. Controller

```java
@RestController
@RequestMapping("/api/v1/appraisal-cycles/{cycleId}/scoring-weights")
@RequiredArgsConstructor
public class ScoringWeightController {

    private final ScoringWeightService service;

    @GetMapping
    public ResponseEntity<ApiResponse<ScoringWeightResponse>> get(@PathVariable Long cycleId) {
        return ResponseEntity.ok(ApiResponse.success(service.getByCycleId(cycleId)));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public ResponseEntity<ApiResponse<ScoringWeightResponse>> update(
            @PathVariable Long cycleId,
            @Valid @RequestBody ScoringWeightRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.update(cycleId, request)));
    }
}
```

### 1d. Seed defaults on cycle create

In `AppraisalCycleServiceImpl.create()`, after `appraisalCycleRepository.save(cycle)`, fall back to defaults if the request did not provide weights:

```java
BigDecimal kpi      = nvl(request.getKpiWeight(),      new BigDecimal("40"));
BigDecimal manager  = nvl(request.getManagerWeight(),  new BigDecimal("30"));
BigDecimal self     = nvl(request.getSelfWeight(),     new BigDecimal("20"));
BigDecimal feedback = nvl(request.getFeedbackWeight(), new BigDecimal("10"));
```

The existing block that builds and saves the `ScoringWeight` row is unchanged otherwise. A cycle is now guaranteed to have weights immediately after creation.

### 1e. Activation guard

In `AppraisalCycleServiceImpl.activate()`, before flipping to `IN_PROGRESS`, sanity-check that weights exist and sum to 100. They almost always will because of the seed, but the guard protects against legacy rows:

```java
ScoringWeight w = scoringWeightRepository.findByCycle_CycleId(id)
    .orElseThrow(() -> new RuntimeException(
        "Configure scoring weights before activating this cycle."));
BigDecimal sum = w.getKpiWeight().add(w.getManagerWeight())
                  .add(w.getSelfWeight()).add(w.getFeedbackWeight());
if (sum.compareTo(new BigDecimal("100")) != 0) {
    throw new RuntimeException(
        "Scoring weights for this cycle do not sum to 100. Fix them before activating.");
}
```

This pairs naturally with the archived-cycle lock guard from `ARCHIVED_CYCLE_LOCK_PLAN.md`.

---

## Step 2 — Frontend: New Scoring Configuration Page

### 2a. RTK Query slice

`src/features/appraisal/scoringWeightApi.ts`:

```ts
export const scoringWeightApi = createApi({
  reducerPath: 'scoringWeightApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['ScoringWeight'],
  endpoints: (b) => ({
    getScoringWeights: b.query<ScoringWeightResponse, number>({
      query: (cycleId) => `/appraisal-cycles/${cycleId}/scoring-weights`,
      providesTags: (_r, _e, id) => [{ type: 'ScoringWeight', id }],
    }),
    updateScoringWeights: b.mutation<ScoringWeightResponse, { cycleId: number; body: ScoringWeightRequest }>({
      query: ({ cycleId, body }) => ({
        url: `/appraisal-cycles/${cycleId}/scoring-weights`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { cycleId }) => [{ type: 'ScoringWeight', id: cycleId }],
    }),
  }),
});
```

### 2b. Page `pages/admin/ScoringConfigPage.tsx`

Route: `/admin/cycles/:cycleId/scoring`.

Sections, top to bottom:

1. **Header** — cycle name, status badge, lock state (`Editable` / `Locked — evaluations in progress` / `Locked — cycle archived`).
2. **Four weight inputs** — KPI / Manager / Self / 360° Feedback, with a live `Total: X%` pill (green at 100, red otherwise). Lift the visual style from the existing `WeightRow` component in `CreateCycle.tsx`.
3. **Formula preview** — render the live expression:
   `Total = 0.40 × KPI + 0.30 × Manager + 0.20 × Self + 0.10 × Feedback`
   Update coefficients as the user drags sliders / edits numbers.
4. **Sample calculation** — let the user enter four hypothetical component scores (default each to 80) and show what the total would be:
   `Total = 0.40 × 80 + 0.30 × 80 + 0.20 × 80 + 0.10 × 80 = 80.0`
5. **Audit history** — last N changes (who, when, old → new). Optional v2 if `auditService` query API exists; otherwise stub a "View audit log" link.
6. **Footer** — `Save` (disabled when total ≠ 100 or page is locked) and `Reset to defaults` (40/30/20/10).

On save success, toast "Scoring weights updated." On lock-state errors from the backend, render the message inline above the buttons instead of as a toast.

### 2c. Simplify `CreateCycle.tsx`

- Remove the entire "Scoring Weights" panel (right column in the three-column grid).
- Drop `kpiWeight`, `managerWeight`, `selfWeight`, `feedbackWeight` from `formData` and from the create payload (or leave them out — backend will default them).
- Change layout to two columns: General Info | Deadlines.
- On successful create, route to the new scoring page: `navigate('/admin/cycles/' + newCycleId + '/scoring')` with a toast "Cycle created. Review scoring weights to finish setup."

### 2d. Entry points

- **`AppraisalAdminDashboard.tsx`** — add a "Configure Scoring" button on the selected cycle's action row, next to Activate / Emergency Close. Link to `/admin/cycles/{cycleId}/scoring`.
- **`AppraisalList.tsx`** — add a small `Scoring` link in the cycle list row.
- **Sidebar** (if there's one in `Layout.tsx`) — under Admin → Appraisal, add a "Scoring Configuration" item that opens a cycle picker.

---

## Step 3 — Tests

**Backend** — new tests in `ScoringWeightServiceImplTest`:

- `update_succeedsWhenWeightsSumTo100`
- `update_rejectsWhenSumNot100`
- `update_rejectsWhenCycleArchived`
- `update_rejectsWhenAnyAppraisalIsBeyondSelfAssessed`
- `getByCycleId_returnsDefaultsForFreshCycle` (depends on Step 1d)

Update existing `AppraisalCycleServiceImplTest`:

- `create_seedsDefaultWeightsWhenRequestOmitsThem`
- `activate_rejectsWhenWeightsMissingOrSumNot100`

**Frontend** — render test for `ScoringConfigPage`:

- Renders four inputs, total pill turns green at 100.
- Save button is disabled when total ≠ 100.
- Save button is disabled when API response says locked.
- Reset button restores 40/30/20/10.

**Manual smoke test:**

1. Create a cycle without setting weights → confirm defaults are seeded.
2. Open `/admin/cycles/{id}/scoring` → see 40/30/20/10, edit to 50/25/15/10, save → reload, values persist.
3. Try to save 50/25/15/15 (sum 105) → save disabled, message shown.
4. Activate cycle, assign appraisals, mark one as `EVALUATED` → reopen scoring page, see "Locked", PUT returns 409.
5. Archive the cycle → page shows "Locked — cycle archived".

---

## Step 4 — Migration & Rollback

**Data migration** — none required. Existing cycles already have a `ScoringWeight` row (the current create endpoint always inserts one). For any legacy cycle missing a row, the new `GET` endpoint should lazy-create the default (40/30/20/10) on first read so the UI never shows an empty page.

**Backward compatibility** — keep the weight fields on `AppraisalCycleRequest` for now. Existing callers (the old form, any external scripts, the integration tests) continue to work. Once the new page is in production for a release cycle, remove the fields from the DTO in a follow-up.

**Rollback plan** — the new page is additive. To roll back, simply hide the route and re-enable the Scoring Weights panel in `CreateCycle.tsx`. No data changes are destructive.

---

## Order of Work

1. **Backend** — DTOs, service, controller, default seeding, activation guard (Step 1).
2. **Backend tests** (Step 3, backend section).
3. **Frontend RTK slice + page skeleton** (Steps 2a, 2b without polish).
4. **Wire up entry points and remove the old panel** (Steps 2c, 2d).
5. **Polish — formula preview, sample calculation, lock banners** (rest of Step 2b).
6. **Frontend tests + manual smoke** (Step 3, frontend section).

Estimated effort: ~1.5 days backend, ~2 days frontend including the formula/sample-calculation polish.

---

## Acceptance Criteria

- `GET /api/v1/appraisal-cycles/{id}/scoring-weights` returns the current weights and lock state.
- `PUT /api/v1/appraisal-cycles/{id}/scoring-weights` accepts weights, validates sum = 100, and returns 409 when the cycle is archived or evaluations are in progress.
- Creating a new cycle without supplying weights results in a `ScoringWeight` row with `40 / 30 / 20 / 10`.
- Activating a cycle whose weights are missing or do not sum to 100 returns 409.
- The Create Cycle page no longer contains the Scoring Weights panel.
- A new page at `/admin/cycles/:cycleId/scoring` allows HR/Admin to view and edit weights, with a live formula and sample calculation.
- The page is read-only when the cycle is archived or any appraisal in it is past `SELF_ASSESSED`.
- Existing cycles created before this change continue to function unchanged.
- All weight changes are recorded in the audit log.
