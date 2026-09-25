# Implementation Plan: Prevent Reactivation of Archived Appraisal Cycles

## Context

In the current EPMS appraisal cycle workflow, the `CycleStatus` enum defines four states:

```
PLANNING  →  IN_PROGRESS  →  EVALUATION  →  ARCHIVED
```

"Close" is not a separate state — closing a cycle simply sets `status = ARCHIVED` and `isActive = false`. However, the existing `activate()` and `update()` methods in `AppraisalCycleServiceImpl` do **not** check the cycle's current status. This allows an Admin/HR user to call `PUT /api/v1/appraisal-cycles/{id}/activate` on an archived cycle and revive it back to `IN_PROGRESS`, which broadcasts a fresh "Cycle Activated" notification to all users.

## Goal

Make `ARCHIVED` a **terminal state**. Once a cycle is archived, no path — activate, update, advance-to-evaluation, or re-close — can bring it back to life. The lock must be enforced in the backend (source of truth) and reflected in the UI (so users do not see broken affordances).

## Scope of Files to Change

**Backend** (`epms_backend/`)
- `src/main/java/ace/org/epms_backend/service/impl/AppraisalCycleServiceImpl.java`
- (optional) a new `IllegalCycleStateException` plus a handler in the existing `@ControllerAdvice`

**Frontend** (`epms_frontend/`)
- `src/pages/appraisal/AppraisalList.tsx` (lines 256–271: the "Activate Cycle" button)
- `src/pages/admin/AppraisalAdminDashboard.tsx` (cycle action area)
- `src/components/appraisal/CycleForm.tsx` (if it exposes an `isActive` toggle for edit)

**No DB migration is required.** `ARCHIVED` already exists in the `CycleStatus` enum and the `appraisal_cycles.status` column.

---

## Step 1 — Add a Reusable Guard in the Service

In `AppraisalCycleServiceImpl.java`, add a private helper next to `checkForActiveCycles` (around line 317):

```java
private void rejectIfArchived(AppraisalCycle cycle, String actionLabel) {
    if (cycle.getStatus() == CycleStatus.ARCHIVED) {
        throw new RuntimeException(
            "Cannot " + actionLabel + " cycle '" + cycle.getCycleName()
            + "'. Archived cycles are permanently closed and cannot be reopened or modified.");
    }
}
```

A dedicated `IllegalCycleStateException extends RuntimeException`, mapped to HTTP 409 in your `@ControllerAdvice`, would be cleaner than a raw `RuntimeException`, but it matches the style already used elsewhere in this file. Pick one and apply it consistently.

---

## Step 2 — Plug the Guard Into Every State-Changing Method

In the same file:

**`activate()`** (line 192) — add right after `getCycleById(id)`:

```java
rejectIfArchived(cycle, "activate");
```

This closes the primary loophole.

**`update()`** (line 111) — add right after `getCycleById(id)`:

```java
rejectIfArchived(cycle, "edit");
```

This blocks the secondary path where someone PUTs `isActive=true` (or any other change) onto an archived cycle.

**`advanceToEvaluation()`** (line 229) — the existing guard only allows transition from `IN_PROGRESS`, so archived is already blocked indirectly. For consistency and clearer error messages, still add:

```java
rejectIfArchived(cycle, "advance");
```

**`close()`** (line 264) — add the same guard so re-closing an archived cycle returns a clean error instead of silently re-broadcasting `APPRAISAL_CYCLE_CLOSED`:

```java
rejectIfArchived(cycle, "close");
```

**`schedulerDrivenClose()`** (line 358) — add an idempotent skip (do not throw, since the scheduler should not crash):

```java
if (cycle.getStatus() == CycleStatus.ARCHIVED) { return; }
```

`delete()` is fine as-is — deleting an archived cycle that has no appraisals is a separate, legitimate operation.

---

## Step 3 — Tighten the UI Affordances

### `AppraisalList.tsx`

Line 256, the activate button is currently gated only by `!cycle?.isActive`. Change it to also exclude archived:

```tsx
{!cycle?.isActive && cycle?.status !== 'ARCHIVED' ? (
  <button
    onClick={async () => {
      try {
        await activateCycle(Number(selectedCycleId)).unwrap();
        toast.success('Appraisal Cycle activated successfully!');
      } catch (err: any) {
        const errorMsg = err?.data?.message || 'Failed to activate cycle';
        toast.error(`Error: ${errorMsg}`);
      }
    }}
    disabled={isActivating}
    className="..."
  >
    {isActivating ? 'Activating...' : 'Activate Cycle'}
  </button>
) : isAdmin && cycle?.isActive ? (
  <button ...>Emergency Close</button>
) : null}
```

For archived cycles, render a small read-only badge in place of the button: **"Archived — closed permanently"**.

### `AppraisalAdminDashboard.tsx`

Apply the same `cycle.status !== 'ARCHIVED'` condition wherever the activate action or edit/delete buttons appear. The status badge already exists at line 227, so just disable the action buttons when the cycle is archived.

### `CycleForm.tsx`

If the edit form lets HR toggle `isActive` or change dates, disable all inputs (or the entire form) when editing an archived cycle. Show an informational banner at the top of the form:

> This cycle is archived and cannot be modified.

---

## Step 4 — Improve the Error Surface

Add an `@ExceptionHandler` (or extend the existing one) so the guard's exception returns **HTTP 409 Conflict** with the message body, instead of 500.

The frontend toast in `AppraisalList.tsx` (line 263) already reads `err?.data?.message`, so the message you throw will flow straight through to the user.

---

## Step 5 — Tests

In the backend test suite, add cases for `AppraisalCycleServiceImpl`:

- `activate_shouldThrow_whenCycleIsArchived`
- `update_shouldThrow_whenCycleIsArchived`
- `close_shouldThrow_whenCycleAlreadyArchived`
- `schedulerDrivenClose_shouldBeNoOp_whenCycleAlreadyArchived`
- `activate_shouldSucceed_whenCycleIsPlanningOrInProgress` (regression — make sure you did not over-block)

**Quick manual test path:** create a cycle → activate → close → confirm the Activate button is gone in the UI, and `curl -X PUT /api/v1/appraisal-cycles/{id}/activate` returns 409.

---

## Step 6 — Audit / Notification Hygiene

When the guard fires, log an `AuditAction.UPDATE` entry with `AuditStatus.FAILURE` so HR can see the attempted reactivation in the audit trail. No notification should be broadcast on a rejected attempt — this is already the case since the throw happens before `eventPublisher.publishEvent`.

---

## Order of Work

1. **Backend service guards + exception handler** (Steps 1, 2, 4) — the security boundary.
2. **Backend tests** (Step 5) — prove it.
3. **Frontend button/form guards** (Step 3) — the user-facing polish.
4. **Audit logging on failed attempts** (Step 6) — observability.

---

## Acceptance Criteria

- `PUT /api/v1/appraisal-cycles/{id}/activate` on an archived cycle returns HTTP 409 with a clear message.
- `PUT /api/v1/appraisal-cycles/{id}` on an archived cycle returns HTTP 409.
- `PUT /api/v1/appraisal-cycles/{id}/close` on an already-archived cycle returns HTTP 409 (no duplicate broadcast).
- The scheduler does not error out if it encounters an already-archived cycle.
- In the UI, archived cycles show a read-only "Archived" badge and no Activate / Edit / Close / Advance buttons.
- Existing valid transitions (`PLANNING`/`IN_PROGRESS` → activate, `IN_PROGRESS` → `EVALUATION`, etc.) continue to work unchanged.
