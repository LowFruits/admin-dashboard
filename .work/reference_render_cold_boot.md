---
name: Render API cold-boot behavior
description: First request to the live API after idle takes 30–60s; surfaces as transient "Failed to fetch" or stuck loading
type: reference
originSessionId: 3e4a211f-e7d2-47db-b62b-b0eb598ee415
---
The Scheduling API at `https://scheduling-simulation-api.onrender.com` runs on Render's free tier, which spins down after inactivity.

**What this looks like in the dashboard:**
- Page hangs on "טוען..." for 30–60 seconds on first load of the day.
- Or surfaces as a one-time `TypeError: Failed to fetch` for whichever request hit while the server was waking up.
- Subsequent requests (within ~15 minutes of activity) are normal speed.

**When debugging a "fail to fetch" or hung-loading complaint from Tomer:** ask whether it's reproducible after a hard refresh, or transient. If transient, it's almost certainly cold-boot. Don't chase it as a real bug or open a console session over it.

If the API needs to be more responsive in the future, the upgrade path is a paid Render plan or moving to always-on infra. Not in scope for the dashboard.
