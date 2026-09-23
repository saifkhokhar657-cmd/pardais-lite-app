# Frontend integration — current `src/AgoraLiveRoom.tsx`

Replace the current single-remote-video implementation with a stage renderer that:
- tracks all `client.remoteUsers` in a map keyed by Agora UID;
- fetches `/api/live/stage/:roomId` to map Agora UID -> user/profile/role;
- uses `/api/live/stage/token` when a user is a guest/co-host;
- renders:
  * solo: host full stage
  * 1–4 guests: host + guest boxes
  * 5–8 guests: host large left + 8 right-side seats
  * co-host: host + co-host split
  * PK: same two-host split with PK header/score
- keeps comments below the stage;
- keeps the eye button for `/api/live/viewers/:roomId`;
- viewer action sheet has Follow, Block, Kick, Assign Moderator, Invite as Guest;
- incoming guest and co-host requests have Accept/Reject;
- after co-host accept, show `PK` action;
- PK request Accept starts `pk_matches.status=active`; Reject does not alter the two-host stage;
- cross button for co-host/guest calls `/api/live/stage/leave`; host cross still ends the broadcast;
- remove any hard-coded "Areeba", "Mr Adeeb", "Alex (Guest)", etc. from production rendering.

Do not reintroduce 1-second room polling. Use a 5-second maximum fallback refresh only for stage/invite status until SSE is added.
