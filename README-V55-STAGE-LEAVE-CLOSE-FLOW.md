# V55 — Stage Leave / Broadcast Close Flow

- Host cannot jump directly from Guest/PK/One-vs-One to Solo by pressing the top close button.
- In stage mode, host must remove/leave all non-host stage participants first.
- Removing participants is one-by-one; the broadcast remains live.
- When the last guest/co-host is removed/leaves, the host returns to Solo.
- Once Solo, the top X opens the existing broadcast-close confirmation instead of silently leaving.
- A co-host/guest pressing X leaves their stage seat and returns to the same broadcast as an audience participant; it does not close the broadcast.
- Stage-mode state remains locked against transient Firestore SOLO snapshots until an explicit stage exit is completed.
- Existing Solo UI is preserved.
