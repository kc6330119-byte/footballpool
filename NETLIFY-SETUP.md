# Publish the football pool on Netlify

The root `netlify.toml` configures the base directory (`pool-site`), build (`npm run build`), publish directory (`.next`), and Node 22. The configuration explicitly enables Netlify’s OpenNext adapter so existing projects configured as plain static sites also create server routes. No redirect-to-index.html rule is needed.

## Settings to add

In Netlify → Project configuration → Environment variables, provide these values for the production context, available to Functions/runtime:

| Name | Value |
| --- | --- |
| `AIRTABLE_API_KEY` | The existing personal access token. `AIRTABLE_PERSONAL_ACCESS_TOKEN` is also supported; set only one. |
| `AIRTABLE_BASE_ID` | Your existing base ID. |
| `AUTH_SECRET` | Copy the generated value from the ignored root `.env`. |
| `ADMIN_SETUP_TOKEN` | Copy the generated value from the ignored root `.env`. |
| `ADMIN_EMAIL` | `kc6330119@gmail.com` |

The local `.env` is never committed or uploaded. Runtime secrets must be entered in Netlify separately. Do not use a `NEXT_PUBLIC_` prefix. The app can build before secrets are configured, but sign-in and saved data require them.

After pushing this version, trigger a production deployment. The log must show a Next.js build and server functions, rather than “No build steps found.” If old UI settings conflict, set base to `pool-site`, build to `npm run build`, and publish to `.next` relative to the base, or use the settings in `netlify.toml`.

## First administrator sign-in

Open `https://cpfootballpool.netlify.app/account/setup?email=kc6330119%40gmail.com&token=YOUR_ADMIN_SETUP_TOKEN`, substituting your private token value from `.env`. A complete private URL is also saved in `.env` as `ADMIN_SETUP_URL` for convenience; this URL does not need to be added to Netlify.

Set a password of at least 12 characters. The initial setup link stops working once your password is set. You can then remove `ADMIN_SETUP_TOKEN` from Netlify and redeploy. Keep your password in a password manager.

Under **Admin**, enter each player's email, save access, and choose **Create setup link**. Copy and privately share the link yourself. It expires after 48 hours and can be used once. Players can use any email provider; no Google account or email delivery service is needed. Creating a new link also provides a password reset. Kevin can create his own reset link while signed in. If Kevin is locked out, the base owner can clear Kevin's `Password Hash` and set a new `ADMIN_SETUP_TOKEN` in Netlify to repeat initial setup.

## Airtable storage

The five imported tables remain the starting data. The site reads the current season from them. Historical seasons remain in the bundled archive.

Website saves are stored in **Pool Changes**, an append-only history applied over the imported data. Each save is a single Airtable record, avoiding partial writes across many games. Entries store only changed fields, so simultaneous saves by different players preserve both sets of picks. Use the website to manage current data once play begins; editing an imported field in Airtable will not override a newer website change to that same field. Do not edit or delete Pool Changes rows.

Stale drafts are rejected. Airtable does not offer transactional compare-and-swap: two truly simultaneous edits to the same field can both be accepted, and the later change takes precedence. Different players' fields are independent. Server checks limit players to their own picks and enforce Wednesday deadlines and started-game locks; only Kevin can change earnings and player access.

Players now also has private password hashes, setup-token hashes, expirations, and failed-login counters. Never publicly share the Players table. Passwords and setup tokens are not stored in plain text there. Five failed password attempts temporarily lock that account for 15 minutes. A password reset invalidates old sessions; sessions otherwise expire after seven days. Do not send players the Airtable token.

Normal pool reads are cached for up to 30 seconds; successful website saves invalidate the cache. Airtable plan limits apply to this entire shared base, including its existing tables. Monitor record count and API usage as saves accumulate. The app reports failures instead of pretending a save succeeded when Airtable is unavailable.

## Verify after deployment

1. Confirm the homepage and `/history` load.
2. Complete your administrator setup and confirm the Admin tab appears.
3. Create a player setup link and confirm that player can edit only their own open-week picks, with no Admin tab.
4. Save a pick and refresh; confirm it persists. Locked weeks must reject player changes.

## Local development and checks

Copy server settings into ignored `pool-site/.env.local`, then run `npm ci` and `npm run dev` inside `pool-site`. The app runs at port 5173.

Run `npm run build`, `node --experimental-strip-types scripts/check-pool.mjs`, `node scripts/check-history.mjs`, and `node --experimental-strip-types scripts/check-netlify.mjs` inside `pool-site`.

The old Cloudflare/Vinext scripts and migrations are retained as migration history; the active npm dev/build/start commands use Next.js and do not use Sites identity headers or D1.

## Private picks and submissions

From Week 3 onward, each player—including Kevin—sees only their own picks and tiebreaker prediction until all four players explicitly submit. Each submission requires a valid pick for every game and a total-points prediction. Imported entries are drafts, not automatic submissions. Weeks 1 and 2 remain visible as already-published results.

Players can save a draft or submit their entry before Wednesday's deadline. Saving a draft removes that player's submitted status. When the fourth player submits, picks become visible and all player editing locks immediately. Only the Admin editor can change picks afterward. Reveal cannot be undone by a subsequent correction. The deadline alone never reveals picks; if somebody misses it, the administrator must resolve that entry with the player, for example by extending the deadline so they can submit.

Before reveal, the Admin editor also hides other players' picks and preserves them when saving schedule or deadline changes. It cannot mark other players as submitted. Changing the matchups or spreads resets pending submission statuses so players can confirm the revised sheet. An administrator editing their own entry before reveal also clears their submission status. Export visible data contains only the information currently visible to that account.

Visibility is enforced in the API and server-rendered page, not only in the interface. Player saves use typed events in Pool Changes; replay rejects a player save after the fourth submission, even if the request began before it. Existing legacy correction records remain readable. Use Refresh pool to see other players' latest submission status.

Additional checks: `node scripts/check-submissions.mjs` and `node scripts/check-submissions-api.mjs`. The API suite starts a local production server with an in-memory Airtable substitute and never alters live records.
