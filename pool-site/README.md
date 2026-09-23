# Collins Phillips Bowl
Football pool for the 2026–2027 season, imported from the original workbook in the parent folder.

## Run
Install dependencies with npm ci, then npm run dev. Node 22.13+ is required.
Copy server settings into `.env.local` for local development. See [Netlify setup](../NETLIFY-SETUP.md) for deployment and administrator account creation.

## Storage and permissions
Airtable holds the imported season and an append-only Pool Changes history of website saves. Players use email/password sign-in. Only Kevin can manage games, scores, earnings, deadlines, and player access. Players can edit only their own picks before the deadline. Passwords are stored as salted hashes, and server-signed sessions expire after seven days.

Each save has a revision check and commits all changed fields in one record. Different players' changes merge without replacing each other's picks. Truly simultaneous edits to the same field use the last change; Airtable has no transactional compare-and-swap. Browser storage is not used for pool records.

## Rules
One point for a correct winner against the listed spread. Pushes earn zero, consistent with the workbook.
Ties use the absolute distance from the last listed game's actual combined total. An equal distance remains tied for administrator resolution.
Wednesday 11:59 p.m. America/Chicago is the default. The administrator can edit each week’s deadline.
Imported Weeks 1 and 2 are closed. Week 3 defaults to September 23, 2026; subsequent deadlines advance weekly.
Payouts and team earnings are recorded by the administrator, not automatically awarded.

## Import fidelity
60 games, 18 weeks, four players, and draft schedules for Weeks 14–18 were imported.
Unmatched pick spellings remain unchanged and are flagged for correction.
Blank future-week formula totals of 20 are excluded.
Week 1 is missing Broncos–Chiefs result. Recorded winners/payouts remain Mike, $20 each for Weeks 1 and 2.
Dues are scheduled contributions, not payments received.

## Player access and backups
Assign each player's email in Administration, then create and privately share a setup link. No Sites sharing or Google account is required. The Export backup button downloads the current pool as JSON. Do not edit or delete Airtable Pool Changes records.

## Validation
Run `node --experimental-strip-types scripts/check-pool.mjs`, `node scripts/check-history.mjs`, `node --experimental-strip-types scripts/check-netlify.mjs`, and `npm run build`.

## History
The /history page contains 2022–2023 through 2025–2026 for Bryan, Kevin, Mike, and Ed only. Champions use weekly wins and recorded earnings, with shared titles for ties. The first season is incomplete and excluded from championships. Bragging Rights picks are separate. Run node scripts/check-history.mjs to verify the import.

## Private weekly picks
From Week 3, Save draft preserves an unsubmitted entry; Submit picks requires all game picks and a tiebreaker prediction. Picks are private from every other player, including the administrator, until all four submit. The fourth submission reveals the sheet and locks player editing. Wednesday alone does not reveal it. Only the Admin editor may correct picks after reveal. See the deployment guide for migration and testing details.
