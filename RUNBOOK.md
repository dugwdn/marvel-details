# Marvel Details: runbook

How to preview, publish, roll back and fix the live site.

## Preview on the laptop
```
cd C:\Users\doug\Documents\marvel-details
npm run dev        (same as: npx wrangler pages dev public --port 8788)
```
Open http://localhost:8788. This behaves like Pages, including 404s.

## Publish (needs Doug's OK)
From the repo folder, on the branch being published (normally
`phase-1-build` after a PR is merged), with a clean working copy:
```
git pull
npx wrangler pages deploy public --project-name marvel-details --branch phase-1-build --commit-hash <commit>
```
`--branch phase-1-build` makes it production. Any other branch name makes a
preview at `https://<branch>.marvel-details.pages.dev` instead.

After publishing, check:
1. https://marvel-details.pages.dev/ and each feature: `/scenes/`,
   `/callbacks/`, `/characters/`, `/map/` (the graph draws), `/rabbit-holes/`.
2. A made-up address shows "That page isn't here" (after PR #1).
3. `npx wrangler pages deployment list --project-name marvel-details`
   shows the new commit as Production.

## Member accounts (one-time setup, needs Doug)
The member perks work without this; it switches on Google sign-in and sync.
Do steps 1 to 4 before the first deploy that includes the member-perks PR:
`wrangler.toml` points at the D1 database, so a deploy fails while it still
says `REPLACE-WITH-DATABASE-ID...`.

1. **Create the database** (from the repo folder):
   ```
   npx wrangler d1 create marvel-details-members
   ```
   Copy the `database_id` it prints into `wrangler.toml` (replace
   `REPLACE-WITH-DATABASE-ID-FROM-wrangler-d1-create`), commit that change.
2. **Create the tables:**
   ```
   npx wrangler d1 migrations apply marvel-details-members --remote
   ```
3. **Google client ID:** Google Cloud console > APIs & Services > OAuth
   consent screen (External; app name "Details You Missed"; your support
   email; no extra scopes). Then Credentials > Create credentials > OAuth
   client ID > Web application. Authorized JavaScript origins:
   `https://marvel-details.pages.dev` and `http://localhost:8788` (add
   `https://marveldetails.com` after the domain moves). No redirect URI is
   needed. Copy the client ID (ends in `.apps.googleusercontent.com`).
4. **Give it to the site:**
   ```
   npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name marvel-details
   ```
   and paste the client ID. (Dashboard alternative: Workers & Pages >
   marvel-details > Settings > Variables and Secrets > Add, type Secret.
   The client ID isn't really secret; the secret type is used because
   `wrangler.toml` now manages plain variables.)
5. **Deploy** as in "Publish" above, then open https://marvel-details.pages.dev/me/:
   the account box should show "I'm 13 or older" and, once ticked, the
   Google button. Sign in, save something, open /me/ on another device.

To switch sign-in off again: delete the `GOOGLE_CLIENT_ID` secret and
redeploy; lists stay on each device.
Local preview with the API: `npx wrangler d1 migrations apply
marvel-details-members --local`, then `npx wrangler pages dev --port 8788
--binding GOOGLE_CLIENT_ID=<client id>`.
Look at the data: `npx wrangler d1 execute marvel-details-members --remote
--command "SELECT COUNT(*) FROM users"`.

## Roll back
Cloudflare dashboard > Workers & Pages > marvel-details > Deployments >
pick the last good one > the three-dot menu > **Rollback to this deployment**.

## Common problems
- **A feature page shows the home page:** before PR #1, every missing file
  did that. Check the file exists in `public/` and was in the upload.
- **Universe Map is blank:** open the browser console; the map needs
  `/data/connections.json` and the vis-network script from jsDelivr.
- **Deploy fails mentioning D1 / database_id:** `wrangler.toml` still has
  the placeholder id; do "Member accounts" steps 1 and 2.
- **My Marvel says "Sign-in is coming soon":** `GOOGLE_CLIENT_ID` isn't set
  for production, or the D1 binding is missing; check
  `npx wrangler pages secret list --project-name marvel-details`.
- **Google button says the origin isn't allowed:** add the site address to
  the client ID's Authorized JavaScript origins (step 3).
- **wrangler asks to log in:** run `npx wrangler login` on the laptop and
  sign in as Doug (Doug does this step).
