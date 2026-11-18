# BK's Team

Daily updates, pipeline, clients, payments, meetings and a team dashboard. React + Vite + Firebase (Auth + Firestore).

## Commands
| Command | What it does |
|---|---|
| `npm run dev` | run locally |
| `npm run lint` | ESLint (catches undefined or unused names) |
| `npm test` | unit tests for dates, roles, reports, CSV, search, clients |
| `npm run build` | production build into `dist/` |
| `npm run check` | lint + tests + build (what CI runs) |

CI: `.github/workflows/ci.yml` runs the same checks on every push.

## Setup
1. Firebase console: Authentication > enable Email/Password.
2. Firestore Database > Rules > paste `firestore.rules` > Publish.
3. Put your web config in `.env` (`VITE_FIREBASE_*`, read by `src/firebase.js`).
4. `npm install`, then `npm run dev`.
5. Sign-up is closed. The very first head is created by hand: add the user in Firebase Authentication, then add a
   document `users/<uid>` with `name`, `email`, `role: "head"`, `roles: ["head"]`, `active: true`.
   After that, heads add people on the **Team** page. Each new person gets an email to set their own password.

## Security model (see `firestore.rules`)
- Only heads create or manage people, meetings and the sales target.
- Only heads and Sales change deals. People edit only their own updates, payments and leave.
- Disabled people (`active: false`) are signed out immediately and get no data access; their history stays.
- Heads read everyone's payments, others only their own.

## Features
Dashboard (team numbers for heads, "my week" for everyone else), daily updates with search/person/date filters,
comments on updates and deals, drag-and-drop pipeline, derived client records, payments with CSV export,
weekly summary with CSV/print, meetings, calendar, availability, in-app notifications, a 6 pm reminder banner,
installable on a phone (PWA), 5-minute idle logout.

## Folder structure
```
src/
  App.jsx, main.jsx, firebase.js
  pages/        one lazy-loaded file per screen
  components/   Modal, DatePicker, UserMenu, NotificationBell, Comments, ReminderBanner, State, charts...
  utils/        helpers (dates, roles), stats (pure report maths), reports + useCol (live data hooks),
                csv, search, clients, notify, createAccount, constants   (*.test.js next to what they test)
  styles/       index.css loads everything in order: base, layout, components, then one file per page
public/         logo, icons, manifest.webmanifest, sw.js (offline shell)
```

## Deploy to Hostinger
`npm run build`, upload everything inside `dist/` (including `.htaccess`) to `public_html`.
Add your domain in Firebase > Authentication > Settings > Authorized domains.

## Known limits (need a paid backend, not built)
Email or push reminders at 6 pm and e-mail notifications need Cloud Functions (Firebase Blaze plan).
Today the reminder and notifications work inside the app while it is open.
