# Signature Capture Migration — Implementation Plan

**For: AI agent / engineer implementing the change**
**Repo:** `EmployeePerformanceManagementSystem-EPMS-`
**Scope:** appraisal sign-off flow only (backend + frontend)

---

## 1. Goal

Replace the photo-upload signature input on the appraisal Result page with a draw-on-canvas signature pad (`react-signature-canvas`). Keep the existing multipart endpoints and the file-on-disk storage scheme unchanged — only the **frontend capture method** changes from "pick a photo" to "draw with mouse/finger".

While doing this, fix a pre-existing bug: the `employee_sign_comment` and `manager_sign_comment` columns are currently overloaded — they hold *either* the signature image's file path *or* a textual sign-off comment, whichever endpoint was called last. Resolve by **keeping the existing columns as the image file path** and **adding two new columns** for the textual notes.

## 2. Background — what exists today

### Backend (Spring Boot)
- `epms_backend/src/main/java/ace/org/epms_backend/controller/AppraisalController.java`
  - Lines 146–166: `POST /api/v1/appraisals/{id}/employee-sign-off?comment=…` and `manager-sign-off` — write the `comment` query param to `*SignComment` and stamp `*SignedAt`.
  - Lines 181–199: `POST /api/v1/appraisals/{id}/employee-signature` (and `manager-signature`) — accept `multipart/form-data` with key `"file"`, save to `uploads/signatures/`, write the returned path `/uploads/signatures/<name>` to `*SignComment` and stamp `*SignedAt`.
- `service/impl/AppraisalServiceImpl.java`
  - Line 355 `employeeSignOff(Long id, String comment)` — `setEmployeeSignComment(comment)` (writes text).
  - Line 395 `managerSignOff(...)` — same shape.
  - Line 475 `saveSignatureFile(...)` — writes file, returns `/uploads/signatures/<file>`.
  - Lines 493 / 508 `uploadEmployeeSignature` / `uploadManagerSignature` — overwrite `*SignComment` with the file path.
- `model/appraisal/Appraisal.java` lines 65–69: columns `employee_sign_comment` and `manager_sign_comment` (currently overloaded).
- `config/CorsConfig.java`: serves `/uploads/**` from `${user.dir}/uploads/`.

### Frontend (React + RTK Query)
- `epms_frontend/src/features/appraisal/appraisalApi.ts` lines 407–431: `uploadEmployeeSignature` / `uploadManagerSignature` mutations — wrap a `File` in `FormData` under key `"file"`, POST to the multipart endpoints, invalidate `Appraisal`.
- `epms_frontend/src/pages/appraisal/ResultPage.tsx`:
  - Lines 33–36: four `useState` for file + preview per role.
  - Lines 54–63: `handleEmployeeSign` / `handleManagerSign` — call the mutations.
  - Lines 225–253 (employee) and 268–301 (manager): the sign-off cards — `<input type="file" accept="image/*">` overlaid on a 120px-tall preview box, plus a submit button. On already-signed appraisals, shows `<img src={\`http://localhost:8080${appraisal.employeeSignComment}\`}>`.
- `epms_frontend/src/types/appraisal.ts`: `AppraisalResponse` type — has `employeeSignComment?: string`, `managerSignComment?: string`, `employeeSignedAt?`, `managerSignedAt?`.
- `epms_frontend/src/pages/appraisal/SelfAssessment_mine.tsx` lines 256–271: a legacy signature panel using base64 dataURL. **Leave alone** — it's not the target of this migration; if it's not on a live route, deletion is a separate cleanup.

## 3. Change summary

