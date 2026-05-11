---
name: Tomer - User Profile
description: Tomer is solo dev across all four LowFruits repos; admin-dashboard is internal-only for his own ops use
type: user
originSessionId: 3e4a211f-e7d2-47db-b62b-b0eb598ee415
---
Tomer is the **only engineer** on the LowFruits product. He owns and works across four repos:

- `admin-dashboard` (this repo) — internal admin tool, Hebrew RTL, pure HTML/CSS/JS, no build.
- `Database_Simulation` — Python/FastAPI scheduling backend, deployed on Render.
- `call_agent` — WhatsApp AI chatbot for patients.
- `meta` — cross-repo ADRs, API contracts, standards.

He runs separate Claude sessions per repo and uses the `meta` repo as the coordination point (ADRs, OpenAPI contract). When he says "the database team replied" or "the agent team", he means his own Claude session in another repo.

The admin-dashboard is **not patient-facing** — it's Tomer's own ops surface for managing doctors, types, availability, and the message inbox. There's no auth, no user accounts. He's the only operator.

He prefers concise replies, separate PRs per logical change, and explicit step-by-step verification walkthroughs when testing changes manually.
