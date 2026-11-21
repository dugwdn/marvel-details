# Sign-in data: what we get and keep

Checked against the code on 2026-10-07 (Business HQ sign-in data audit). Update this file whenever sign-in code, provider scopes or the account tables change.

"Requested" is what we ask the provider for. "Kept" is what lands in our storage. Provider tokens are only listed as kept when the code writes them.

## MCU Easter Eggs (mcueastereggs.com, repo marvel-details)

Code: `functions/_lib/auth.js`, `public/js/account.js`, `public/js/signin-popup.js`, `migrations/0001_accounts.sql`, privacy text in `public/privacy.html`.

| Sign-in | Status | Requested | Kept |
|---|---|---|---|
| Google (button and One Tap) | Live (`GOOGLE_CLIENT_ID` in wrangler.toml) | ID token (no scope) | Google id, first name (full name if none) |
| Facebook | Off until its keys are set | `public_profile`; `/me?fields=id,first_name,name` | Facebook id, first name |
| X | Off (paid per sign-in) | `users.read tweet.read` | Would keep X id, display name |
| Apple, Microsoft, TikTok, email/password | Not built | | |

Storage (Cloudflare D1 "marvel-details"):
- `users`: id, provider, provider id, name (max 24 chars, "Fan" if empty), created.
- `sessions`: SHA-256 hash of the token, user id, expires.
- `saves`: synced progress (up to 16 KB).
- Cookies: `dym_s` session (HttpOnly, 1 year), `dym_o` sign-in state (10 minutes).
- Browser storage: `dym-signed-in`, `dym-pop-*`.
- Never stored: email, photo, provider tokens, IP address, user agent.

Provider data we ignore: Google email and picture; Facebook full name when a first name exists.

Gaps found:
1. Privacy page said "first name"; full name is kept when no first name is given. Corrected in this PR.
2. Privacy page offered Facebook and X, which are off. Corrected in this PR to say Google now and Facebook coming.