| # | File | Change |
|---|---|---|
| 1 | `epms_backend/.../model/appraisal/Appraisal.java` | Add two columns: `employeeSignNote`, `managerSignNote` (TEXT) |
| 2 | `epms_backend/.../service/impl/AppraisalServiceImpl.java` | In `employeeSignOff` and `managerSignOff`, write the `comment` to the new `*SignNote` column instead of `*SignComment` |
| 3 | `epms_backend/.../dto/appraisal/AppraisalResponse.java` | Add `employeeSignNote` and `managerSignNote` String fields |
| 4 | `epms_backend/.../mapper/AppraisalMapper.java` | Add `@Mapping` lines for the two new fields |
| 5 | `epms_frontend/package.json` | Add `react-signature-canvas` + `@types/react-signature-canvas` |
| 6 | `epms_frontend/src/components/appraisal/SignaturePad.tsx` | **NEW** — canvas wrapper that exports a `File` |
| 7 | `epms_frontend/src/types/appraisal.ts` | Add `employeeSignNote?: string` and `managerSignNote?: string` |
| 8 | `epms_frontend/src/pages/appraisal/ResultPage.tsx` | Swap `<input type="file">` for `<SignaturePad>`; add a safety check around the rendered `<img>` so legacy text values don't try to render as URLs |

No DB migration script is needed — `spring.jpa.hibernate.ddl-auto=update` will add the two columns automatically on next backend boot.

## 4. Detailed steps

### Step 1 — Backend: add two columns to the `Appraisal` entity

**File:** `epms_backend/src/main/java/ace/org/epms_backend/model/appraisal/Appraisal.java`

After the existing block (around line 65–69):

```java
@Column(name = "employee_sign_comment")
private String employeeSignComment;

@Column(name = "manager_sign_comment")
private String managerSignComment;
```

add:

```java
@Column(name = "employee_sign_note", columnDefinition = "TEXT")
private String employeeSignNote;

@Column(name = "manager_sign_note", columnDefinition = "TEXT")
private String managerSignNote;
```

**Semantic contract going forward:**
- `*SignComment` → file path to the signature image, e.g. `/uploads/signatures/employee_42_169…png` (unchanged from today).
- `*SignNote` → free-text acknowledgement note from the signing party.

### Step 2 — Backend: route the textual sign-off comment to the new column

**File:** `epms_backend/src/main/java/ace/org/epms_backend/service/impl/AppraisalServiceImpl.java`

Around line 367, change:
```java
if (comment != null) {
    appraisal.setEmployeeSignComment(comment);
}
```
to:
```java
if (comment != null) {
    appraisal.setEmployeeSignNote(comment);
}
```

Around line 400, the matching change for `managerSignOff`:
```java
if (comment != null) {
    appraisal.setManagerSignComment(comment);
}
```
becomes:
```java
if (comment != null) {
    appraisal.setManagerSignNote(comment);
}
```

**Do not change** `uploadEmployeeSignature` / `uploadManagerSignature` — they still write the file path to `*SignComment`, which is now the only thing that column does.

### Step 3 — Backend: expose the new fields in the response DTO

**File:** `epms_backend/src/main/java/ace/org/epms_backend/dto/appraisal/AppraisalResponse.java`

After the existing fields (around lines 41–42):
```java
private String employeeSignComment;
private String managerSignComment;
```

add:
```java
private String employeeSignNote;
private String managerSignNote;
```

### Step 4 — Backend: map the new fields in MapStruct

**File:** `epms_backend/src/main/java/ace/org/epms_backend/mapper/AppraisalMapper.java`

Below the existing explicit mappings (around lines 25–26):
```java
@Mapping(target = "employeeSignComment", source = "employeeSignComment")
@Mapping(target = "managerSignComment",  source = "managerSignComment")
```

add:
```java
@Mapping(target = "employeeSignNote", source = "employeeSignNote")
@Mapping(target = "managerSignNote",  source = "managerSignNote")
```

(MapStruct would auto-map by name, but staying consistent with the existing style is clearer.)

### Step 5 — Frontend: install `react-signature-canvas`

In `epms_frontend/`:

```bash
npm install react-signature-canvas
npm install --save-dev @types/react-signature-canvas
```

Lock the version in `package.json` to a recent release (≥ `1.0.6`).

