# Pardais Lite V35 — Build + Username Prefix Fix

Fixes from V34:
- Fixed TypeScript nullish-coalescing precedence in Edit Profile code that caused TS5076 (`??` mixed with `||`).
- Registration username now displays a non-editable `@` prefix in the UI.
- User types only the username portion (`saif`, not `@saif`).
- Signup and Google onboarding normalize the value to exactly one leading `@` before sending to the API.
- Backend registration also normalizes incoming usernames, so `saif`, `@saif`, and `@@saif` cannot create double-@ usernames.
- Existing username format remains `@username` everywhere else.
