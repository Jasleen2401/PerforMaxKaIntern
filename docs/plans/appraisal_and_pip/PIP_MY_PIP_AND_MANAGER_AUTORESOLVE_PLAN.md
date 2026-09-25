# Implementation Plan: PIP — Trim "My PIP" Page, Drop Sidebar Link, Auto-Resolve Manager

Three changes to the PIP module. None requires a DB migration; all are contained in `PipListPage.tsx`, `Sidebar.tsx`, `PipCreatePage.tsx`, and `PipServiceImpl.java`.

---

## Change 1 — Hide Department Filter / Quarterly Chart / Insights on "My PIPs"

### Current Behavior

In `epms_frontend/src/pages/pip/PipListPage.tsx`:

- **Department dropdown** (lines 197–201): shown whenever `(isHR || isAdmin || isManager)`.
- **Quarterly success rate chart** (lines 317–336): part of the Insights panel, shown whenever `(isHR || isAdmin || isManager)`.
- **Performance insights box** (lines 339–360): same panel, same gate.

When the user is viewing their own PIPs (`scope === 'MINE'`), none of these elements make sense — they're aggregate views over a team or the company, not over a single person's PIP history.

### Desired Behavior

When `scope === 'MINE'`, hide all three (department dropdown, quarterly chart, performance insights). When `scope === 'ALL'` (the team/all view for managers/HR), keep everything as it is today.

### Scope

- `epms_frontend/src/pages/pip/PipListPage.tsx`

### Change

There are two ways to do this. Pick whichever you prefer.

**Option A — tighten the existing gate (recommended, minimal diff)**

Add `scope === 'ALL'` to each of the three conditions:

1. **Department dropdown** (line 197):
   ```tsx
   {(isHR || isAdmin || isManager) && scope === 'ALL' && (
     <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={selectStyle}>
       {departments.map(d => <option key={d} value={d}>{d}</option>)}
     </select>
   )}
   ```

2. **Insights panel wrapper** (line 314):
   ```tsx
   {(isHR || isAdmin || isManager) && scope === 'ALL' && (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
       {/* Chart + Insights stay unchanged inside */}
     </div>
   )}
   ```

That's the entire change. Both the Quarterly chart and the Performance insights box are inside the same outer wrapper, so one extra clause hides both.

**Option B — explicit `isMineScope` helper**

If you'd rather not repeat the `scope === 'ALL'` check, declare a const near the top of the component:

```tsx
const showAggregateViews = (isHR || isAdmin || isManager) && scope === 'ALL';
```

Then use `{showAggregateViews && (...)}` in both places. Cleaner if you anticipate adding a third aggregate panel later.

### Defensive Note

When `scope === 'MINE'` and `deptFilter` was previously set to a non-default value, leftover filter state would silently still apply on switch back to `ALL`. Reset it when toggling into the My scope:

```tsx
const handleScopeChange = (next: 'ALL' | 'MINE') => {
  setScope(next);
  if (next === 'MINE') setDeptFilter('All Departments');
};
```

Then wire the two scope buttons (lines 143 and 158) to `handleScopeChange` instead of `setScope` directly.

### Test

- Land on `/pip` as HR → see department dropdown + chart + insights.
- Click **My PIPs** → all three disappear; the table and metric cards stay.
- Click back to **All PIPs** → all three reappear.
- Repeat as a manager → same behavior.
- Land on `/pip` as a plain employee (no admin/manager/hr roles) → none of the three are shown either way; the scope nav itself is hidden.

---

## Change 2 — Remove "My PIPs" Link from Sidebar

### Current Behavior

`epms_frontend/src/components/Sidebar.tsx` line 47:

```tsx
{ label: "My PIPs", to: "/pip?scope=mine", icon: Activity, privilegedOnly: true },
```

And the active-state logic at lines 158–163 special-cases this entry. You want it gone — users will toggle into the My view from the in-page scope buttons instead.

### Scope

- `epms_frontend/src/components/Sidebar.tsx`

### Change

1. **Delete line 47** (the My PIPs nav item entry).

2. **Simplify the active-state logic at lines 158–163.** Once the entry is gone, the special-case for `item.label === "My PIPs"` is dead code. Either remove the branch entirely or leave only the generic `NavLink` matching. The replacement should collapse to:
   ```tsx
   // before:
   const isMyPips = item.label === "My PIPs";
   const isActive = isMyPips
     ? (location.pathname === "/pip" && location.search.includes("scope=mine"))
     : item.end
       ? (location.pathname === "/pip" && !location.search.includes("scope=mine"))
       : ...;

   // after — drop the My PIPs branch:
   const isActive = item.end
     ? (location.pathname === item.to)
     : location.pathname.startsWith(item.to);
   ```
   Double-check the `end: true` flag on the remaining PIP entry (line 46) still highlights correctly on plain `/pip`.

3. **Drop the `Activity` lucide import** if no other sidebar entry uses it. Search the file: `grep -n "Activity" Sidebar.tsx`. If the only hit was the deleted entry, remove `Activity` from the lucide import list at the top.

