# Weekly email reports through Gmail

In **Weekly picks**, the administrator opens **Email weekly results**, reviews the newsletter, selects players (including Kevin if desired), and presses **Submit**. After Gmail accepts all recipients, the dialog closes and the administrator stays on the same week. No recipients are selected automatically. Each email includes one printable PDF attachment of the newsletter, with the rotating photo embedded for offline viewing. The PDF uses the same saved, revealed results as the email body. No additional environment variables are needed. PDF generation happens before sending; if it fails, no email is sent.

## Gmail setup

1. Sign in to Google as `kc6330119@gmail.com` and enable 2-Step Verification.
2. Visit https://myaccount.google.com/apppasswords and create an app password named **Football Pool**.
3. In Netlify's environment variables, add these server-only settings, available to Functions:
   - `GMAIL_USER` = `kc6330119@gmail.com`
   - `GMAIL_APP_PASSWORD` = the Google-generated app password (spaces are removed by the application).
4. Deploy the newsletter code and redeploy after updating environment variables.

Never use the normal Gmail password. Do not paste credentials into chat, commit them, or use `NEXT_PUBLIC_` variables. For local sending, put these values in the ignored `pool-site/.env.local` and restart the server. The Gmail plugin connection in Codex is independent of the website's Gmail credentials.

The app uses encrypted SMTP to `smtp.gmail.com:465`. The sender and reply address use `GMAIL_USER`, which defaults to `ADMIN_EMAIL`. Selected active players' addresses come from Airtable. All selected addresses are BCC recipients; the administrator is not copied unless checked. No Resend account or verified sending domain is required.

Until configured, the newsletter can be previewed, but Submit is disabled. Photos must be published before a real email is sent from a local preview. No automatic test email is sent.

## Browser newsletter

Every email includes a “View newsletter in your browser” link to `/newsletter/N`. This is a continuous mobile-friendly page with readable scorecards and no attachment required. It requires no sign-in because it exposes only revealed weeks already visible publicly in the pool. Private, empty, and invalid weeks return 404. The page shows the latest saved results, while the email and PDF remain snapshots from sending. No player email addresses are included.

## Behavior

Reports require games and revealed picks. Unfinished results are labeled as updates. The recorded weekly winner is authoritative when present; otherwise the calculated winner is shown only if scoring and the tiebreaker resolve it. Standings include revealed weeks through the selected week. Photos rotate by week.

The server checks a signed fingerprint of results and recipient addresses before sending. Stale previews are rejected. If Gmail accepts only some addresses, the dialog stays open, identifies accepted and rejected recipients, and selects only rejected players for another attempt. SMTP does not provide guaranteed duplicate protection. After an uncertain connection failure, check Gmail Sent before retrying. Gmail acceptance does not guarantee inbox delivery; bounces may arrive later.

## Validation

- `node scripts/check-weekly-report.mjs`
- `node scripts/check-report-pdf.mjs`
- `npm run build`
- `node scripts/check-weekly-report-api.mjs` (mocked Gmail and Airtable; no real mail or data changes)

Google app password instructions: https://support.google.com/accounts/answer/185833