### Step 6 — Frontend: create the SignaturePad component

**File (NEW):** `epms_frontend/src/components/appraisal/SignaturePad.tsx`

```tsx
import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, PenLine } from "lucide-react";

interface SignaturePadProps {
  /** Called when the user confirms — receives a PNG File ready to upload. */
  onSave: (file: File) => Promise<void> | void;
  /** Optional label shown on the confirm button. */
  saveLabel?: string;
  /** Disable the confirm button (e.g. while the parent's mutation is in flight). */
  isSaving?: boolean;
  /** Height of the drawing area; matches the existing 120px sign-off card. */
  height?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  saveLabel = "I Acknowledge & Sign",
  isSaving = false,
  height = 120,
}) => {
  const ref = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    ref.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = async () => {
    if (!ref.current || ref.current.isEmpty()) return;

    // Trim whitespace around the strokes, then export PNG.
    const dataUrl = ref.current.getTrimmedCanvas().toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], "signature.png", { type: "image/png" });

    await onSave(file);
    handleClear();
  };

  return (
    <div className="w-full">
      <div
        style={{
          height,
          background: "#FFFFFF",
          border: "0.5px dashed #E0E2E8",
          borderRadius: 10,
          overflow: "hidden",
          touchAction: "none", // critical for mobile drawing
        }}
      >
        <SignatureCanvas
          ref={ref}
          penColor="#111827"
          backgroundColor="rgba(255,255,255,0)"
          canvasProps={{
            style: { width: "100%", height: "100%", display: "block" },
          }}
          onEnd={() => setIsEmpty(ref.current?.isEmpty() ?? true)}
        />
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty || isSaving}
          className="inline-flex items-center gap-1 disabled:opacity-50"
          style={{
            background: "#F5F6F8",
            color: "#5A6070",
            border: "0.5px solid #E4E6EC",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Eraser size={12} /> Clear
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty || isSaving}
          className="flex-1 inline-flex items-center justify-center gap-1 disabled:opacity-50"
          style={{
            background: "#1A56DB",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 8,
            padding: "8px",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <PenLine size={12} /> {isSaving ? "Uploading…" : saveLabel}
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
```

Notes for the agent:
- `touchAction: "none"` is required so finger drags don't scroll the page.
- `getTrimmedCanvas()` crops whitespace; this keeps the rendered image compact on the result page.
- The component creates a synthetic `File` named `signature.png` — the existing backend code defaults to `.png` when no extension is present, so this is fully compatible.
- The component clears itself after a successful save so the parent doesn't need to manage a key/reset.

### Step 7 — Frontend: extend the type

**File:** `epms_frontend/src/types/appraisal.ts`

Find the interface that already declares `employeeSignComment?: string` and `managerSignComment?: string`. Add:
```ts
employeeSignNote?: string;
managerSignNote?: string;
```

### Step 8 — Frontend: wire the pad into ResultPage

**File:** `epms_frontend/src/pages/appraisal/ResultPage.tsx`

1. At the top of the file, add the import:
   ```tsx
   import SignaturePad from "../../components/appraisal/SignaturePad";
   ```

2. **Remove** the four `useState` lines (currently 33–36):
   ```tsx
   const [employeeSigFile, setEmployeeSigFile] = useState<File | null>(null);
   const [employeeSigPreview, setEmployeeSigPreview] = useState<string | null>(null);
   const [managerSigFile, setManagerSigFile] = useState<File | null>(null);
   const [managerSigPreview, setManagerSigPreview] = useState<string | null>(null);
   ```

3. **Replace** `handleEmployeeSign` and `handleManagerSign` (lines 54–63) with:
   ```tsx
   const handleEmployeeSign = async (file: File) => {
     try {
       await uploadEmployeeSignature({ id: id!, file }).unwrap();
       toast.success("Sign-off successful!");
     } catch (err: any) {
       toast.error(err?.data?.message || "Upload failed");
     }
   };

   const handleManagerSign = async (file: File) => {
     try {
       await uploadManagerSignature({ id: id!, file }).unwrap();
       toast.success("Manager sign-off successful!");
     } catch (err: any) {
       toast.error(err?.data?.message || "Upload failed");
     }
   };
   ```