### Test

- Open the sidebar — only the single **PIP** entry appears for HR/admin/manager users.
- Click **PIP** → land on `/pip`, the All/Team scope tab is selected.
- Inside the page, click the **My PIPs** scope button → URL changes to `/pip?scope=mine`, the My view loads, and the sidebar's **PIP** entry remains highlighted (no separate sidebar item to look for).
- For users without manager/HR/admin roles, the in-page scope nav is still hidden (already enforced by `(isHR || isAdmin || isManager)` at line 141) — they only see their involved-user list, which is the same thing.

---

## Change 3 — Auto-Resolve Direct Manager from Reporting Line (Mirror Appraisal Pattern)

### Current Behavior

In `epms_frontend/src/pages/pip/PipCreatePage.tsx`:

- Step 1 of the create wizard asks the user to pick **Department → Target Employee → Reviewing Manager** (lines 191–214).
- The Reviewing Manager dropdown is built client-side at line 137:
  ```ts
  const filteredManagers = useMemo(() => !employees ? [] : employees.filter(emp =>
    (selectedDepartmentId === 0 || emp.currentDepartmentId === selectedDepartmentId) &&
    emp.roles.some(r => r.toUpperCase().includes('MANAGER'))
  ), [employees, selectedDepartmentId]);
  ```
  It returns *any* employee with a MANAGER role in the same department — not necessarily the target employee's actual direct manager. HR can pick the "wrong" manager by accident, or there may be no MANAGER-role user in that department even though the employee has a real reporting line.

Meanwhile, the appraisal module already does the right thing in `AppraisalServiceImpl` (lines 99–113):

```java
manager = reportingLineRepo.findFirstByEmployee_IdAndIsActiveTrue(employeeId)
    .map(ReportingLine::getManager)
    .orElseThrow(() -> new RuntimeException(
        "No active manager found for employee: " + employee.getStaffName()));
```

It looks up the active row in the `reporting_line` table where the target is the subordinate, and uses *that* manager. That's the pattern to mirror in PIP.

### Desired Behavior

The PIP create flow should:

1. Let HR/admin pick **only the employee** (optionally narrowed by department, like today).
2. Auto-resolve the direct manager from `ReportingLine` server-side.
3. Show the resolved manager as a **read-only display** on the form so HR can verify before submitting (no chance to override, just transparency).
4. If the employee has no active reporting line, surface a clear error before the form even submits ("Cannot create a PIP — this employee has no active reporting line. Set the reporting line first.").

### Scope

**Backend** (`epms_backend/`)
- `src/main/java/ace/org/epms_backend/dto/pip/PipCreateRequest.java` — make `managerId` optional (or remove it; either works).
- `src/main/java/ace/org/epms_backend/service/impl/PipServiceImpl.java` — resolve the manager from `ReportingLine` if not provided in the request, throw if missing.
- `src/main/java/ace/org/epms_backend/repository/employee/ReportingLineRepository.java` — confirm `findFirstByEmployee_IdAndIsActiveTrue(Long)` exists (it already does; the appraisal flow uses it).

**Frontend** (`epms_frontend/`)
- `src/pages/pip/PipCreatePage.tsx` — remove the manager dropdown; add a read-only resolved-manager display; stop sending `managerId` in the create payload.
- `src/features/employee/employeeapi.ts` (or wherever the reporting line is exposed) — add a lightweight `useGetDirectManagerQuery(employeeId)` that hits a small backend endpoint (or reuse an existing employee-detail query if it already returns the manager).

### Backend Change

**Step A.** In `PipCreateRequest.java`, drop the `@NotNull` (or `@Min(1)`) on `managerId` and add a comment that it's auto-resolved if omitted. The DTO continues to accept it for any API caller that still wants to override (HR may legitimately need this in rare cases — e.g., interim manager).

**Step B.** In `PipServiceImpl.createPip` (around lines 53–94), replace the current manager lookup with a conditional auto-resolve. Before:

```java
Employee manager = employeeRepository.findById(request.getManagerId())
    .orElseThrow(() -> new UserNotFoundException("Manager not found"));
```

After:

```java
Employee manager;
if (request.getManagerId() != null && request.getManagerId() > 0) {
    manager = employeeRepository.findById(request.getManagerId())
        .orElseThrow(() -> new UserNotFoundException("Manager not found"));
} else {
    manager = reportingLineRepo.findFirstByEmployee_IdAndIsActiveTrue(employee.getId())
        .map(ReportingLine::getManager)
        .orElseThrow(() -> new InvalidStateException(
            "Cannot create PIP — no active reporting line found for "
            + employee.getStaffName() + ". Set the reporting line first."));
}
```

Inject `reportingLineRepo` into `PipServiceImpl` (constructor field — `private final ReportingLineRepository reportingLineRepo;`).

**Step C.** Optionally expose a small **GET endpoint** for the frontend to preview the resolved manager before submit:

