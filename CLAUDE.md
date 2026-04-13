# Admin Dashboard — Claude Instructions

Lightweight admin tool for the LowFruits AI secretary system. Pure HTML/CSS/JS — no build step.

## What This Repo Is
- Developer/admin dashboard for managing doctors, viewing calendars, searching patients
- Not patient-facing — internal tool for Tomer
- Consumes the Scheduling API (Database_Simulation on Render)

## Tech Stack
- Pure HTML/CSS/JS — no React, Vue, or build tools
- RTL Hebrew throughout (dir="rtl", lang="he")
- API base URL configurable in `js/api.js`
- Run locally: `python -m http.server` or any static file server

## Structure
- `index.html` — Doctors list (main page)
- `doctor.html?id=UUID` — Doctor detail/edit page
- `add-doctor.html` — Add doctor wizard
- `patients.html` — Patient search
- `css/style.css` — Shared styles
- `js/api.js` — API client (all Scheduling API calls)
- `js/doctors.js` — Doctors list page logic
- `js/doctor-detail.js` — Doctor detail page logic

## Working With Me (Tomer)
- Never make changes without explicit permission
- Be concise, no fluff
- Update memory after sub-tasks
- For cross-repo context, ADRs, standards: see ../meta/

## API
- Base URL: `https://scheduling-simulation-api.onrender.com`
- Full endpoint list in `js/api.js`
- API contract: `../meta/api-contracts/scheduling-api.json`