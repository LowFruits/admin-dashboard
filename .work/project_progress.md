---
name: Project Progress
description: Session-by-session work log for admin-dashboard
type: project
---
## Session Log

### 2026-04-13 — Session 1 (scaffold)
- Scaffolded repo from meta session: CLAUDE.md, README, design_doc, .gitignore
- Implemented doctors list page (index.html + js/doctors.js)
- Implemented doctor detail page (doctor.html + js/doctor-detail.js): basic info editing, health funds (add/remove), appointment types table + add modal, weekly calendar view
- Created API client (js/api.js) covering all known Scheduling API endpoints
- Stub pages for add-doctor wizard and patient search
- CSS: RTL Hebrew, responsive, cards/tables/tags/modals/calendar grid
- Created GitHub repo LowFruits/admin-dashboard, pushed initial commit
- Next: test against live API, implement add-doctor wizard, patient search, query bar

### 2026-04-26 — Session 2 (commit b408c81, reconstructed from git)
- Major expansion of doctor detail page: `js/doctor-detail.js` +805/-91 (likely calendar/appointments work)
- CSS expansion: `css/style.css` +320/-27
- API client additions: `js/api.js` +61
- Small tweaks: `doctor.html` +13/-13; minor cleanup in `add-doctor.html`, `index.html`, `patients.html`
- Added local `myprompt` file
- **Note:** This entry reconstructed from git stats. The session was done from a separate working clone (`admin-dashboard/admin-dashboard/`) which was later deleted; its memory was partially restored from a 2026-04-26 backup but the original session-2 progress entry was lost. Original commit message was empty.

### 2026-05-12 — Session 4 — Part 2 (calendar + modals overhaul)

After fixing the #3c TZ bug earlier in the session, Tomer added six more features that all touched the calendar render or the two modals. Bundled into one PR (per Tomer's call, against per-PR-shipping rule) because they form one cohesive UX improvement.

**Process correction:** Tomer flagged that I'd shipped #3c yesterday without plan-mode/audit-plan. New feedback memory `feedback_no_plan_no_code.md` added earlier today. Every feature this session went through plan-mode + `/audit-plan` before code.

**Shipped:**
- **Calendar:** appointment blocks now sized and positioned proportionally (top%/height% from start_time/end_time relative to cell duration). Cells use absolute positioning inside relative-positioned slot containers.
- **Calendar:** unified cell click handler with 15-min Y-snap. Cell defines the hour prefix; Y position picks the minute suffix (00/15/30/45). Has-appointment cells filter anchors to empty sub-windows so the snap can't land on an occupied minute.
- **Book modal:** editable `<input type="time" step="900">` (was static text). Closure-tracked `selectedTime`.
- **Book modal:** patient details panel — picking a patient shows name/phone/email/ID/DOB; ערוך toggles to inline edit; save calls `PUT /patients/{id}`. Confirm popup guards against accidentally wiping a previously-set optional field.
- **Book modal:** create form gains optional `email`, `id_number`, `date_of_birth` inputs. Both search-pick and create flows route through unified `onPatientSelected(p)`.
- **Appointment-detail modal:** "תזמן מחדש" replaced with "ערוך תור" → full edit flow. Patient locked; date/time/type/notes editable. Slot chips highlight current time when date+type unchanged. Type dropdown includes deactivated current type as "(לא פעיל)". Save uses book-first/cancel-second; 404 on cancel-old treated as success.
- **API client:** patched `apiFetch` to attach `e.status = res.status` on thrown errors (enables 404 detection); added `api.updatePatient(id, data)`.

