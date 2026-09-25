# 360° Feedback — Testing Flow

End-to-end walkthrough mapped directly to the actual controller endpoints and service layer in this codebase. Work top-to-bottom; each stage lists the role, the exact endpoint, the action, and the pass condition.

---

## Prerequisites

| Account | Role | Notes |
|---|---|---|
| `admin_user` | HR / ADMIN | Drives all config and HR-gated actions |
| `manager_user` | MANAGER | Has at least one direct report |
| `target_employee` | EMPLOYEE | The person being evaluated |
| `peer_1`, `peer_2` | EMPLOYEE | Evaluators (same or adjacent dept) |

Active appraisal cycle in `IN_PROGRESS` or `EVALUATION` status required before any step below.

---

## Stage 0 — Configuration

> Base paths: `/api/v1/competency` · `/api/v1/feedback/config` · `/api/v1/scoring-policy`

### 0.1 Competency Library
- **Role:** HR/ADMIN — `CompetencyController`
- `GET /api/v1/competency` → verify list is empty or pre-seeded
- `POST /api/v1/competency` — body `{ name, description }` → create ≥4 competencies (Communication, Leadership, Teamwork, Technical)
- `PUT /api/v1/competency/{id}` — edit one name → confirm change persists on re-fetch
- `DELETE /api/v1/competency/{id}` — soft-delete one → confirm it no longer appears in `GET` list

### 0.2 Department Feedback Config
- **Role:** HR/ADMIN — `DepartmentFeedbackConfigController`
- `POST /api/v1/feedback/config/set-limit?deptId=X&levelId=Y&maxPeers=3&maxSubs=2` → `200 OK` with saved DTO
- `GET /api/v1/feedback/config/department/{deptId}` → confirm `maxPeers` and `maxSubordinates` match what you set
- `GET /api/v1/feedback/config` → all configs visible
- `DELETE /api/v1/feedback/config/{id}` on a spare record → `200 OK`; confirm removed on re-list

### 0.3 Scoring Policy
- **Role:** HR/ADMIN — `ScoringPolicyController`
- `GET /api/v1/scoring-policy?cycleId=X` → confirm a policy exists (or is empty)
- `PUT /api/v1/scoring-policy` — body with `cycleId`, `ratingScale`, weights per relationship type (`PEER`, `MANAGER`, `SUBORDINATE`, `SELF`) → `200 OK`
- Re-`GET` → upserted policy returned; `id` stable across subsequent `PUT`s (upsert, not duplicate)

---

## Stage 1 — Nominations

> Base path: `/api/v1/feedback/nomination` — `FeedbackNominationController`

### 1.1 Propose Nominations
- **Role:** Target Employee (or any employee nominating evaluators for themselves)
- `POST /api/v1/feedback/nomination` — body: `{ targetEmployeeId, evaluatorId, relationship, cycleId }`
  - Propose peer_1 as `PEER`, peer_2 as `PEER`, manager_user as `MANAGER`
- `GET /api/v1/feedback/nomination/mine` → all three appear with `status: PENDING`

### 1.2 Approve / Reject
- **Role:** HR/ADMIN or MANAGER — same controller
- `POST /api/v1/feedback/nomination/{id}/approve` → `status` becomes `APPROVED`; proposer receives notification
- `POST /api/v1/feedback/nomination/{id}/reject` on one peer → `status` becomes `REJECTED`
- Verify: proposer's `GET /mine` reflects updated statuses

---

## Stage 2 — Evaluator Selection (Alternative / Supplementary Path)

> Base path: `/api/v1/feedback-selection` — `FeedbackSelectionController`

This path provides HR/manager-assisted selection independent of the employee-nomination flow. Run it for a second target employee to exercise both paths.

- `GET /api/v1/feedback-selection/suggest/{employeeId}` → returns `List<EmployeeEvaluationDTO>` of recommended evaluators
- `POST /api/v1/feedback-selection/confirm?targetId=X&cycleId=Y` — body: selected evaluators list → `"Feedback requests created successfully!"`
- Verify: the generated requests appear in Stage 3's cycle-list endpoint

---

## Stage 3 — Generate Feedback Requests

> Base path: `/api/v1/feedback` — `Feedback360Controller`

### 3.1 Preview (dry-run — never skip)
- **Role:** HR — `@PreAuthorize("hasRole('ROLE_HR')")`
- `GET /api/v1/feedback/preview?cycleId=X&globalMaxLimit=7&excludeLongTermLeave=true`
- Verify: all approved nominations appear as evaluator-target pairs; counts respect dept config limits; nothing saved yet

