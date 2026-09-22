# Collins Phillips Bowl
Football pool for the 2026–2027 season, imported from the original workbook in the parent folder.

## Run
Install dependencies with npm ci, then npm run dev. Node 22.13+ is required.
The local preview provides a mock ChatGPT sign-in. Local ADMIN_EMAIL is seedy@sites.test; it is never used in hosted configuration.
Production ADMIN_EMAIL is configured as a Sites runtime secret.

## Storage and permissions
Cloudflare D1 stores weekly data and player assignments. The workbook is an immutable initial import, seeded with INSERT OR IGNORE.
Only the administrator can manage games, scores, earnings, deadlines, and player email assignments.
Players sign in with ChatGPT and can edit only their own picks before the deadline.
Each save includes a revision to prevent overwriting concurrent changes.
Browser storage is not used for pool records.

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

## Database
Schema: db/schema.ts. Generate migrations with npm run db:generate.
Build with npm run build, then apply each new local migration using Wrangler with the generated dist/server/wrangler.json and --persist-to .wrangler/state.
Production publishing applies migrations automatically.
Export backup downloads the current pool as JSON.

## Sharing
New hosting is private to the owner. To enable other players later, add their sign-in email in Administration AND grant them viewer access through Sites sharing. Do not grant them site editor privileges.

## Validation
Run node --experimental-strip-types scripts/check-pool.mjs for scoring/deadline checks. Add --api against the local preview to check persistence, authorization, conflict detection and locked weeks.

## History
The /history page contains 2022–2023 through 2025–2026 for Bryan, Kevin, Mike, and Ed only. Champions use weekly wins and recorded earnings, with shared titles for ties. The first season is incomplete and excluded from championships. Bragging Rights picks are separate. Run node scripts/check-history.mjs to verify the import.
