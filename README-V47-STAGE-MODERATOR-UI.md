# Pardais Lite V47 — Co-host / Guest Stage + Moderator System

This revision preserves the existing Solo Live UI and activates additional UI only when a real stage participant is attached.

## Stage behavior
- Solo UI remains unchanged while the room is Solo.
- Co-host accepted -> One VS One split-screen stage.
- Guest accepted -> dynamic stage boxes: 1 host + 1 guest = 2 boxes; 1 host + 2 guests = 3; 1 host + 3 guests = 4.
- With 4+ guests, the layout switches to the large host + 8-seat guest grid.
- PK mode uses the large host + 8-seat side layout.
- Agora remote users are rendered per participant instead of using a single remote video container.
- Stage participants can publish real microphone/camera tracks.
- X on a stage participant leaves the stage without ending the broadcast; host stage reset returns the room to Solo.

## Viewer action sheet
- Visit Profile
- Follow (top action)
- Inbox/profile entry (top message action)
- Invite as Guest
- Assign/Remove Moderator (host only)
- Warn / Report / Kick / Block (host or moderator)

## Moderator permissions
- Moderator status is stored per room in `live_moderators` and persists until the host removes it.
- Moderator can invite viewers as guests, warn, report, kick and block viewers.
- Moderator cannot end the broadcast, mute the host, disable the host camera, or manage moderators.
- Host can remove a moderator at any time.
- Blocks are enforced when the blocked user tries to join that host's live rooms.

## Quota protection
The highest-frequency Live/Firestore polling was relaxed from ~1–3 seconds to mostly 5 seconds (available-host discovery 7 seconds). This is intended to reduce Firestore read pressure while keeping invite/stage state responsive.

## Verification note
The source was checked with TypeScript syntax/type parsing available in the environment. Full `npm run build` could not be completed because the uploaded project does not include `node_modules` and dependency installation timed out in the restricted environment.
