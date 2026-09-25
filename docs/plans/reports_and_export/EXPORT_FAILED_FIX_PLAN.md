# Implementation Plan: Fix "Export Failed" Toast on PDF Form Exports

## Context

After adding the Export PDF buttons to the Self-Assessment and Manager Evaluation pages, clicking the button produces this exact sequence:

1. ~1 second delay (backend renders the PDF).
2. The PDF briefly appears (browser opens it in its built-in viewer).
3. A red toast: **"Export failed."**
4. No file ends up in the Downloads folder.

The backend is working correctly. The PDF you see is the real, fully-rendered Jasper output, served with the right headers (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`). The bug is entirely in the **frontend** download handler — specifically the `downloadReport` mutation in `epms_frontend/src/features/report/reportApi.ts`.

## Root Cause

Two problems happening simultaneously inside the existing `responseHandler`:

```ts
responseHandler: async (response: Response) => {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName || "report.pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
},
```

**Problem 1 — the mutation rejects even on success.**
The handler returns `undefined` (no `return` statement). In current RTK Query, when a function-style `responseHandler` returns `undefined`, `fetchBaseQuery` treats it as a parse failure and the mutation rejects. `.unwrap()` then throws, which is caught by the `try/catch` on the button and fires `toast.error('Export failed')`.

**Problem 2 — the browser cancels the download.**
`link.remove()` runs synchronously, milliseconds after `link.click()`. Some browsers (and PDF-viewer integrations) race-condition the download trigger: by the time the browser decides whether to save or preview, the anchor is gone and the `blob:` URL hand-off is interrupted. The result is the brief PDF preview + nothing in Downloads. There is also no `URL.revokeObjectURL(url)` call, which is a memory leak.

These two bugs explain every part of the symptom: the file is generated (backend OK), is briefly visible (blob is valid PDF), is not saved (download cancelled), and the toast fires (responseHandler returned `undefined`).

This bug affects **all** consumers of `downloadReport`, not just the new form exports — it was masked in the past because some browsers happen to complete the download anyway, and users may have missed the failure toast.

## Scope of Files

**Frontend only.**
- `epms_frontend/src/features/report/reportApi.ts` — replace the `downloadReport` mutation.

No backend changes. No DB changes.

---

## Step 1 — Replace the `downloadReport` Mutation

Open `epms_frontend/src/features/report/reportApi.ts`. Find the existing `downloadReport` mutation (currently uses `query` with an inline `responseHandler`). Replace it with the `queryFn`-based implementation below:

```ts
downloadReport: builder.mutation<void, { endpoint: string; params?: any; fileName: string }>({
  queryFn: async ({ endpoint, params, fileName }, _api, _extra, fetchWithBQ) => {
    const result = await fetchWithBQ({
      url: `/reports/${endpoint}/download`,
      params,
      responseHandler: (response) => response.blob(),
      cache: 'no-cache',
    });

    if (result.error) {
      return { error: result.error };
    }

    const blob = result.data as Blob;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'report.pdf');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Let the browser register the download before tearing down the anchor
    // and revoking the blob URL.
    setTimeout(() => {
      link.remove();
      window.URL.revokeObjectURL(url);
    }, 100);

    return { data: undefined };
  },
}),
```

Three meaningful changes vs. the old code:

1. **Returns `{ data: undefined }` explicitly** on success → `.unwrap()` resolves → no more spurious "Export failed" toast.
2. **`setTimeout(..., 100)` delays `link.remove()` and `URL.revokeObjectURL(url)`** so the browser has time to commit the download. The 100 ms is conservative — even 0 ms (next tick) usually works, but 100 ms is safe across browser/PDF-plugin combinations without being perceptible to the user.
3. **Errors are surfaced cleanly.** If the backend returns 500/403/404, `result.error` is set and the mutation returns `{ error: result.error }`. The caller's `.unwrap()` rejects with the backend message in `err.data` — your existing `toast.error(err?.data?.message || 'Export failed')` will then show the real reason.

The exported hook `useDownloadReportMutation` stays the same, so no caller needs to be touched.

---

## Step 2 — Sanity Check the Callers (No Changes Expected)

The two new buttons in `SelfAssessment.tsx` and `ManagerEvaluation.tsx` call the mutation like this:

```ts
await downloadReport({
  endpoint: 'self-assessment',
  params: { appraisalId: Number(id), format: 'pdf' },
  fileName: `Self_Assessment_${formData.employeeName ?? 'Form'}.pdf`,
}).unwrap();
```

No changes needed. The new `queryFn` accepts the same arguments and the hook signature is identical.

One small hardening worth doing — if `formData.employeeName` could contain characters that are illegal in filenames (`/ \ : * ? " < > |`), sanitize it before composing the filename:

```ts
const safeName = (formData.employeeName ?? 'Form').replace(/[\\/:*?"<>|]/g, '_');
fileName: `Self_Assessment_${safeName}.pdf`,
```

Optional — most browsers strip illegal chars themselves, but this is defensive.

---

## Step 3 — Verify (No New Code, Just Steps)

After saving `reportApi.ts`, Vite hot-reloads automatically. Test:

1. Open a finalized appraisal's self-assessment page → click **Export PDF**.
2. Confirm the file lands in Downloads with the correct name (e.g. `Self_Assessment_John_Doe.pdf`) and opens as a valid PDF.
3. Confirm no toast fires on success.
4. Repeat on the manager evaluation page from a manager account.

**Negative test:** open a non-finalized appraisal, bypass the disabled button via DevTools (`document.querySelector('button[disabled]').disabled = false`), and click. The backend will return 409 with `"Self-assessment form can only be exported after the appraisal is approved or finalized."` The toast should now show that real message instead of the generic "Export failed."

**Regression test:** open any existing report (KPI Achievement, Appraisal Status, Performance Trend, etc.) and click its download button. Confirm those still work — the mutation change is global, but the contract is unchanged so existing callers are unaffected.

---

## Step 4 — Optional Cleanup

If you want to fully delete the dead "Export PDF" button at lines 90–93 of `ResultPage.tsx` (it has no `onClick`), now is a good time. Either:

- Wire it up the same way (calling `downloadReport` with a new endpoint like `result` or `performance-report`, if you want a report PDF for the Result Page), or
- Remove the button entirely until that endpoint exists, to avoid confusing users.

This is out of scope for the immediate bug fix but worth noting since it's the same dead-button pattern.

---

## Acceptance Criteria

- Clicking **Export PDF** on a finalized Self-Assessment page downloads a valid PDF to the user's Downloads folder.
- Clicking **Export PDF** on a finalized Manager Evaluation page downloads a valid PDF to the user's Downloads folder.
- No "Export failed" toast appears on a successful export.
- When the backend returns a real error (409, 500, 403), the toast shows the backend's actual message rather than the generic fallback.
- All other existing report downloads (KPI Achievement, Appraisal Status, Feedback 360, etc.) continue to work unchanged.
- The blob URL is revoked after the download triggers (no memory leak).

---

## Why This Is the Right Fix

The current `query` + `responseHandler` pattern fights RTK Query's contract — `responseHandler` is meant to **parse and return** the response body, not perform side effects. Moving the side effect (DOM-driven file save) into `queryFn` is the canonical way to do file downloads in RTK Query: the parsing step returns the blob cleanly, and the side effect runs in code that controls its own return value. The `setTimeout` is a pragmatic workaround for the well-known browser race condition with synthetic `<a>` clicks on `blob:` URLs and is used in essentially every "download a blob" snippet you'll find in production codebases.
