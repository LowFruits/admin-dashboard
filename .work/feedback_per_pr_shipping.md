---
name: Ship cross-repo sync work as separate PRs per change
description: When backend ships multiple ADR/feature changes at once, the dashboard updates as separate PRs — never bundled
type: feedback
originSessionId: 3e4a211f-e7d2-47db-b62b-b0eb598ee415
---
When the dashboard needs to sync against multiple independent backend changes (e.g., ADR-008 availability, ADR-009 per-doctor types, new Messages entity, all shipped together), each change ships as its **own PR / branch / commit**. Don't bundle them.

**Why:** Tomer explicitly framed it that way in the ADR-008/009/Messages sync handover ("Three separate PRs — change 1, change 2, change 3. Don't bundle"). Each backend change has its own ADR or feature scope; bundling makes the dashboard PR description messy and harder to roll back surgically if one backend change is later revised.

**How to apply:**
- For sync work: identify each backend change up-front, scope each to its own PR.
- Order matters: ship breaking changes (e.g., per-doctor types) FIRST, then additive (Messages), then no-op verifies (facade).
- For purely internal dashboard polish (e.g., the Phase 3 calendar fixes), bundling related fixes in one PR is fine — this rule is specifically about sync-against-backend-changes work.
- When in doubt: ask which logical change a fix belongs to and let that drive the boundary.
