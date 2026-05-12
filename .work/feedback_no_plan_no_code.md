---
name: Every non-trivial feature gets a plan + audit — no exceptions
description: Never skip plan-mode for new features even when the change "feels like a small addition". Always plan and run /audit-plan before touching code.
type: feedback
---
Every new feature or non-trivial change MUST go through plan-mode and `/audit-plan` before any implementation, no matter how small it feels. Do not propose "this is small enough to skip planning" — Tomer will say yes when tired and regret it later.

**Why:** On 2026-05-11 (Session 3), I shipped #3c (book-from-empty-slot) without a written plan because the surrounding patterns from #3b "made it look like an addition". The next day a TZ bug surfaced — backend rejected the booking because we constructed `${date}T${time}:00` without a timezone suffix. A `/audit-plan` pass (sensitive paths lens: "what does the backend actually accept on POST?") would have caught it. Tomer was tired and didn't push back on skipping the plan; he flagged it the next day as unacceptable.

**How to apply:**
- For any new feature, before writing or editing code: enter plan-mode → write the plan → run `/audit-plan` → present + wait for approval.
- This applies even when the feature reuses patterns from a feature just shipped — the audit lenses (sensitive paths, edge cases, verification) catch things that pattern-matching does not.
- The only exceptions are: pure bug fixes with a known root cause, single-line tweaks, doc updates, and renames.
- If the work feels too small to plan — write a 5-line plan. Five lines of plan + a 30-second audit is cheap insurance.
