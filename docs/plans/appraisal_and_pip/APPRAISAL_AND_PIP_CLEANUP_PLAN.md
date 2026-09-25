# Implementation Plan: Appraisal Cycle + PIP Cleanup Changes

Five small changes across two modules. Each is scoped tightly and grouped here so they can ship together. None of them needs a DB migration.

---

# Part A — Appraisal Cycle

## A1. Form Set Delete — Cascade Forms Automatically

### Current Behavior

`AppraisalFormSetServiceImpl.deleteFormSet` at line 137:

```java
public void deleteFormSet(Long id) {
    if (appraisalRepo.existsByFormSet_Id(id)) {
        throw new RuntimeException("Cannot delete form set as it is already assigned to appraisals.");
    }
    formSetRepo.deleteById(id);
}
```

It only guards against the form set being **assigned to appraisals**, but it also fails silently (or via DB FK error) when the set still has child forms wired to it. You want: if HR/Admin deletes a form set, automatically delete every form attached to that set.

### Scope

- `epms_backend/src/main/java/ace/org/epms_backend/service/impl/AppraisalFormSetServiceImpl.java`

### Change

Rewrite `deleteFormSet` to cascade. Use the existing `AppraisalFormService.deleteForm(formId)` (the cycle's `delete()` already calls this — same pattern):

```java
@Override
@Transactional
public void deleteFormSet(Long id) {
    AppraisalFormSet set = formSetRepo.findById(id)
        .orElseThrow(() -> new NotFoundException("Form set not found: " + id));

    // Still block deletion if appraisals depend on it
    if (appraisalRepo.existsByFormSet_Id(id)) {
        throw new RuntimeException(
            "Cannot delete form set as it is already assigned to appraisals.");
    }

    // Cascade: delete the two attached forms (self-assessment + manager evaluation)
    if (set.getSelfAssessmentForm() != null) {
        appraisalFormService.deleteForm(set.getSelfAssessmentForm().getFormId());
    }
    if (set.getManagerEvaluationForm() != null) {
        appraisalFormService.deleteForm(set.getManagerEvaluationForm().getFormId());
    }

    formSetRepo.delete(set);
}
```

Inject `AppraisalFormService` and `AppraisalFormSetRepository` (already present). Mark the method `@Transactional` so the cascade and the parent delete share one transaction — if anything in the middle blows up, nothing is left half-deleted.

`AppraisalFormService.deleteForm(formId)` already handles the deeper cleanup (categories → questions → references) — that's how `AppraisalCycleServiceImpl.delete()` does it at lines 177–180.

### Test

- Create a form set with both forms populated → delete it → both forms and the set disappear, no FK error.
- Create a form set whose forms are referenced by an assigned appraisal → delete it → 409 with the existing "already assigned" message.

---

## A2. Delete Cycle Button — Only Visible Before Activation

### Current Behavior

In `epms_frontend/src/pages/appraisal/AppraisalList.tsx`, the **Delete Cycle** button is rendered in two places:

- **Selected-cycle action bar** at lines 242–265 — gated by `isPrivileged && !cycle?.isAssigned`.
- **Cycle card grid** at lines 427–451 — gated by `isPrivileged && !cycle.isAssigned`.

Neither gate considers `isActive` or `status === 'ARCHIVED'`. That means the button shows up on active and archived cycles too, and only fails on the backend.

### Desired Behavior

Delete is only available for cycles that are **created but not yet activated, not archived, and not assigned**. In terms of fields:

- `cycle.isActive === false`
- `cycle.status !== 'ARCHIVED'`
- `cycle.isAssigned === false`

(Most newly-created cycles are `PLANNING` with `isActive: false` and `isAssigned: false` — that's exactly the slot you want delete to live in.)

### Scope

- `epms_frontend/src/pages/appraisal/AppraisalList.tsx`

### Change

Replace both gate conditions:

**Line 242** — change from:
```tsx
{isPrivileged && !cycle?.isAssigned && (
```
to:
```tsx
{isPrivileged && !cycle?.isAssigned && !cycle?.isActive && cycle?.status !== 'ARCHIVED' && (
```

**Line 427** — change from:
```tsx
{isPrivileged && !cycle.isAssigned && (
```
to:
```tsx
{isPrivileged && !cycle.isAssigned && !cycle.isActive && cycle.status !== 'ARCHIVED' && (
```

Optional defense-in-depth — also add a guard in the backend `AppraisalCycleServiceImpl.delete()` (lines 162–188) so the API enforces the same rule:

```java
if (Boolean.TRUE.equals(cycle.getIsActive())) {
    throw new RuntimeException("Cannot delete an active cycle. Close it first.");
}
if (cycle.getStatus() == CycleStatus.ARCHIVED) {
    throw new RuntimeException("Cannot delete an archived cycle. Archived cycles are permanent records.");
}
```

This mirrors the archived-cycle lock pattern from `ARCHIVED_CYCLE_LOCK_PLAN.md`.

### Test

- Create a fresh cycle (status `PLANNING`, `isActive=false`, no appraisals) → delete button visible → click → cycle is gone.
- Activate the cycle → delete button disappears from both the action bar and the card.
- Close the cycle (status becomes `ARCHIVED`) → delete button stays hidden.
- Backend manual: `curl -X DELETE /api/v1/appraisal-cycles/{id}` on an active cycle → 409.

---

## A3. Remove the Little Print Button in Template Review

### Current Behavior

In `epms_frontend/src/pages/appraisal/FormView.tsx` (the appraisal template review page), there's an icon-only **Print** button at lines 77–81:

```tsx
<button title="Print"
  style={{ width: 32, height: 32, ... }}
  className="hover:bg-[#F5F6F8] transition-colors">
  <Printer size={14} />
</button>
```

It has no `onClick` handler — dead button. Same dead-placeholder pattern we removed for "Export Status."

### Scope

- `epms_frontend/src/pages/appraisal/FormView.tsx`

### Change

1. Delete the entire `<button title="Print">…</button>` block at lines 77–81.
2. Drop `Printer` from the lucide import on line 3 (replace `Printer, Edit3` with just `Edit3` if Printer is unused after the deletion — search the file to confirm).

### Test

Open the Template Review page → confirm the printer icon is gone and no layout shift in the header.

---

# Part B — PIP

## B1. No Notification When PIP Is Created as DRAFT

### Current Behavior

`PipServiceImpl.createPip` at lines 53–94 always publishes `PIP_CREATED` to the target employee, even though the new PIP is hard-coded to `PipStatus.DRAFT` on line 69. Drafts shouldn't notify the employee — that's the whole point of a draft.

### Scope

- `epms_backend/src/main/java/ace/org/epms_backend/service/impl/PipServiceImpl.java`

### Change

Wrap the notification block in a status check so it only fires for non-draft creation paths. In practice, `createPip` *always* writes `DRAFT`, so the cleanest fix is to drop the notification publish from `createPip` entirely and emit it later, when the PIP transitions out of draft.

**Step 1 — remove the publish from `createPip`** (lines 82–91). Keep the audit log (lines 74–80) — drafts still produce an audit row.

**Step 2 — locate the "activate" / "publish draft" transition.** Look in the same file for the method that changes status from `DRAFT` to `ACTIVE` (likely `updatePip` or a dedicated `activatePip` method around lines 96+, or in `PipReviewServiceImpl`). When status flips to `ACTIVE`, fire the notification there:

```java
if (oldStatus == PipStatus.DRAFT && pip.getStatus() == PipStatus.ACTIVE) {
    eventPublisher.publishEvent(NotificationEvent.builder()
        .recipientId(pip.getEmployee().getId())
        .senderId(pip.getManager().getId())
        .type(NotificationType.PIP_CREATED)
        .title("PIP Activated")
        .message("A Performance Improvement Plan has been activated for you.")
        .referenceType(ReferenceType.PIP)
        .referenceId(pip.getPipId())
        .actionUrl("/pips/" + pip.getPipId())
        .build());
}
```

If your codebase doesn't have a clear "draft → active" transition method, the safer minimum change is to just guard the existing publish in `createPip` with `if (pip.getStatus() != PipStatus.DRAFT)`. Given that `createPip` hard-codes `DRAFT`, this effectively never fires from `createPip` — the notification responsibility moves cleanly to wherever drafts get published. Pick whichever is closer to your real flow.

### Test

- Create a PIP via the UI → confirm the target employee receives **no** notification. Confirm the PIP shows up in HR/Manager views as `DRAFT`.
- Transition the PIP to `ACTIVE` → confirm the employee receives the "PIP Activated" notification.
- Existing edit/extend/finalize notifications continue to fire normally.

---

## B2. "My PIPs" Entry Point for Manager and HR

### Current Behavior

`PipListPage.tsx` already supports two modes:

- HR/Admin → `useGetPipsQuery(undefined)` → all PIPs.
- Everyone else → `useGetPipsByInvolvedUserQuery(user?.id)` → PIPs where the user is *either* the employee or the manager.

A manager who has a PIP themselves can theoretically see it through the "involved user" mode — but the moment they have any role to manage, the page treats them as a manager and their *own* PIPs get buried in the mixed list. HR sees the full pile across the company, so finding their own is even harder.

### Desired Behavior

Give managers and HR a clear, separate **My PIPs** entry point that shows only PIPs where they are the **employee** (not the manager).

### Scope

- `epms_frontend/src/pages/pip/PipListPage.tsx` — add a "Scope" tab/filter (All / My PIPs).
- `epms_frontend/src/components/layout/Sidebar.tsx` (or wherever your nav lives) — add a "My PIPs" link for managers and HR.
- No backend change required — `useGetPipsByInvolvedUserQuery` already returns the relevant set; you just filter client-side to PIPs where `pip.employeeId === currentUser.id`.

### Change — Option 1: Tab on the existing list page (simpler)

In `PipListPage.tsx`:

1. Add a new state:
   ```ts
   const [scope, setScope] = useState<'ALL' | 'MINE'>('ALL');
   ```

2. Render a small two-button segmented control above the existing filters:
   ```tsx
   <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 mb-3">
     <button
       onClick={() => setScope('ALL')}
       className={`px-4 py-2 text-xs font-bold rounded-lg ${scope === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
     >
       {isHR || isAdmin ? 'All PIPs' : 'Team PIPs'}
     </button>
     <button
       onClick={() => setScope('MINE')}
       className={`px-4 py-2 text-xs font-bold rounded-lg ${scope === 'MINE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
     >
       My PIPs
     </button>
   </div>
   ```

3. When `scope === 'MINE'`, ensure the data source is the involved-user query (HR/Admin won't get their own by default, so force it for the My tab):
   ```ts
   const myPipsResponse = useGetPipsByInvolvedUserQuery(user?.id || 0, { skip: !user?.id });
   const visiblePips = scope === 'MINE'
     ? (myPipsResponse.data?.data || []).filter(pip => pip.employeeId === user?.id)
     : allPips;
   ```

4. Continue the existing dept/status/severity filtering on `visiblePips` instead of `allPips`.

5. Hide the "Create PIP" button when `scope === 'MINE'` — you don't create a PIP for yourself.

### Change — Option 2: Dedicated page (cleaner separation)

If you'd rather not crowd the list page, add a new route `/pip/mine` that mounts a thin wrapper around `PipListPage` with a fixed `scope='MINE'` prop. Add a sidebar entry **My PIPs** (visible to all logged-in users — not just managers/HR; anyone might be on a PIP). Use the icon `Activity` or `Target` for visual consistency.

### Sidebar Entry (either option)

Add to your nav config (Sidebar component or routes file), visible to roles `MANAGER` and `HR` (and `EMPLOYEE` if you want a third class of user to also access it):

```tsx
{ label: 'My PIPs', icon: Activity, path: '/pip?scope=mine', roles: ['MANAGER', 'HR', 'EMPLOYEE'] },
```

If using Option 1's tab approach, the `?scope=mine` query param can pre-select the tab on landing.

### Test

- Log in as a manager who has a PIP assigned to them as the **employee** → click "My PIPs" → see only their own PIP, not their team's.
- Log in as the same manager → click "Team PIPs" / "All PIPs" → see PIPs they manage, with their own optionally listed too.
- Log in as HR → "My PIPs" tab shows only their own PIPs (if any), separately from the global pile.
- Log in as a plain employee who is on a PIP → tab/link still works; their existing involved-user query already covers this case.

### Recommendation

Go with **Option 1** (tab on the existing page). It's about 30 lines of code, reuses the existing filters/dept dropdown/sorting, and avoids route sprawl. Add the sidebar link pointing to `/pip?scope=mine` so users land on the right tab from the navigation.

---

# Order of Work

1. **A3 (remove print button)** — 2-minute change, ship first.
2. **A2 (gate delete button)** — frontend gate + optional backend guard.
3. **A1 (cascade form-set delete)** — backend service change, contained.
4. **B1 (no draft notification)** — backend, single conditional.
5. **B2 (My PIPs tab + sidebar)** — frontend only, biggest piece but no API change.

Estimated total effort: **~1 day**. Each item is small, but they touch multiple files.

---

# Acceptance Criteria

- **A1.** Deleting a form set with attached forms succeeds and cascades; an assigned form set still returns 409.
- **A2.** The Delete Cycle button (action bar + card) is hidden whenever the cycle is `isActive`, `ARCHIVED`, or `isAssigned`. Backend `DELETE /appraisal-cycles/{id}` returns 409 on active/archived cycles even if the UI is bypassed.
- **A3.** The Print icon button on the Template Review page is removed. No layout regression.
- **B1.** Creating a PIP (which is always `DRAFT`) produces no `PIP_CREATED` notification to the target employee. Transitioning a PIP from `DRAFT` to `ACTIVE` *does* send the notification.
- **B2.** A "My PIPs" affordance is visible to MANAGER and HR users (and ideally EMPLOYEE), filtering the list to PIPs where they are the employee. The "Create PIP" action is hidden on that view.

No DB migration needed for any of the five items.
