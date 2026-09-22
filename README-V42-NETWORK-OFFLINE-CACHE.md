# Pardais Lite V42 — Network Errors + Offline Reel Cache

## Changes
- Added a global connection/error notice for API/network failures.
- Offline state clearly says the user is not connected and provides Reconnect.
- API errors such as Failed to fetch, timeouts, 5xx and auth errors are converted to user-friendly messages.
- Unhandled browser errors/rejected promises also surface through the app notice.
- Reel feed metadata is saved locally for the current feed mode.
- Up to 5 reel media files are prefetched into IndexedDB for offline playback.
- When the feed API is unavailable, cached feed metadata is used and cached videos are rendered where available.
- New reels continue to be prefetched when the connection is available.
- Video upload, profile-picture upload and Go Live errors now use the same user-facing error system.
- Existing V41 upload/R2 flow is preserved.

## Cache behavior
The app keeps the newest five cached reel files in IndexedDB. This is intentionally limited to five videos to avoid uncontrolled storage growth. Browser storage quotas still apply.

## Important
Direct media caching requires the media URL to permit browser CORS. If a media object cannot be prefetched, the app keeps using the normal network URL and shows the connection error when the network is unavailable.
