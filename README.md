# RiderIQ

A private, admin-only web app for tracking a motorbike hire-purchase business: bikes leased to riders under weekly payment plans, automatic missed-payment flagging against a 3-strike grace policy, and "Prince" — an AI assistant that answers questions about the business by querying live Firestore data.

## Stack

- Next.js (App Router) on Vercel
- Firebase: Firestore, Auth (single admin, email/password), Storage
- Tailwind CSS
- Vercel Cron for the daily missed-payment sweep
- Groq API (GPT-OSS 120B) for Prince, called server-side only

## 1. Firebase project setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Email/Password**.
3. Enable **Firestore** (in production mode — rules are provided in this repo).
4. Enable **Storage**.
5. Add a **Web app** to the project (Project settings → General → Your apps) and copy the config values into `.env.local` (see below).
6. Go to **Project settings → Service accounts → Generate new private key** to get the Admin SDK credentials, also into `.env.local`.

## 2. Environment variables

Copy the example file and fill in the values from step 1, plus your Groq API key (from [console.groq.com/keys](https://console.groq.com/keys)):

```bash
cp .env.local.example .env.local
```

## 3. Install dependencies

```bash
npm install
```

## 4. Create the admin account

There is no public sign-up flow. Create the single admin user (and set the custom claim that Firestore/Storage rules check) with:

```bash
ADMIN_EMAIL=you@business.com ADMIN_PASSWORD='a-strong-password' npm run setup-admin
```

This reads the Firebase Admin credentials from `.env.local`. Re-run it any time to reset the admin password.

## 5. Deploy Firestore & Storage security rules

Both `firestore.rules` and `storage.rules` restrict all reads/writes to the authenticated admin (checked via the `admin: true` custom claim set by the script above) — no public access.

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
firebase use --add               # select your Firebase project
firebase deploy --only firestore:rules,storage:rules
```

## 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`, which redirects to `/login`.

## 7. Deploy to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add all the variables from `.env.local` (except `ADMIN_EMAIL`/`ADMIN_PASSWORD`, which are only needed locally for the setup script) as Vercel Environment Variables.
3. Set `CRON_SECRET` to a random string in Vercel's env vars too — `vercel.json` schedules `GET /api/cron/sweep` daily at `0 0 * * *`, which is midnight in Africa/Accra (UTC+0, no DST) since Vercel Cron runs in UTC. Vercel automatically sends `CRON_SECRET` as a bearer token when invoking cron routes.
4. Deploy.

## How the missed-payment sweep works

- **Cron (`/api/cron/sweep`)**: once daily, finds every `pending` payment across active bikes where `dueDate < today`, marks it `missed`, and recomputes that bike's `missedCount` and status. If `missedCount` exceeds the bike's `graceAllowance` (default 3), the bike is flagged `repossession_flagged`.
- **Live fallback**: the dashboard and bike-detail pages never trust `missedCount` alone — they recompute grace/missed status live from the payment schedule on every read (`src/lib/payments.ts`), using the same pure logic the cron uses. This means the UI is always accurate even if the cron hasn't run yet that day.
- **Marking paid**: only ever happens from an explicit admin click ("Mark paid" on the bike detail page). If the payment being marked was missed/overdue, `paidDate` and `madeUpDate` are both recorded, and it appears in the missed-payment log.

## Prince

Prince (`/api/prince`) runs on Groq (Llama 3.3 70B), given a fixed set of read-only tools (`src/lib/prince/tools.ts`) that query Firestore directly — it never answers with a number it didn't get from a tool call. It cannot write to any record; if asked to take an action, it says so and points back to the relevant screen.
