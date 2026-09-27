# V52 — Stage Stability + Host Guest Controls

## Fixes
- Locks stage mode once a guest/co-host/PK state is active so transient Firestore reads cannot flash the Solo layout.
- Keeps the last valid stage member snapshot when a transient stage response is empty.
- Orders stage members Host → Co-host → Guest so the Host stays in the primary/left position.
- One VS One remains 50/50 in the upper stage; lower interaction zone stays reserved for comments/gifts/controls.
- 4+ guests use Host-left + 8-seat right-side layout.
- Host can tap a guest/co-host seat and open stage controls.
- Host controls: Visit Profile, Give/Remove Camera Access, Mute/Unmute Mic, Remove from Seat.
- Guest camera starts unavailable until the Host grants camera access; guest can then turn camera on/off themselves.
- Guest mic remains self-controlled unless the Host mutes it.
- Removing a guest/co-host returns them to audience without ending the broadcast.
- Transient reconnects stay as a quiet loader; the old Solo video layer is hidden while stage mode is locked.

## Validation
- TypeScript parser checks completed with global `tsc`; dependency-resolution errors remain because this working copy has no `node_modules`.
