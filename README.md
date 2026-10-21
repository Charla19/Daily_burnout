# Daily Burnout

A playful, satirical break room for people with too many tabs open. It includes passwordless sign-in, private check-ins and crash forecasts, an oracle and fictional manager memo, a two-minute escape timer, a private archive, and a public daily challenge with reactions. The interface is in English and works on desktop and mobile.

The current visual direction is a small anti-office arcade: near-black or warm-paper backgrounds, lime, coral and lilac accents, an illustrated escapee, tactile controls and short animations. Motion is reduced when the device asks for it. The installable icon uses the same `d.` mark as the app. The escapee artwork was generated for this project and is stored locally in `public/art/escapee.png`.

## Stack

- React and Vite for the installable web app
- Node.js HTTP API and PostgreSQL on Neon
- Resend for six-digit sign-in codes
- Cloudflare Workers AI for optional personalized satire, daily prompts, and generated illustrations
- Private Neon Object Storage for challenge and user-generated illustrations

The current app does not call Firebase, Gemini, or Google Fonts. Old Firebase source files are retained locally for reference and excluded from this repository.

## Local setup

Use Node.js 22 or newer.

1. Run `npm install`.
2. Run `neon init -y --org-id org-late-dream-93108330 --project-id soft-heart-67616118 --branch production --services postgres` if the project is not yet linked.
3. Run `neon deploy` to provision Postgres and the private `daily-art` bucket and pull their variables into `.env`.
4. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `AUTH_CODE_SECRET`, `APP_URL`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` to `.env`. Get the Cloudflare values from Workers AI → Use REST API. Use an address on a verified Resend domain. Set `AUTH_CODE_SECRET` and `CRON_SECRET` to separate random 32-byte hexadecimal values. See `.env.example`.
5. Run `npm run db:migrate`.
6. Run `npm run dev` and open `http://localhost:5173`.

The local Vite server proxies `/api` to the Node server on port 3101. The Node server reads `.env.local` and `.env` from the project root.

## Deploy on Vercel

The `vercel.json` configuration builds the Vite site and sends `/api/*` to one Node.js Vercel Function. It schedules one daily challenge at 21:05 UTC, shortly after midnight in Baghdad. Link this repository to a Vercel project using the Vite preset. Configure these **server-side** environment variables for Production and Preview: `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `AUTH_CODE_SECRET`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, and `AWS_REGION`. Set `APP_URL` to the final public HTTPS origin for Production and set `CRON_SECRET` for the scheduled route. Vercel preview deployments can use their automatic `VERCEL_URL` fallback.

Run `npm run db:migrate` against the Neon database before serving traffic. For migrations, `DATABASE_URL_UNPOOLED` should be set locally or in a trusted deployment environment. Never put the database URL or Resend key in a `VITE_` variable.

Add the custom domain in the Vercel project and point its DNS records to Vercel as instructed by its dashboard. Once HTTPS is active, the PWA can be installed from the browser. Static assets are available offline; check-ins and community features need a network connection.

## Other Node hosts

Run `npm run build` and `npm start` on a Node host with HTTPS. The Node server serves `dist/` and the API from the same origin. Set `APP_URL` to that public HTTPS origin. Add the same server-side secrets and apply migrations before starting the app.

The PWA manifest and service worker are included in the production build. Browsers can offer installation when served over HTTPS. Static assets can be available offline; check-ins and community features need a network connection. The two-minute escape hatch works without signing in. Its 100 prewritten lines live in `src/affirmations.json`; a session shows up to ten of them. Its ambient music and small comic sounds are synthesized locally with Web Audio after a user tap, so no third-party sound clips or streaming service are required. Sound can be muted.

The optional desk nudge asks for notification permission only when the person schedules one. It is a local reminder while the app is open; it is **not** background Web Push. Vercel Hobby cron jobs can run only once per day, which is not precise enough for a timed focus reminder. The app says this in the nudge control.

Cloudflare receives check-in answers only when the user opts in; email addresses are never sent to Cloudflare Workers AI. If the free Workers AI quota is exhausted, check-ins use curated copy and image generation is unavailable until the quota resets. AI image posting requires a working Cloudflare token and Neon storage.

## Checks

- `npm run build`
- `npm run lint`
- `node scripts/smoke.mjs` (uses the configured Neon database, creates temporary test records, and removes them afterward)
- `node scripts/storage-check.mjs` (uploads, reads, and deletes a temporary private object)
- `node scripts/visual-check.mjs` (desktop and mobile check-in screenshots)
- `node scripts/redesign-check.mjs` (guest escape, reminder, home, community and archive at desktop and mobile widths)
- `node scripts/pwa-check.mjs` (manifest, service worker, offline shell)
- `node scripts/make-icons.mjs` (renders the matching PWA PNG icons from `public/icon.svg`)

The sign-in smoke test inserts a one-time code directly in the database to test verification without sending a message. A separate `/api/auth/request` call verifies delivery through Resend to a real mailbox.