4. **Employee signature block (around lines 225–252)** — replace the entire preview box + file input + submit button with:
   ```tsx
   <div>
     {appraisal.employeeSignComment ? (
       <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
         <img
           src={`http://localhost:8080${appraisal.employeeSignComment}`}
           alt="Employee Signature"
           style={{ maxHeight: 80, objectFit: "contain" }}
         />
       </div>
     ) : isEmployee && !appraisal.employeeSignedAt ? (
       <SignaturePad
         onSave={handleEmployeeSign}
         isSaving={isSigningEmployee}
         saveLabel="I Acknowledge & Sign"
       />
     ) : (
       <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
         <p style={{ fontSize: 12, color: "#9EA3B0" }}>Awaiting employee signature</p>
       </div>
     )}
     {appraisal.employeeSignedAt && (
       <p style={{ fontSize: 11, color: "#9EA3B0", textAlign: "center", marginTop: 6 }}>
         Signed {format(new Date(appraisal.employeeSignedAt), "dd/MM/yyyy HH:mm")}
       </p>
     )}
   </div>
   ```

5. **Manager signature block (around lines 256–298)** — same pattern, but keep the gate that prevents the manager from signing before the employee:
   ```tsx
   <div>
     {appraisal.managerSignComment ? (
       <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
         <img
           src={`http://localhost:8080${appraisal.managerSignComment}`}
           alt="Manager Signature"
           style={{ maxHeight: 80, objectFit: "contain" }}
         />
       </div>
     ) : (isManager || isPrivileged) && !appraisal.managerSignedAt ? (
       <>
         {!appraisal.employeeSignedAt ? (
           <div style={{ background: "#FAEEDA", border: "0.5px solid #F0D4A4", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#633806", display: "flex", alignItems: "center", gap: 6 }}>
             <Target size={12} /> Awaiting employee signature first
           </div>
         ) : (
           <SignaturePad
             onSave={handleManagerSign}
             isSaving={isSigningManager}
             saveLabel="Authorize Final Record"
           />
         )}
       </>
     ) : (
       <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
         <p style={{ fontSize: 12, color: "#9EA3B0" }}>Awaiting manager signature</p>
       </div>
     )}
     {appraisal.managerSignedAt && (
       <p style={{ fontSize: 11, color: "#9EA3B0", textAlign: "center", marginTop: 6 }}>
         Signed {format(new Date(appraisal.managerSignedAt), "dd/MM/yyyy HH:mm")}
       </p>
     )}
   </div>
   ```

6. **Remove the now-unused** `ImageIcon` import if it's not referenced elsewhere in the file.

### Step 9 — Safety net for any legacy text in `*SignComment`

If any existing rows in the dev DB had a text comment written to `employee_sign_comment` by the old buggy `employeeSignOff`, the `<img>` will fail to load it. The clean fix is a one-line guard in the rendering blocks above — only render `<img>` if the value looks like a path:

```tsx
appraisal.employeeSignComment?.startsWith("/uploads/")
```

Replace each `appraisal.employeeSignComment ? (` ternary head with `appraisal.employeeSignComment?.startsWith("/uploads/") ? (` (and the same for `managerSignComment`).

Optional one-shot cleanup of legacy rows (run on dev DB before testing):
```sql
UPDATE appraisals
   SET employee_sign_note = employee_sign_comment,
       employee_sign_comment = NULL
 WHERE employee_sign_comment IS NOT NULL
   AND employee_sign_comment NOT LIKE '/uploads/%';

UPDATE appraisals
   SET manager_sign_note = manager_sign_comment,
       manager_sign_comment = NULL
 WHERE manager_sign_comment IS NOT NULL
   AND manager_sign_comment NOT LIKE '/uploads/%';
```

## 5. Out of scope (do **not** change in this PR)

- The multipart endpoints, the on-disk storage, and the static `/uploads/**` serving — all stay as-is.
- `SelfAssessment_mine.tsx` and the legacy `original_self_assessment.tsx` / `self_assessment_diff.txt` artefacts — separate cleanup.
- Replacing the hardcoded `http://localhost:8080` with an env var — already in the project audit's punch list, but not part of this change.
- JasperReports PDF templates (`epms_backend/src/main/resources/reports/*.jrxml`) — the signature column name didn't change, so they keep working.
- Audit log emission on sign-off — desirable but out of scope here.

## 6. Verification checklist

After the changes:

1. `mvn clean package -DskipTests` succeeds in `epms_backend/`.
2. Boot the backend; confirm in the SQL log that Hibernate emits `ALTER TABLE appraisals ADD COLUMN employee_sign_note` and `manager_sign_note` (or run `DESCRIBE appraisals;` and see both columns present).
3. `npm install` succeeds in `epms_frontend/`, then `npm run build` passes type-checking with no new errors.
4. `npm run dev`, log in as an employee whose appraisal is in `HR_APPROVED`, navigate to the result page:
   - The signature card shows a blank canvas, **Clear**, and **I Acknowledge & Sign**.
   - Drawing → **Clear** wipes the canvas.
   - Drawing → **Sign** uploads the PNG. The card refreshes to show the rendered signature image. Toast says "Sign-off successful!".
5. Log in as the matching manager, return to the same appraisal:
   - The manager card shows a blank canvas.
   - Draw → **Authorize Final Record** uploads. Image rendered. Toast OK.
6. Check the DB: `appraisals.employee_sign_comment` and `manager_sign_comment` are the `/uploads/signatures/…` paths; `*_sign_note` are NULL (since the new pad doesn't post text alongside).
7. Hit `POST /api/v1/appraisals/{id}/employee-sign-off?comment=Looks%20good` directly (Postman). `employee_sign_note = "Looks good"`; `employee_sign_comment` is unchanged.
8. The PDF "Export PDF" button (currently a placeholder) does not crash on the changed page.
9. Mobile sanity check: open the result page on a phone, sign with finger — strokes follow the touch (this is what `touch-action: none` guarantees).

## 7. Known risks / things to watch

- **Mobile retina canvas blur:** `react-signature-canvas` handles devicePixelRatio internally, but if you see fuzzy strokes, set `canvasProps.width` and `canvasProps.height` explicitly (e.g. `{ width: 600, height: 120 }`) instead of CSS-only.
- **`ddl-auto=update` quirk:** the `columnDefinition = "TEXT"` may be ignored after first creation if the column already exists with a different type. If you ever change a column's type, a manual migration is required.
- **`@Data` on `Appraisal`** would expand `toString()`/`equals()` to include the new TEXT fields — but `Appraisal` already uses `@Getter @Setter @EqualsAndHashCode(callSuper = true)`, so this is a non-issue.
- **JWT/Spring Security** is filter-based — the new endpoints are the *same* endpoints, so authorization is already correct via the existing `@PreAuthorize` on the controller.

## 8. Files touched (final list)

```
epms_backend/src/main/java/ace/org/epms_backend/model/appraisal/Appraisal.java
epms_backend/src/main/java/ace/org/epms_backend/service/impl/AppraisalServiceImpl.java
epms_backend/src/main/java/ace/org/epms_backend/dto/appraisal/AppraisalResponse.java
epms_backend/src/main/java/ace/org/epms_backend/mapper/AppraisalMapper.java

epms_frontend/package.json
epms_frontend/src/components/appraisal/SignaturePad.tsx        (NEW)
epms_frontend/src/types/appraisal.ts
epms_frontend/src/pages/appraisal/ResultPage.tsx
```

That's the entire blast radius. No DB migration script, no API contract change, no auth changes.
