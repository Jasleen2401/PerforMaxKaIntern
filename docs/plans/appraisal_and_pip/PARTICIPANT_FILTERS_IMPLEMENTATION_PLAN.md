# Participant Filters Implementation Plan

## Goal

Add filters to the participants box on the appraisal cycle review page so HR/admin users can narrow participants by department and appraisal status.

## Target File

- `epms_frontend/src/pages/appraisal/AppraisalList.tsx`

## Current Behavior

The cycle detail view already shows a participants table using `appraisalsByCycle`.

Current table filtering only supports text search:

- Employee name
- Manager name

The table already displays the fields needed for the requested filters:

- `departmentName`
- `status`

Because these values are already available in the frontend response, no backend change should be required.

## Proposed UI Changes

Add two dropdown filters beside the existing search input in the participants header:

- Department dropdown
  - Default option: `All Departments`
  - Options generated from unique participant `departmentName` values

- Status dropdown
  - Default option: `All Statuses`
  - Options generated from unique participant `status` values
  - Display labels should replace underscores with spaces, for example `HR_APPROVED` becomes `HR APPROVED`

Add an optional `Clear filters` button when any filter/search is active.

## State Changes

Add two React states near the existing `searchTerm` state:

```tsx
const [departmentFilter, setDepartmentFilter] = React.useState('ALL');
const [statusFilter, setStatusFilter] = React.useState('ALL');
```

## Derived Data

Inside the selected cycle detail block, derive dropdown options from `appraisalsByCycle`.

```tsx
const departmentOptions = Array.from(
  new Set(
    appraisalsByCycle
      .map((a: any) => a.departmentName)
      .filter(Boolean)
  )
).sort();

const statusOptions = Array.from(
  new Set(
    appraisalsByCycle
      .map((a: any) => a.status)
      .filter(Boolean)
  )
).sort();
```

Then create a single filtered list:

```tsx
const normalizedSearch = searchTerm.trim().toLowerCase();

const filteredAppraisalsByCycle = appraisalsByCycle.filter((a: any) => {
  const matchesSearch =
    !normalizedSearch ||
    a.employeeName?.toLowerCase().includes(normalizedSearch) ||
    a.managerName?.toLowerCase().includes(normalizedSearch);

  const matchesDepartment =
    departmentFilter === 'ALL' || a.departmentName === departmentFilter;

  const matchesStatus =
    statusFilter === 'ALL' || a.status === statusFilter;

  return matchesSearch && matchesDepartment && matchesStatus;
});
```

## Rendering Changes

Replace the current inline table filter:

```tsx
appraisalsByCycle.filter(...).map(...)
```

with:

```tsx
filteredAppraisalsByCycle.map(...)
```

Update the participants count:

```tsx
const isParticipantFilterActive =
  normalizedSearch ||
  departmentFilter !== 'ALL' ||
  statusFilter !== 'ALL';
```

Display:

- `Participants (24)` when no filter/search is active
- `Participants (8 of 24)` when filters/search are active

## Empty State

If `filteredAppraisalsByCycle.length === 0`, render a single table row:

```tsx
<tr>
  <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>
    No participants match the selected filters.
  </td>
</tr>
```

## Reset Behavior

Reset filters when the user leaves the selected cycle detail view:

- Back to cycles
- Selecting another cycle
- Switching tabs, if desired

Recommended helper:

```tsx
const resetParticipantFilters = () => {
  setSearchTerm('');
  setDepartmentFilter('ALL');
  setStatusFilter('ALL');
};
```

Use this helper before setting `selectedCycleId` to `null`, and when opening a different cycle.

## Styling Notes

Use the existing styling style from the search input:

- Background: `#F5F6F8`
- Border: `0.5px solid #E0E2E8`
- Border radius: `8`
- Font size: `12`

Suggested layout:

```tsx
<div className="flex flex-col sm:flex-row gap-2">
  {/* search input */}
  {/* department select */}
  {/* status select */}
  {/* clear filters button */}
</div>
```

This keeps the controls stacked on mobile and inline on larger screens.

## Verification Checklist

- Search by employee name still works.
- Search by manager name still works.
- Department dropdown filters participants correctly.
- Status dropdown filters participants correctly.
- Combined search, department, and status filters work together.
- Participant count updates correctly.
- Empty filtered result shows a clear message.
- Back to cycles resets filters.
- Mobile layout does not overflow.