**Decisions / insights:**
- Bundled per Tomer's call: all six features live in the same two modals + calendar render; per-PR-shipping rule explicitly waived once.
- Patient remains locked during appointment edit (Tomer's call).
- Notes editing uses cancel+book workaround until backend PATCH ships (`B-edit-c`). When `H` (patient notifications) lands, cancel+book pairs must be coalesced to avoid double-spamming patients — annotation added inline in `todos.md` H entry.
- Display-only behavior change: empty-cell clicks now snap by Y (used to always book at slot start). Acceptable per Tomer.

**Follow-up fix (same session):**
- Browser testing surfaced two issues: (a) notes-only / type-only edits failed with "Time slot is no longer available" because book-first runs against the still-occupied original; (b) leftover area in partially-filled cells was tinted.
- Fix: hybrid ordering in `performEditSave` — cancel-first when `newStartTime === original.startTime`, book-first otherwise. New `renderEditRecovery` panel shown when cancel succeeded but book failed (shows full payload + retry button + close-fires-loadCalendar).
- CSS: removed `.slot.has-appointment` tint; added `:hover` rule so leftover area matches empty-cell hover behavior.
- Long-term fix tracked at `todos.md` B-edit-c (backend PATCH endpoint).

**Next steps:**
- Browser-test the 38-item plan, starting with the #1 regression test (TZ-aware POST body still correct on book), then proportional blocks, then Y-snap, then patient details/edit, then full appointment edit (the riskiest).
- Pick up unblocked todos: G (cancel reason input), I (show-cancelled toggle).

### 2026-05-12 — Session 4 (#3c TZ-bug fix + slot-fetch refactor)

Started the session investigating a TZ bug Tomer hit in production: backend rejected new-booking POST with `start_time: Input should have timezone info` because #3c (shipped yesterday without a plan) was constructing `${date}T${time}:00` (naive datetime) and POSTing it.

**Process correction:** Tomer flagged that I shipped #3c yesterday without entering plan-mode or running `/audit-plan`. New feedback rule added (`feedback_no_plan_no_code.md`): every non-trivial feature requires plan + audit before code, no exceptions, even when the change "looks like a small addition".

**Replanned #3c from scratch:**
- Wrote full plan, ran `/audit-plan` (caught 7 auto-fixes + 1 decision)
- Tomer chose to bundle a small refactor (extract shared slot-fetch helper) into the same PR

**Shipped:**
- New module-level helper `fetchAvailableSlots({doctorId, date, appointmentTypeId})` in `js/doctor-detail.js:890` — wraps `api.getSlots`, defensive `Array.isArray` guard, sort by `start_time.localeCompare`
- Rewrote `handleBookConfirm` (book-from-empty-slot) as a two-phase flow: (1) fetch slots via helper, find slot where `slotTimeLabel === clicked time`; (2) book using the API-returned `start_time` string verbatim (TZ-aware). Null-guards for modal-closed-during-fetch. Error UX surfaces "no longer available" vs network vs HTTP separately.
- Rewired `fetchAndRenderSlots` (#3b reschedule slot-picker) to use the same helper. Chip-render logic unchanged.

**Decisions / insights:**
- TZ correctness comes from round-tripping the slots API's `start_time` string — never construct TZ-aware strings client-side. Reaffirms `project_scheduling_slots_tz_bug.md`'s "no dashboard shim" rule
- The fetch-then-book pattern also gives free concurrent-booking protection (slot must exist in current slots response, or else "כבר אינה זמינה")
- `slotTimeLabel` regex `/T(\d{2}:\d{2})/` is prefix-anchored — tolerates millis, offsets, and `Z` suffix without modification

**Next steps:**
- Browser-test the manual test plan in `seems-to-work-lets-glimmering-swan.md` (test #0 first: slot format verification; then #1 TZ regression; then #3 reschedule regression)
- Pick up unblocked todos: G (cancel reason input), I (show-cancelled toggle)

### 2026-05-11 — Session 3 (memory migration + 6 features)

**Memory + tooling infrastructure** (this repo + `~/.claude-personal/`):
- Migrated admin-dashboard memory from auto-memory to in-repo `.work/` (git-tracked across machines). Created `.work/MEMORY.md`, `todos.md`, `.gitignore` entries for `.work/parked.md` + `.work/handoff.md`
- Restored 6 memory files lost when the wrong nested admin-dashboard clone was deleted (safe — all code pushed to origin; backup at `~/.claude/projects/...`)
- Aligned `~/.claude-personal/commands/` with `~/.claude-work/`: renamed `lf-session-*` → `session-*`; added `handoff`, `park`, `pushback`, `migrate-to-work-dir`; updated `lf-init-repo` to bootstrap into `.work/`; created `audit-plan` (pre-implementation pressure-test across 9 lenses)
- Migrated 3 other personal repos to `.work/` (`Database_Simulation`, `call_agent`, `meta`); deleted the duplicate nested admin-dashboard clone

**Features shipped (admin-dashboard frontend):**
- **#1** Doctor cards on main page fully clickable (wrap in `<a>`, drop redundant button)
- **#5** Sticky section-nav on doctor page absorbed the page-header (name + back + 6 section anchors); stays visible while scrolling
- **#2** Calendar blocks show `<time> · <name>`; click opens read-only popup with patient/phone/type/date/time/status/notes. Render-scoped patient+type fetch per render (always fresh, no cross-render cache)
- **#3a** Cancel appointment from popup, in-modal confirm; cancelled appts filtered out of calendar grid
- **#3b** Reschedule from popup — 4-state modal (view → reschedule → reschedule-confirm); slot picker via `/scheduling/slots`; book-first/cancel-second ordering; TZ-safe same-slot guard via `slotTimeLabel` regex (no `new Date()` on clinic-local slot strings)
- **#3c** Empty open cells clickable; booking modal with patient search + inline create form + type dropdown; `booked_by: "staff"`

**Decisions / insights:**
- TZ bug worked around by avoiding `new Date()` on slot strings — `slotTimeLabel` regex extracts HH:MM directly. Backend fix is in flight per `.work/project_scheduling_slots_tz_bug.md`; no dashboard shim
- `booked_by="staff"` hardcoded for now; future `user_id` model logged in `todos.md`
- Cancelled appointments hidden by default; "show cancelled" toggle deferred to `todos.md` item I
- Adopted plan-mode + `/audit-plan` workflow: every non-trivial feature gets a written plan, then `/audit-plan` pressure-tests across 9 lenses before exit-plan-mode → implement
- Per-PR-shipping rule deliberately bundled into one commit this session (chose `/session-end` flow)

**Next steps:**
- Test #3c edge cases in browser (network failure, backend-rejected slot, duplicate-phone on create)
- When picking up follow-ups, extract `fetchAndRenderSlots` + slot-chip render from `showAppointmentModal` closure to module level for reuse (`slotTimeLabel` is already there)
- Pick up `todos.md` items: G (cancel reason), H (patient notify), I (show-cancelled toggle), `booked_by` → user_id migration, C-V2 (native message reply), B-edit-c (PATCH endpoint for status/notes)
