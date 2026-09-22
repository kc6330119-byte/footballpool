# Football Pool
The application is in `pool-site/`. It includes the active 2026–2027 pool and a separate `/history` page with the four supplied historical seasons.

See [the application README](pool-site/README.md) for local development and pool rules.

## Hosting
The application now uses standard Next.js on Netlify, Airtable storage, and email/password sign-in. See [NETLIFY-SETUP.md](NETLIFY-SETUP.md) for deployment variables and first administrator setup.

The five imported Airtable tables are starting data. Website saves are committed atomically as records in the new Pool Changes table and applied when reading the pool. Manage current picks and earnings through the website after migration.

## Historical sources
Original Excel files stay local and are not committed. The imported archive contains only Bryan, Kevin, Mike, and Ed.
Champions use weekly wins/earnings. Ties share the title. The incomplete 2022–2023 archive is labeled partial and has no season title assigned.
Run `scripts/import-history.py` inside the application with Python and openpyxl to refresh from the original workbooks in this folder.
