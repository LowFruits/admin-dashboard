---
name: Clinic-vs-doctor redundancy (future ADR-010)
description: Tomer stated clinics are always 1:1 with doctors; clinic_id is redundant indirection across the system
type: project
originSessionId: 3e4a211f-e7d2-47db-b62b-b0eb598ee415
---
Tomer explicitly stated (2026-04-26): "the clinic is redundant since there are never 2 doctors in the same clinic." Clinics in production are 1:1 with doctors.

**Why:** The `clinic_id` field exists across `Doctor`, `Appointment`, `AppointmentType` (until ADR-009), routing rules, and slot generation. If it's truly always 1:1, every reference is redundant indirection. Removing it would simplify five models and at least three queries — but it's a wide-blast-radius change.

**How to apply:**
- This is **deferred to future ADR-010**. Don't act on it without writing the ADR first.
- When touching code that filters/scopes by clinic, prefer adding doctor-scoping in parallel rather than removing clinic outright. ADR-009 (per-doctor appointment types) is the precedent.
- If a new feature naturally wants doctor-scoping over clinic-scoping, lean doctor and flag in PR description.
- The "clinic stays as legacy field" pattern from ADR-009 is the safe transition shape until the full ADR-010 lands.

**Related:** ADR-006 (phone-number routing) routes patients to clinics — this is the canonical place to start the ADR-010 conversation, since changing routing semantics is the riskiest part.
