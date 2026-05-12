---
name: Project Todos
description: Active TODOs and future work for admin-dashboard, including cross-repo backend dependencies
type: project
---

## Future Features

### E — Messaging Tab (main nav)
New top-level tab next to "Doctors" and "Patients" — WhatsApp-like UI for managing messaging across all doctors. Spec TBD by Tomer.
**Status:** Not started. Awaiting spec.

### F — Send Message from Appointment Popup
Add a "send message to client" option inside the appointment detail popup. Depends on proper message-send backend endpoint (see Backend Dependencies).
**Status:** Blocked on backend.

### G — Cancellation reason input
On cancel from the appointment popup, capture a free-text reason. The backend `CancelRequest` schema already accepts an optional `reason`; just needs a UI field + wiring. Useful for audit / pattern analysis later.
**Status:** Deferred. Backend already supports it.

### H — Patient notification on cancel/reschedule
When an appointment is cancelled or rescheduled from the dashboard, notify the patient (SMS/WhatsApp). Overlaps with item F — any backend send endpoint serves both.
**Status:** Blocked on the same backend send endpoint as F.

**Important for implementation:** the appointment-edit flow (shipped 2026-05-12) uses book-new + cancel-old as a workaround for the missing PATCH endpoint. Without coalescing, this would generate two patient messages (cancel + schedule) for one logical edit. When implementing H, treat a cancel-followed-by-book pair for the same patient within ≤1s as a single "updated" notification (or use a debounce window). Otherwise, every notes edit will spam the patient.

### I — "Show cancelled" toggle in the calendar
Cancelled appointments are filtered out of the weekly calendar view by default. Add a toggle so the admin can opt in to see them (greyed-out style).
**Status:** Not started. Frontend-only addition when requested.

## Backend Dependencies

### Required for "edit appointment status/notes" (B-edit-c)
- `PATCH /appointments/{id}` — to change status / update notes / change type at the same start_time. Backend currently only supports book + cancel.
- **Repo:** `Database_Simulation`
- **Dashboard today (workaround):** the appointment-edit flow uses cancel-then-book for same-time edits (notes-only, type-only) and book-then-cancel for time-changing edits. The same-time path has a "manual recovery" UI when book fails after cancel succeeded.
- **When PATCH ships:** dashboard's `performEditSave` collapses to a single `api.patchAppointment(appt.id, diff)` call. The `renderEditRecovery` panel becomes dead code (delete).

### Optional perf — enrich `/appointments/by-doctor` response
- Currently the endpoint returns only IDs (`patient_id`, `appointment_type_id`). Frontend has to do N+1 fetches to show patient name/phone and appointment type name in the calendar.
- If backend adds inline `patient_name`, `patient_phone`, `appointment_type_name` to the response, frontend can drop the extra calls.
- **Repo:** `Database_Simulation`
- **Not blocking** — frontend N+1 with caching works fine for a single doctor's week (~30 appointments).

### Reply natively in the dashboard (C → V2)
- **MVP shipping now (option b):** inline compose textarea per message row. On send, opens WhatsApp deep-link (`https://wa.me/{phone}?text=...`) pre-filled with the typed text. Auto-marks the message as "replied". Compose happens in the dashboard, WhatsApp just confirms+sends. No backend changes.
- **V2 (this TODO, option c):** replace the deep-link with a dashboard-native send button — no context switch to WhatsApp. Needs:
  - `POST /messages/send` (or similar) endpoint in `Database_Simulation`
  - Wire it through `call_agent` for the actual WhatsApp transport

### K — Render cross-cell appointments (duration > cell pitch)
When an appointment's duration exceeds its cell's `dayDur` (e.g. a 90-min appointment in a day with 60-min slot grid), the block today clamps to the visible slice of the starting cell. The hidden tail extends into the next cell with no visual indication.
**Fix shape:** render such appointments as multi-cell blocks (CSS grid `grid-row` span based on duration, OR shrink the grid pitch to GCD of all durations including appt-types).
**Status:** Deferred. Rare in practice — current backend tends to align appointment-type durations with rule slot durations.

### M — Edit appointment status (mark completed / no_show)
The full appointment edit flow shipped 2026-05-12 covers date/time/type/notes but not status. Marking an appointment as `completed` or `no_show` needs `PATCH /appointments/{id}` (= B-edit-c). Currently the only status transition the dashboard can drive is `scheduled → cancelled`.
**Status:** Blocked on backend (B-edit-c).

### Replace `booked_by` enum with user_id (longer-term)
Today `booked_by` is an enum (`agent | staff | patient`) — useful for analytics but doesn't say WHO booked. Once admin login is in place, the cleaner model is `booked_by = user_id` (string), and the appointment popup displays the actual person who made the booking (e.g. "נקבע על ידי: Tomer Massas").
**Migration path:**
- Now: dashboard sends `"staff"` for admin-initiated rebookings (interim — chosen for 3b reschedule)
- Future: backend accepts user_id in `booked_by`; dashboard sends the logged-in admin's id; popup renders the user's display name
**Repos:** `Database_Simulation` (schema/validation), `admin-dashboard` (UI), and an auth/login layer (not yet defined)