### 3.2 Generate
- `POST /api/v1/feedback/generate?cycleId=X&globalMaxLimit=7&excludeLongTermLeave=true`
- Verify: `"Enhanced feedback requests generated successfully..."` response; `GET /api/v1/feedback/cycle/{cycleId}/requests` lists created pairs
- Notification check: each evaluator's notification bell shows a new 360 request notification

### 3.3 Regenerate for One User
- `POST /api/v1/feedback/regenerate-user?targetEmployeeId=X&cycleId=Y&globalMaxLimit=7`
- Verify: only that employee's requests are recreated; all other requests untouched

### 3.4 Top-Management Rotation (L04 targets only)
- `GET /api/v1/feedback/rotation/preview?currentCycleId=X&previousCycleId=Y` → dry-run; inspect `roundRobinFallback` flag on any target that exhausted fresh evaluators
- `POST /api/v1/feedback/rotation/generate?currentCycleId=X&previousCycleId=Y` → saves rotation assignments
- `GET /api/v1/feedback/rotation/assign?targetEmployeeId=Z&currentCycleId=X&previousCycleId=Y` → single-target evaluator assignment without persisting

---

## Stage 4 — Evaluators Submit Feedback

> `Feedback360Controller` (`/api/v1/feedback`) + `FeedbackSubmissionController` (`/api/v1/360-feedback/feedbacks`)

### 4.1 Fetch Pending Requests
- **Role:** Evaluator (peer_1)
- `GET /api/v1/feedback/my-requests` (JWT-auth based) → all pending requests for this evaluator
- Alternative: `GET /api/v1/360-feedback/requests/my?evaluatorId=X` (param-based)

### 4.2 Load the Form
- `GET /api/v1/360-feedback/feedbacks/request/{requestId}/questions` → returns `FullFormResponse` with all competency questions for this request

### 4.3 Save Draft
- `PUT /api/v1/feedback/draft` — body: `{ requestId, answers[] }`
- Verify: `200 OK` "Draft saved"
- `GET /api/v1/feedback/draft/{requestId}` → answers pre-populated on re-open

### 4.4 Submit Final
- `POST /api/v1/feedback/submit` — body: `FeedbackSubmissionRequest` with all answers
- Verify: request status flips `PENDING → SUBMITTED`; request disappears from pending list
- **Negative:** re-submit the same `requestId` → expect `409 Conflict` or equivalent rejection

### 4.5 View Submission
- `GET /api/v1/360-feedback/feedbacks/request/{requestId}` → `FeedbackDetailsResponse`
- `GET /api/v1/360-feedback/feedbacks/my?evaluatorId=X` → all of this evaluator's submitted feedbacks
- `GET /api/v1/360-feedback/feedbacks/employee/{employeeId}?cycleId=Y` → feedbacks received by target

### 4.6 Repeat for All Evaluators
Complete submissions from manager_user (`MANAGER`), peer_1 and peer_2 (`PEER`), target_employee (`SELF`).

Verify via: `GET /api/v1/feedback/cycle/{cycleId}/dashboard` — submission progress per evaluator bucket.

### 4.7 Send Reminders (before all complete)
- `POST /api/v1/feedback/cycle/{cycleId}/reminders` → outstanding evaluators notified; already-submitted ones skipped
- `POST /api/v1/feedback/request/{requestId}/remind` → individual reminder

### 4.8 Cancel and Reassign
- `POST /api/v1/feedback/request/{requestId}/cancel` → status `CANCELLED`; disappears from evaluator's list
- `POST /api/v1/feedback/request/{requestId}/reassign` — body: `{ newEvaluatorId }` → new evaluator receives the request

---

## Stage 5 — Generate Summaries

> Base path: `/api/v1/360-feedback/summary` — `FeedbackSummaryController`

### 5.1 Single Summary
- **Role:** HR/ADMIN
- `POST /api/v1/360-feedback/summary/generate?employeeId=X&cycleId=Y`
- `GET /api/v1/360-feedback/summary/employee/{employeeId}/cycle/{cycleId}` → verify `totalScore`, per-relationship scores, per-competency scores are non-zero

### 5.2 Generate All
- `POST /api/v1/360-feedback/summary/generate-all?cycleId=Y`
- `GET /api/v1/360-feedback/summary/cycle/{cycleId}` → every eligible target has a summary row; suppressed targets (insufficient submissions) return a suppression notice

---

## Stage 6 — Calibration

> Base path: `/api/v1/calibration` — `CalibrationController` (`@PreAuthorize("hasAnyRole('ADMIN','HR')")` on entire controller)

