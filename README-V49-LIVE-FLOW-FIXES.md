# Pardais Lite V49 — Live Flow Fixes

This revision addresses the live-stage issues reported in testing.

## Changes
- Solo UI remains additive/unchanged.
- Comment usernames are clickable in Solo mode and open the viewer action sheet.
- Viewer action sheet supports profile, follow/inbox, guest invite, moderator assignment/removal, warn, report, kick and block according to permissions.
- Co-host acceptance transitions to the shared One VS One stage without the old solo membership cleanup removing the accepted participant.
- Guest acceptance transitions to the guest stage without deleting the newly promoted guest membership during the old viewer cleanup.
- Host-side accepted co-host detection refreshes the stage immediately instead of waiting for a long visual transition.
- Transient Agora signal drops now show a quiet "Reconnecting…" loader and retry automatically.
- Global error reporting no longer turns every ordinary API 4xx/5xx response into a noisy connection banner. Fatal/unhandled errors can still reach the app error tracker.
- After repeated live connection failure, a real retry/error state is shown.
