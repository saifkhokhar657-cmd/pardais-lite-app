# Pardais Lite V23

## Fixes in this build
- Existing Firebase sessions enter the app immediately after the splash; the login/signup screen is only used when there is no restored session or the backend explicitly reports incomplete onboarding.
- Splash is shown briefly on each app start and no longer waits on the profile API before entering an already-authenticated session.
- Home reels preload the active reel and next two R2 media URLs and use browser cache warming; only the active reel plays.
- Added a lightweight loading spinner over the active reel while its first playable data arrives.
- Reel snapping uses one dedicated full-page flex item per reel to prevent overlapping/stuck scroll layers.
- Camera-off live state has a dedicated centered avatar layer above the backdrop instead of placing the avatar behind the small profile header avatar.
- Camera-off backdrop and centered avatar use the host's real avatar URL; no reference/fake host data is introduced.
- Existing Agora camera ON/OFF publishing remains the source of truth for the viewer's rendered video state.

## Note
A truly instant first-frame video still depends on the device/network and the R2/CDN response. V23 reduces repeat waits with preloading/cache warming and shows a loader while the active video becomes playable.
