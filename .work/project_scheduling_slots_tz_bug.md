---
name: Backend timezone bug — /scheduling/slots vs stored appointments
description: Known backend mismatch; fix is in flight on Database_Simulation; do NOT patch in dashboard
type: project
originSessionId: 3e4a211f-e7d2-47db-b62b-b0eb598ee415
---
**Known issue:** `GET /scheduling/slots` returns times in clinic-local (`Asia/Jerusalem`), but stored `Appointment.start_time` values are returned UTC. A consumer that mixes the two sources without converting will see times off by 2–3 hours.

**Status (2026-04-26):** the Database_Simulation team flagged this in their handover and a backend fix is queued as a separate PR.

**How to apply:**
- The dashboard does **not** currently call `/scheduling/slots`. The calendar reads `/appointments/by-doctor` (UTC) and uses `new Date(a.start_time)` which parses correctly into the user's local. So today this bug **does not bite the dashboard**.
- If the calendar starts misrendering after a backend change, suspect the timezone fix landed and check `/appointments/by-doctor` is still returning UTC strings.
- **Do NOT add a timezone shim in the dashboard.** The backend is the source of truth and they're fixing it. A workaround in our code becomes the wrong answer once the backend lands.
- If we ever surface bookable slots in the dashboard (e.g., a "book on behalf" feature), revisit this and confirm the contract before consuming `/scheduling/slots`.
