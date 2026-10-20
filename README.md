# Daily Burnout

A small daily check-in app with a dry sense of humor. It includes passwordless sign-in, a personal reset note, a private archive, and one public break-room prompt each day. The interface is in English and works on desktop and mobile.

## Stack

- React and Vite for the installable web app
- Node.js HTTP API and PostgreSQL on Neon
- Resend for six-digit sign-in codes

The current app does not call Firebase, Gemini, or Google Fonts. Old Firebase source files are retained locally for reference and excluded from this repository.

## Local setup

Use Node.js 22 or newer.

1. Run `npm install`.
2. Run `neon init -y --org-id org-late-dream-93108330 --project-id soft-heart-67616118 --branch production --services postgres` if the project is not yet linked.
3. Run `neon deploy` to pull Neon connection variables into `.env`.
4. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `AUTH_CODE_SECRET`, and `APP_URL` to `.env`. Use an address on a verified Resend domain. Set `AUTH_CODE_SECRET` to a random 32-byte hexadecimal value. See `.env.example`.
5. Run `npm run db:migrate`.
6. Run `npm run dev` and open `http://localhost:5173`.

The local Vite server proxies `/api` to the Node server on port 3101. The Node server reads `.env.local` and `.env` from the project root.

## Deploy on Vercel

The `vercel.json` configuration builds the Vite site and sends `/api/*` to one Node.js Vercel Function. Link this repository to a Vercel project using the Vite preset. Configure these **server-side** environment variables for Production and Preview: `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `AUTH_CODE_SECRET`. Set `APP_URL` to the final public HTTPS origin for Production. Vercel preview deployments can use their automatic `VERCEL_URL` fallback.

Run `npm run db:migrate` against the Neon database before serving traffic. For migrations, `DATABASE_URL_UNPOOLED` should be set locally or in a trusted deployment environment. Never put the database URL or Resend key in a `VITE_` variable.

Add the custom domain in the Vercel project and point its DNS records to Vercel as instructed by its dashboard. Once HTTPS is active, the PWA can be installed from the browser. Static assets are available offline; check-ins and community features need a network connection.

## Other Node hosts

Run `npm run build` and `npm start` on a Node host with HTTPS. The Node server serves `dist/` and the API from the same origin. Set `APP_URL` to that public HTTPS origin. Add the same server-side secrets and apply migrations before starting the app.

The PWA manifest and service worker are included in the production build. Browsers can offer installation when served over HTTPS. Static assets can be available offline; check-ins and community features need a network connection.

## Checks

- `npm run build`
- `npm run lint`
- `node scripts/smoke.mjs` (uses the configured Neon database, creates temporary test records, and removes them afterward)

The sign-in smoke test inserts a one-time code directly in the database to test verification without sending a message. A separate `/api/auth/request` call verifies delivery through Resend to a real mailbox.
