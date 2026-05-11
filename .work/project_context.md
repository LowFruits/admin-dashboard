---
name: Project Context
description: Admin dashboard purpose, tech stack, and current status
type: project
---
## Admin Dashboard
Lightweight developer/admin tool for the LowFruits AI secretary system. Pure HTML/CSS/JS — no build step. Consumes the Scheduling API (Database_Simulation on Render).

**Purpose:** Configure doctors, monitor appointments, verify chatbot behavior, search patients, debug queries.

**Tech:** Pure HTML/CSS/JS, RTL Hebrew, API_BASE configurable in js/api.js.

**Pages:**
- Doctors list (index.html) — implemented
- Doctor detail (doctor.html) — implemented (sticky section-nav, info, health funds, appointment types, availability, calendar with appointment popup [view/cancel/reschedule, new-booking from empty slot], messages)
- Add doctor wizard (add-doctor.html) — stub
- Patient search (patients.html) — stub
- Query bar — stub

**API:** https://scheduling-simulation-api.onrender.com
**Repo:** https://github.com/LowFruits/admin-dashboard
