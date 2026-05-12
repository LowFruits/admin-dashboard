# Memory Index

## User
- [user_profile.md](user_profile.md) — Tomer is solo dev across LowFruits repos; dashboard is his internal ops tool

## Feedback
- [feedback_working_guidelines.md](feedback_working_guidelines.md) — Core collaboration rules
- [feedback_brief_summaries.md](feedback_brief_summaries.md) — Keep "summary" replies to ~5 short lines
- [feedback_per_pr_shipping.md](feedback_per_pr_shipping.md) — Sync work against backend changes ships as separate PRs, never bundled
- [feedback_no_plan_no_code.md](feedback_no_plan_no_code.md) — Every non-trivial feature requires plan + /audit-plan before code — no exceptions

## Project
- [project_context.md](project_context.md) — Admin dashboard purpose, tech stack, and current status
- [project_progress.md](project_progress.md) — Session-by-session work log
- [project_clinic_redundancy_adr010.md](project_clinic_redundancy_adr010.md) — Clinics are 1:1 with doctors; full removal deferred to ADR-010
- [project_scheduling_slots_tz_bug.md](project_scheduling_slots_tz_bug.md) — Backend TZ mismatch in /scheduling/slots; fix in flight, don't patch in dashboard
- [todos.md](todos.md) — Future features (messaging tab, send-msg-from-popup) and backend dependencies

## Reference
- [reference_gh_cli.md](reference_gh_cli.md) — How to access gh from Claude's shell
- [reference_render_cold_boot.md](reference_render_cold_boot.md) — First API request after idle takes 30–60s; transient "Failed to fetch" is usually cold-boot
