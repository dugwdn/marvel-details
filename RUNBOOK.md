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

## Sign-in keys (once per provider)
Google's client ID goes in `wrangler.toml` under `[vars]` (it is public). It is the
"MCU Easter Eggs website" client in the MCU Easter Eggs Google Cloud project;
its allowed origins are mcueastereggs.com, www.mcueastereggs.com and
marvel-details.pages.dev. A new domain must be added there before sign-in works on it.
Facebook and X are secrets, typed on the laptop from the repo folder:
```
npx wrangler pages secret put FACEBOOK_APP_ID --project-name marvel-details
npx wrangler pages secret put FACEBOOK_APP_SECRET --project-name marvel-details
npx wrangler pages secret put X_CLIENT_ID --project-name marvel-details
npx wrangler pages secret put X_CLIENT_SECRET --project-name marvel-details
```
Each asks for the value; paste it and press Enter. Then publish again.
Check: `https://<site>/api/auth` lists the provider, and `/account` shows its
button after the 13+ box. The database tables already exist; if the database
is ever rebuilt, run `npx wrangler d1 migrations apply marvel-details --remote`.

## Roll back
Cloudflare dashboard > Workers & Pages > marvel-details > Deployments >
pick the last good one > the three-dot menu > **Rollback to this deployment**.

## Common problems
- **A feature page shows the home page:** before PR #1, every missing file
  did that. Check the file exists in `public/` and was in the upload.
- **Universe Map is blank:** open the browser console; the map needs
  `/data/connections.json` and the vis-network script from jsDelivr.
- **wrangler asks to log in:** run `npx wrangler login` on the laptop and
  sign in as Doug (Doug does this step).
