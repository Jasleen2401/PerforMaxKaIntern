# Implementation Plan: Block Finalize Until Both Signatures Are Captured

## Context

On the Result Page (`epms_frontend/src/pages/appraisal/ResultPage.tsx`, lines 210–305), the appraisal already collects two digital signatures:

- **Employee signature** — captured via `SignaturePad` (line 242–246), uploaded by `useUploadEmployeeSignatureMutation`. Backend writes `appraisal.employeeSignedAt = Instant.now()`.
- **Manager signature** — captured via the same component (lines 289–293), uploaded by `useUploadManagerSignatureMutation`. Backend writes `appraisal.managerSignedAt = Instant.now()`.

The Finalize action lives on a different page — `AppraisalDetail.tsx` (lines 179–191) — and the backend `finalizeAppraisal` at line 329 of `AppraisalServiceImpl.java` only guards on `status == HR_APPROVED`:

```java
if (appraisal.getStatus() != AppraisalStatus.HR_APPROVED) {
    throw new RuntimeException(
        "Cannot finalize: appraisal must be HR_APPROVED first. Current status: "
        + appraisal.getStatus());
}
```

Nothing checks the two signature fields. So HR can finalize an appraisal even when one or both parties haven't signed yet, which defeats the purpose of asking for signatures.

## Goal

The Finalize button (and the backend endpoint behind it) must refuse to act until **both** `appraisal.employeeSignedAt` and `appraisal.managerSignedAt` are populated. The button stays visible at every status — it's just disabled with a clear tooltip until the two signatures are captured.

Backend enforces the rule; frontend mirrors it for UX so HR isn't waiting for a toast to find out why nothing happened.

## Scope of Files

**Backend** (`epms_backend/`)
- `src/main/java/ace/org/epms_backend/service/impl/AppraisalServiceImpl.java` — extend the guard in `finalizeAppraisal`.

**Frontend** (`epms_frontend/`)
- `src/pages/appraisal/AppraisalDetail.tsx` — extend the `disabled` check on the Finalize button and the surrounding visual state.

No DB migration. The two signature timestamp fields already exist on the `Appraisal` entity.

---

## Step 1 — Backend Guard

In `AppraisalServiceImpl.java`, extend the guard at the top of `finalizeAppraisal` (around lines 335–340) to also require both signatures:

```java
@Override
@Transactional
public AppraisalResponse finalizeAppraisal(Long id) {
    Appraisal appraisal = appraisalRepo.findById(id)
        .orElseThrow(() -> new NotFoundException("Appraisal not found"));

    // Guard 1: must be HR_APPROVED before finalization
    if (appraisal.getStatus() != AppraisalStatus.HR_APPROVED) {
        throw new RuntimeException(
            "Cannot finalize: appraisal must be HR_APPROVED first. Current status: "
            + appraisal.getStatus());
    }

    // Guard 2: both employee and manager must have signed
    if (appraisal.getEmployeeSignedAt() == null && appraisal.getManagerSignedAt() == null) {
        throw new RuntimeException(
            "Cannot finalize: employee and manager have not signed off yet.");
    }
    if (appraisal.getEmployeeSignedAt() == null) {
        throw new RuntimeException(
            "Cannot finalize: awaiting employee signature.");
    }
    if (appraisal.getManagerSignedAt() == null) {
        throw new RuntimeException(
            "Cannot finalize: awaiting manager signature.");
    }

    appraisal.setStatus(AppraisalStatus.FINALIZED);
    appraisal.setFinalizedAt(Instant.now());
    // ... rest unchanged
}
```

Three separate messages (both missing / employee missing / manager missing) give HR a clear next step in the toast instead of a generic "go sign". Optional but recommended.

If you have a project-wide `IllegalAppraisalStateException` or `InvalidAppraisalStateException` (already used by the form export guards), throw that instead of raw `RuntimeException` so the `@ControllerAdvice` maps it to **HTTP 409 Conflict** cleanly. Otherwise the frontend toast won't distinguish this from a generic 500.

---

## Step 2 — Frontend Gate on the Finalize Button

In `epms_frontend/src/pages/appraisal/AppraisalDetail.tsx`:

### 2a. Derive a single readiness flag

Near the other derived flags (around the existing `canManage` / `isFinalizing` lines), add:

```ts
const hasEmployeeSigned = !!appraisal?.employeeSignedAt;
const hasManagerSigned  = !!appraisal?.managerSignedAt;
const canFinalize       = appraisal?.status === 'HR_APPROVED' && hasEmployeeSigned && hasManagerSigned;

const finalizeBlockedReason =
  appraisal?.status !== 'HR_APPROVED' ? 'Appraisal must be HR-approved first.'
  : !hasEmployeeSigned && !hasManagerSigned ? 'Awaiting employee and manager signatures.'
  : !hasEmployeeSigned ? 'Awaiting employee signature.'
  : !hasManagerSigned  ? 'Awaiting manager signature.'
  : '';
```

`appraisal?.employeeSignedAt` / `managerSignedAt` are already part of the `useGetEmployeeAssessmentQuery` response (see how the Result Page consumes them at lines 226 and 267 of `ResultPage.tsx`). Confirm they're typed on `appraisal` — if not, add them to the TypeScript type for that response.

### 2b. Wire the button (line 186)

Change:

