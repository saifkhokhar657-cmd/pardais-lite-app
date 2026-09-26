# V46 — Live Guest / Co-host / PK Invite System

Implemented on top of V45 without replacing the existing Solo Live UI.

## Added
- Viewer list is clickable from the Eye/Viewers control.
- Tapping a real viewer opens actions: Visit Profile, Follow, Assign Moderator, Invite as Guest, Kick, Block.
- Real guest invite request + Accept/Reject flow.
- Real co-host invite request + Accept/Reject flow.
- Co-host acceptance joins the inviter's Agora channel as a publisher without ending the inviter's broadcast.
- Guest acceptance joins the live stage as a publisher.
- Stage leave endpoint so guest/co-host leaving does not end the broadcast.
- Stage membership endpoint for current host/co-host/guest participants.
- PK request + Accept/Reject endpoints and PK button once two host/co-host stage participants are attached.
- Kick now removes the target from the live membership when requested by the room host.
- Moderator action marks the live member as moderator.

## Important
- Existing Solo UI markup/styles were preserved; new controls are additive overlays/actions.
- The project could not be fully npm-built in this environment because dependency installation timed out/no network package installation was available. TypeScript parsing was checked with the system TypeScript compiler; dependency-resolution errors are expected without node_modules.
- Firebase/Firestore `RESOURCE_EXHAUSTED` must still be resolved in billing/quota before production API calls can succeed. This package does not bypass Firebase limits.