### 6.1 Inspect Distribution and Deltas
- `GET /api/v1/calibration/cycle/{cycleId}/distribution?calibrated=false` → raw score distribution
- `GET /api/v1/calibration/cycle/{cycleId}/deltas` → `List<CalibrationDeltaRow>`; all zeros before any adjustments

### 6.2 Flag for Review
- `POST /api/v1/calibration/summaries/{summaryId}/flag`
- Verify: summary status → `UNDER_REVIEW`

### 6.3 Adjust Score
- `PUT /api/v1/calibration/summaries/{summaryId}/adjust` — body: `{ adjustedScore, reason }`
- Verify: delta appears in `/deltas`; status → `ADJUSTED`

### 6.4 Approve
- `POST /api/v1/calibration/summaries/{summaryId}/approve` — body: `{ "approverComment": "..." }` (optional)
- Verify: status → `APPROVED`

### 6.5 Revert (negative path)
- `POST /api/v1/calibration/summaries/{summaryId}/revert`
- Verify: status → `UNDER_REVIEW`; score returns to raw value

### 6.6 Calibration Sessions
- `POST /api/v1/calibration/sessions` — body: `CreateSessionRequest` → `CalibrationSessionResponse`
- `POST /api/v1/calibration/sessions/{sessionId}/summaries` — body: `{ "summaryIds": [1,2,3] }`
- `POST /api/v1/calibration/sessions/{sessionId}/start`
- `POST /api/v1/calibration/sessions/{sessionId}/complete`
- `GET /api/v1/calibration/sessions?cycleId=Y` → session appears with status `COMPLETED`

### 6.7 Lock the Cycle
- `POST /api/v1/calibration/cycle/{cycleId}/lock`
- Verify: `"Cycle locked — all summaries finalized"` response
- Re-attempt `adjust` on any summary → expect rejection (`409` or `400`)
- `GET /api/v1/calibration/cycle/{cycleId}/distribution?calibrated=true` → distribution now reflects adjusted scores

---

## Stage 7 — Manager Review and Finalize

> Base path: `/api/v1/360-feedback/summary` — `FeedbackSummaryController`

### 7.1 Manager Posts Review
- **Role:** MANAGER (or HR/ADMIN)
- `PUT /api/v1/360-feedback/summary/{summaryId}/manager-review` — body: `ManagerReviewRequest`
- Verify: `200 OK` "Manager review saved"; review block appears on the summary response

### 7.2 Finalize
- **Role:** HR/ADMIN
- `PUT /api/v1/360-feedback/summary/{summaryId}/finalize`
- Verify: `"Summary finalized"`; summary is now read-only; target employee notification fires

---

## Stage 8 — Audit and HR Visibility

- `GET /api/v1/360-feedback/feedbacks/audit/employee/{employeeId}?cycleId=Y` (`HR/ADMIN` only) → complete unfiltered feedback list for audit
- Verify soft-delete: `DELETE /api/v1/360-feedback/feedbacks/{feedbackId}` → `204 No Content`; regenerate summary → deleted feedback excluded from calculation

---

## Stage 9 — Edge Cases

| # | Scenario | Expected |
|---|---|---|
| 1 | `POST /generate` with zero approved nominations | `200 OK`, 0 requests created; clear message |
| 2 | Evaluator accesses another evaluator's draft via tampered `requestId` | `403 Forbidden` |
| 3 | `POST /submit` on a `CANCELLED` request | `409 Conflict` |
| 4 | `POST /submit` duplicate (already `SUBMITTED`) | `409 Conflict` |
| 5 | `POST /summary/generate` when below minimum submission threshold | Summary marked suppressed; no score returned |
| 6 | `PUT /calibration/summaries/{id}/adjust` after `/cycle/{id}/lock` | `409` / `400` |
| 7 | `POST /nomination/{id}/approve` by a non-HR, non-MANAGER user | `403 Forbidden` |
| 8 | `PUT /scoring-policy` with missing required weight fields | `400 Bad Request` with validation message |
| 9 | `POST /feedback-selection/confirm` with target = evaluator | `400` — self-evaluation outside `SELF` relationship rejected |
| 10 | `POST /rotation/generate` with `previousCycleId` omitted (first cycle) | `200 OK`; `roundRobinFallback` not triggered since no history exists |

---

## Stage 10 — Notification Matrix

Verify each notification fires to the right recipient at the right step:

| Step | Trigger | Recipient |
|---|---|---|
| 1.2 | Nomination approved or rejected | Proposer (target employee) |
| 3.2 | Requests generated | Each evaluator |
| 4.7 | Cycle reminder sent | Outstanding evaluators only |
| 4.8 | Request cancelled | Original evaluator |
| 4.8 | Request reassigned | Old evaluator + new evaluator |
| 7.2 | Summary finalized | Target employee |

---

## Pass Criteria

- [ ] Stages 0–7 complete end-to-end with no `5xx` responses
- [ ] Role boundaries enforced: `403` on every HR-only endpoint when called as `EMPLOYEE`
- [ ] Draft persists across sessions; submission is idempotent-safe (duplicate → `409`)
- [ ] Calibration lock blocks further score adjustments
- [ ] All 10 edge cases in Stage 9 return a structured error, not a stack trace
- [ ] Notification matrix rows all confirmed in the notification bell of the relevant account

---

## Endpoint Index

```
CompetencyController        GET|POST|PUT|DELETE  /api/v1/competency[/{id}]
DeptFeedbackConfigCtrl      POST   /api/v1/feedback/config
                            POST   /api/v1/feedback/config/set-limit
                            GET    /api/v1/feedback/config
                            GET    /api/v1/feedback/config/department/{deptId}
                            DELETE /api/v1/feedback/config/{id}
ScoringPolicyController     GET|PUT              /api/v1/scoring-policy
FeedbackNominationCtrl      POST   /api/v1/feedback/nomination
                            GET    /api/v1/feedback/nomination/mine
                            POST   /api/v1/feedback/nomination/{id}/approve
                            POST   /api/v1/feedback/nomination/{id}/reject
FeedbackSelectionCtrl       GET    /api/v1/feedback-selection/suggest/{employeeId}
                            POST   /api/v1/feedback-selection/confirm
Feedback360Controller       GET    /api/v1/feedback/preview
                            POST   /api/v1/feedback/generate
                            POST   /api/v1/feedback/regenerate-user
                            GET    /api/v1/feedback/my-requests
                            POST   /api/v1/feedback/submit
                            PUT    /api/v1/feedback/draft
                            GET    /api/v1/feedback/draft/{requestId}
                            POST   /api/v1/feedback/request/{id}/cancel
                            POST   /api/v1/feedback/request/{id}/reassign
                            GET    /api/v1/feedback/cycle/{cycleId}/requests
                            POST   /api/v1/feedback/cycle/{cycleId}/reminders
                            POST   /api/v1/feedback/request/{id}/remind
                            GET    /api/v1/feedback/cycle/{cycleId}/dashboard
                            GET    /api/v1/feedback/rotation/preview
                            POST   /api/v1/feedback/rotation/generate
                            GET    /api/v1/feedback/rotation/assign
FeedbackSubmissionCtrl      POST   /api/v1/360-feedback/feedbacks
                            GET    /api/v1/360-feedback/feedbacks/request/{requestId}
                            GET    /api/v1/360-feedback/feedbacks/request/{requestId}/questions
                            GET    /api/v1/360-feedback/feedbacks/my
                            GET    /api/v1/360-feedback/feedbacks/employee/{employeeId}
                            GET    /api/v1/360-feedback/feedbacks/audit/employee/{employeeId}
                            DELETE /api/v1/360-feedback/feedbacks/{feedbackId}
FeedbackSummaryController   POST   /api/v1/360-feedback/summary/generate
                            POST   /api/v1/360-feedback/summary/generate-all
                            GET    /api/v1/360-feedback/summary/employee/{id}/cycle/{id}
                            GET    /api/v1/360-feedback/summary/cycle/{cycleId}
                            PUT    /api/v1/360-feedback/summary/{id}/finalize
                            PUT    /api/v1/360-feedback/summary/{id}/manager-review
CalibrationController       POST   /api/v1/calibration/summaries/{id}/flag
                            PUT    /api/v1/calibration/summaries/{id}/adjust
                            POST   /api/v1/calibration/summaries/{id}/approve
                            POST   /api/v1/calibration/summaries/{id}/revert
                            POST   /api/v1/calibration/sessions
                            POST   /api/v1/calibration/sessions/{id}/summaries
                            POST   /api/v1/calibration/sessions/{id}/start
                            POST   /api/v1/calibration/sessions/{id}/complete
                            GET    /api/v1/calibration/sessions
                            GET    /api/v1/calibration/cycle/{cycleId}/deltas
                            GET    /api/v1/calibration/cycle/{cycleId}/distribution
                            POST   /api/v1/calibration/cycle/{cycleId}/lock
```
