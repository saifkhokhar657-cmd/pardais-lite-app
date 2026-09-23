# Pardais Lite — Live Guest / Co-Host / PK implementation

Target: current `saifkhokhar657-cmd/pardais-lite-app` main branch.

User-approved flow:
1. Eye/viewer button opens current live viewers from `/api/live/viewers/:roomId`.
2. Tapping a viewer opens profile action sheet: Follow, Block, Kick, Assign Moderator, Invite as Guest.
3. Invite as Guest creates a real `invites` document (`type=guest`).
4. Viewer receives an Accept/Reject popup.
5. Accepting guest converts that viewer's `live_members` role from `audience` to `guest` and returns a stage Agora host token.
6. Stage layout:
   - 0 guests: solo host.
   - 1–4 guests: equal stage boxes (host + guests).
   - 5+ guests: host on the large left panel + 8 guest seats on the right.
7. Host can invite another live solo host as co-host.
8. Co-host receives Accept/Reject. Accept joins the inviter's Agora channel as a stage host.
9. After co-host is attached, `PK` button appears. Tapping it sends a PK request to the co-host.
10. Co-host accepts/rejects PK. Accept activates PK state and the two-host PK header/score UI appears. Reject keeps the normal two-host stage.
11. Cross/leave on a guest/co-host removes that stage membership; it must NOT end the main host's broadcast.
12. Remove all hard-coded viewer/host/guest data from the stage UI. All identities and avatars come from API/Firestore.

Important quota rule:
- Do NOT poll Firestore-heavy endpoints every 1–2 seconds.
- Invitation delivery should use the existing API plus a single lightweight UI refresh interval (5s max) or, preferably, SSE/WebSocket later.
- Do not add a new global Firestore query loop.
