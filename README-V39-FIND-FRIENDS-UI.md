# V39 — Find Friends UI / Follow System

- Find Friends list follows the supplied reference layout.
- Every avatar is forced into a circular DP container; no square/overflowing DP is shown in the list.
- Tapping a DP opens a large circular DP viewer.
- Tapping the user's name/username opens their profile.
- Actions are data-driven: Follow, Follow back, Following, Friends.
- Friends is a completed mutual-follow state and is not accidentally toggled by tapping the button.
- Search supports real users and the page displays the total user count returned by the backend.
- Existing backend follow/search behavior is preserved.
