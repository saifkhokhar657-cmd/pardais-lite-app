# V54 — Stage Mode State Machine / Blink Fix

## Behaviour
- Generic `/api/live/state` can update hearts/viewer count but can no longer collapse an active stage back to SOLO.
- Stage mode changes are driven by valid stage snapshots or explicit leave/remove actions.
- Large 8-seat guest layout is unlocked only at 4+ actual `guest` members.
- Guest visual order is deterministic: host first, co-hosts next, guests after that.
- SOLO remains SOLO; ONE VS ONE remains ONE VS ONE; PK remains PK; 1–3 guests use compact guest boxes; 4+ guests use the large host + 8-seat layout.