```tsx
<button disabled={isFinalizing || appraisal.status !== 'HR_APPROVED'} onClick={handleFinalize}
  className="w-full transition-colors disabled:opacity-50"
  style={{ ... }}>
  {isFinalizing ? 'Finalizing…' : 'Close Appraisal'}
</button>
```

to:

```tsx
<button
  disabled={isFinalizing || !canFinalize}
  onClick={handleFinalize}
  title={canFinalize ? 'Finalize and lock this appraisal' : finalizeBlockedReason}
  className="w-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  style={{ ... }}>
  {isFinalizing ? 'Finalizing…' : 'Close Appraisal'}
</button>
```

The `title` attribute gives HR a tooltip that names the missing signature, matching the pattern used on the Export PDF buttons in the form-export plan.

### 2c. Match the panel's visual state

The surrounding `<div>` at line 180 currently colors itself green/grey based on `status === 'HR_APPROVED'`. Extend that to also key off `canFinalize` so the panel only goes "ready" once everything's in place:

```tsx
<div style={{
  border: `0.5px solid ${canFinalize ? '#B8DCA0' : '#E4E6EC'}`,
  borderRadius: 10,
  padding: '14px',
  background: canFinalize ? '#EAF3DE' : '#F5F6F8',
  opacity: canFinalize ? 1 : 0.6,
}}>
  …
</div>
```

### 2d. Add a small inline status hint inside the panel

Right above the button, show a tiny reminder of what's missing. This gives HR the answer at a glance without hovering for the tooltip:

```tsx
{!canFinalize && appraisal.status === 'HR_APPROVED' && (
  <p style={{ fontSize: 11, color: '#791F1F', marginBottom: 8 }}>
    ⚠ {finalizeBlockedReason}
  </p>
)}
```

If the appraisal isn't `HR_APPROVED` yet, the existing greyed-out panel already explains itself, so suppress the hint in that case (the condition above already handles that).

### 2e. Toast on backend rejection (defensive)

`handleFinalize` at line 73–75 already swallows the error and toasts a generic "Finalized!" success message. If a race condition lets the click through despite the disabled state (unlikely but possible if a signature is revoked between page load and click), the backend's 409 will fire. Make sure the catch surfaces it:

```ts
const handleFinalize = async () => {
  try {
    await finalizeAppraisal(id!).unwrap();
    toast.success('Finalized!');
  } catch (err: any) {
    toast.error(err?.data?.message || 'Failed to finalize.');
  }
};
```

This is the same pattern used everywhere else in the codebase.

---

## Step 3 — Tests

**Backend:**

- `finalize_succeeds_whenHRApproved_andBothSigned`
- `finalize_rejects_whenHRApproved_butNeitherSigned` → 409 / "employee and manager have not signed off yet"
- `finalize_rejects_whenHRApproved_butOnlyManagerSigned` → 409 / "awaiting employee signature"
- `finalize_rejects_whenHRApproved_butOnlyEmployeeSigned` → 409 / "awaiting manager signature"
- `finalize_rejects_whenStillEvaluated` → existing test, no change (status guard fires first)

**Frontend (render-level):**

- `AppraisalDetail` with `status='HR_APPROVED'`, both signed-at timestamps present → button enabled, no warning hint, panel is green.
- Same status, neither signed → button disabled, warning hint shows "Awaiting employee and manager signatures.", tooltip matches.
- Same status, only employee signed → "Awaiting manager signature."
- Same status, only manager signed → "Awaiting employee signature."
- `status='EVALUATED'` (not yet HR-approved) → button disabled, panel grey, no warning hint (the existing status framing covers it).

**Manual smoke test (end-to-end):**

1. Push an appraisal to `HR_APPROVED`. Open `AppraisalDetail`. Confirm Finalize button is disabled, with the warning "Awaiting employee and manager signatures."
2. As the employee, go to the Result Page and sign. Reload the detail page — warning becomes "Awaiting manager signature."
3. As the manager, go to the Result Page and sign. Reload — button becomes enabled and the panel turns green.
4. Click Finalize → status flips to `FINALIZED`, toast "Finalized!".
5. Negative test — without signing, hit `PUT /api/v1/appraisals/{id}/finalize` directly via curl. Expect 409 with one of the three messages.

---

## Order of Work

1. **Backend guard** in `finalizeAppraisal` (Step 1). Authoritative, ships first.
2. **Backend tests** (Step 3, backend section).
3. **Frontend gate** on the Finalize button (Step 2). Reads existing `appraisal` fields, no new API calls.
4. **Frontend tests + manual smoke** (Step 3, frontend section).

Estimated effort: **~1 hour backend + 1 hour frontend + 30 minutes tests**. Small change, but very high signal — it closes a real policy hole.

---

## Acceptance Criteria

- Backend `PUT /api/v1/appraisals/{id}/finalize` returns 409 with a clear message ("Awaiting employee signature." / "Awaiting manager signature." / "employee and manager have not signed off yet.") whenever either signature is missing, even on an `HR_APPROVED` appraisal.
- Frontend Finalize button on `AppraisalDetail` is disabled (`cursor-not-allowed`, dimmed) until both signatures are present. The disabled tooltip and inline warning name the missing signature.
- Once both signatures are captured, the button becomes enabled, the surrounding panel turns green, and the existing finalize flow proceeds unchanged.
- No regression to the rest of the appraisal lifecycle — `Approve Results`, signature capture, score calculation, and the existing Result Page UI are untouched.
- No DB migration; reuses `employeeSignedAt` / `managerSignedAt` already on the `Appraisal` entity.
