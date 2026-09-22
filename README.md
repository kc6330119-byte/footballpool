# Football Pool
The application is in `pool-site/`. It includes the active 2026–2027 pool and a separate `/history` page with the four supplied historical seasons.

See [the application README](pool-site/README.md) for local development and pool rules.

## Hosting status
The current application was built for Cloudflare Workers through Sites. Its storage uses Cloudflare D1, and authentication uses Sites-provided identity headers.
It is **not yet compatible with Netlify**. Moving it to Netlify requires replacing or adapting the server runtime, database binding, and authentication. Merely setting a build directory will not preserve working sign-in and saved picks.

## Historical sources
Original Excel files stay local and are not committed. The imported archive contains only Bryan, Kevin, Mike, and Ed.
Champions use weekly wins/earnings. Ties share the title. The incomplete 2022–2023 archive is labeled partial and has no season title assigned.
Run `scripts/import-history.py` inside the application with Python and openpyxl to refresh from the original workbooks in this folder.
