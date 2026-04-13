# Admin Dashboard — Design Document

## Purpose
Developer-facing admin tool for the LowFruits system. Allows Tomer to:
- Configure doctors before they go live
- Monitor appointments and verify chatbot behavior
- Search and manage patient records
- Quick-query the system for debugging

## Architecture
Static HTML/CSS/JS app. No server, no build step. All data comes from the Scheduling API via fetch calls.

## Data Flow
```
admin-dashboard (browser)
       |
   fetch() / JSON
       |
Scheduling API (Database_Simulation on Render)
```

## Pages
1. **Doctors List** (`index.html`) — main page, card grid of all doctors
2. **Doctor Detail** (`doctor.html`) — edit info, kupot cholim, appointment types, availability, calendar
3. **Add Doctor** (`add-doctor.html`) — multi-step wizard
4. **Patient Search** (`patients.html`) — search + detail view
5. **Query Bar** — always-visible quick queries in nav

## Key Decisions
- No framework: vanilla JS keeps it simple, no build tooling needed
- Multiple HTML files: simpler than SPA routing, each page is self-contained
- RTL-first: all layouts designed for Hebrew RTL
- `API_BASE` configurable: works against local dev or production Render URL
