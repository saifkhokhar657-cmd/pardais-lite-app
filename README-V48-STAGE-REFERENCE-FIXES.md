# Pardais Lite V48 — Stage Reference + Real Viewer/Moderator Flow

This revision keeps the original Solo Live UI intact and changes only the active stage modes.

## Stage UI
- Co-host accepted: true One VS One split screen (Host A / Host B), not a full-screen takeover of the other host's previous Solo UI.
- Comments remain in the lower area and the normal live bottom controls remain available.
- Guest stage: 1 host + 1 guest, then 1 host + 2 guests, then 1 host + 3 guests use compact boxes.
- 4+ guests switch to the large host + 8-seat guest layout.
- PK keeps the large host + 8-seat layout.
- Stage state is loaded for normal viewers too, so viewers see the same real stage instead of the old single-remote Solo renderer.
- Remote Agora video is mapped to the real stage participant UID.
- Guest/co-host users can refresh/re-enter and receive a stage publisher token instead of being downgraded to audience.

## Viewer action sheet
- Tapping a real viewer opens the bottom action sheet.
- Top actions: Follow and Inbox/profile.
- Actions: Visit Profile, Invite as Guest, Assign/Remove Moderator, Warn, Report, Kick, Block.

## Moderator
- Moderator is persistent for the current broadcast until the host removes the role.
- Moderator can invite guests, warn/report/kick/block viewers.
- Moderator cannot end the broadcast, mute the host, switch off the host camera, or assign/remove moderators.

## Important runtime requirement
The backend still requires Firestore availability. If the API reports `RESOURCE_EXHAUSTED` (code 8), these actions cannot complete until the Firebase/Google Cloud quota/billing problem is resolved.