```java
// in some controller (e.g. EmployeeController or a new ReportingLineController)
@GetMapping("/api/v1/employees/{id}/manager")
@PreAuthorize("hasAnyRole('HR','ADMIN','MANAGER')")
public ResponseEntity<ApiResponse<EmployeeSummary>> getDirectManager(@PathVariable Long id) {
    Employee manager = reportingLineRepo.findFirstByEmployee_IdAndIsActiveTrue(id)
        .map(ReportingLine::getManager)
        .orElse(null);
    return ResponseEntity.ok(ApiResponse.success(manager != null
        ? employeeMapper.toSummary(manager) : null));
}
```

Return `null` when no reporting line exists so the frontend can show "No reporting manager assigned" without a 404.

### Frontend Change

In `PipCreatePage.tsx`:

**Step 1 — drop the Reviewing Manager dropdown.** Delete the block at lines 205–214. Remove the `managerId` field from the create payload (line 77):

```ts
const [formData, setFormData] = useState<PipCreateRequest>({
  employeeId: 0,
  // managerId removed — backend resolves from reporting line
  startDate: '',
  endDate: '',
  severity: PipSeverity.STANDARD,
  reason: '',
  scheduledReviewDates: []
});
```

**Step 2 — remove the `filteredManagers` memo** (line 137) and the `managerId` reset in `handleDepartmentChange` (line 133). Both become dead code.

**Step 3 — relax the validation** in `submitForm` (line 87):
```ts
if (!formData.employeeId || !formData.startDate || !formData.endDate || !formData.reason) {
  setError('Please complete all required fields: Employee, Dates, Reason.');
  scrollToStep(1); return;
}
```
(Removed the `formData.managerId` check.)

**Step 4 — add a read-only "Direct Manager" display.** Where the manager dropdown was, render the resolved-manager preview:

```tsx
const { data: directManager, isFetching: isResolvingManager } =
  useGetDirectManagerQuery(formData.employeeId, { skip: !formData.employeeId });

<div>
  <label style={labelStyle}>Direct Manager (auto-resolved)</label>
  <div style={{ ...inputStyle, background: '#F0F2F6', color: directManager ? '#111827' : '#9EA3B0', cursor: 'not-allowed', display: 'flex', alignItems: 'center', minHeight: 36 }}>
    {!formData.employeeId
      ? 'Pick an employee first…'
      : isResolvingManager
        ? 'Resolving…'
        : directManager
          ? `${directManager.staffName} (${directManager.employeeCode})`
          : '⚠ No active reporting line — set one before creating a PIP'}
  </div>
</div>
```

**Step 5 — block submit when no manager can be resolved.** Disable the Activate / Save Draft buttons when an employee is selected but `directManager` is null:

```ts
const canSubmit = !!directManager;
```
Pass this through to both submit buttons' `disabled` attribute (in addition to the existing `isCreating || isActivating`).

### Test

- Open Create PIP wizard → only Employee picker appears in Step 1 (no Manager dropdown).
- Pick an employee with an active reporting line → "Direct Manager" field shows their actual manager from the reporting line, read-only.
- Pick an employee with no reporting line → field shows the warning, Save/Activate buttons are disabled.
- Submit successfully → backend creates the PIP with the resolved manager. `pip.managerId` in the DB matches the reporting-line manager, not just any MANAGER-role user in the department.
- POST `/api/v1/pip` directly with no `managerId` and a valid `employeeId` → 201 + the PIP record has the right manager.
- POST `/api/v1/pip` with `employeeId` of a user with no reporting line → 400 with the clear error message.
- Existing PIPs created the old way are untouched (no migration needed).

---

## Order of Work

1. **Change 1** — three conditional flags in `PipListPage.tsx`. Lowest risk, ship first.
2. **Change 2** — delete one sidebar entry, simplify the active-state logic. Smallest diff.
3. **Change 3** — backend resolve + DTO relax (Step A/B), then frontend dropdown removal (Steps 1–4), then read-only display (Step 4) and submit gate (Step 5).

Estimated effort: **~0.5 day** total. Most of the time is in Change 3 because of the small backend endpoint + the read-only manager UI, but it's straightforward — nothing depends on data not already in your schema.

---

## Acceptance Criteria

- **Change 1.** In the My PIPs view (`scope === 'MINE'`), the department dropdown, Quarterly success rate chart, and Performance insights box are all hidden. The metric cards, scope nav, table, and other filters still render. Switching back to All/Team restores them.
- **Change 2.** The sidebar shows only one PIP-related entry ("PIP"). The active-state highlight still works for `/pip` and stays active when the in-page scope is toggled. No `Activity` import is left dangling.
- **Change 3.** The PIP create form does not have a Reviewing Manager dropdown. Picking an employee auto-fills a read-only Direct Manager field from the reporting line. Submit is blocked when no reporting line exists. The backend `createPip` accepts a request without `managerId` and resolves it from `ReportingLine` (or returns a clear 400 if missing). Optional manual override via API still works for HR/admin who explicitly pass `managerId`.
- No DB migration needed for any of the three.
