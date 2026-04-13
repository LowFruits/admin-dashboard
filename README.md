# Admin Dashboard

Lightweight admin tool for the LowFruits AI secretary system. Manage doctors, view calendars, search patients, and verify chatbot behavior.

## Quick Start

```bash
python -m http.server 8080
# Open http://localhost:8080
```

Or use any static file server (VS Code Live Server, etc.)

## Configuration

Edit `js/api.js` and set `API_BASE` to point to your Scheduling API:

```js
const API_BASE = "https://scheduling-simulation-api.onrender.com";
```

## Pages

| Page | Description | Status |
|------|-------------|--------|
| Doctors List | View all doctors, click for details | Implemented |
| Doctor Detail | Edit info, manage kupot, appointment types, calendar | Implemented |
| Add Doctor | Step-by-step wizard to onboard a new doctor | Scaffold |
| Patient Search | Search by name or teudat zehut | Scaffold |
| Query Bar | Quick debugging queries | Scaffold |

## Tech Stack

- Pure HTML / CSS / JS — no build step
- RTL Hebrew (`dir="rtl"`, `lang="he"`)
- CSS Grid / Flexbox

## Part of LowFruits

See [meta repo](https://github.com/LowFruits/meta) for ADRs, API contracts, and standards.
