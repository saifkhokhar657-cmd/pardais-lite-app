# Pardais Lite V32 — Production Live/Entry/Invite Fixes

- Discover cards refresh every 1 second.
- Backend keeps only the newest non-stale live room per host; stale rooms expire after 8 seconds.
- Starting a new live ends the host's previous live rooms, preventing stacked old cards.
- Ending a broadcast ends all live rooms owned by that host, so the Discover card disappears cleanly.
- Host heartbeat is every 2 seconds so real-time presence is reliable.
- Live cards use the host's full profile image as the card background with cover crop.
- Viewer-ended broadcast flow remains: "This broadcast has ended" + 5-second auto return to Live.
- Entry animation uses the viewer's real level, with tiers 1–9 Starter, 10 Silver, 20 Gold, 30 Diamond, 40 Royal, 50 Ultimate, within the app's 50-level maximum.
- Co-host invite endpoint/list only exposes a solo live host; guest/cohost/PK occupied hosts are excluded.
- Viewer tap action menu remains: Visit Profile, Make Moderator, Invite as Guest.
