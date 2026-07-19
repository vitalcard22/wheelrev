# WheelRev

A car showroom website — browse by brand, filter by price/type, compare cars side by side.

This repo is split into two parts, so a backend can be built out over time without
touching the frontend:

```
wheelrev/
├── frontend/          Static site (HTML/CSS/JS) — the part users see
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── data.js    Car inventory data (currently hardcoded here)
│       └── app.js      All page logic — filtering, search, compare, etc.
│
└── backend/           Node/Express API (early skeleton, not yet connected)
    ├── src/
    │   ├── index.js         Server entry point
    │   ├── routes/cars.js   GET /api/cars endpoints
    │   └── data/cars.json   Same car data, as JSON (seed data)
    └── package.json
```

## Current state

- **Frontend** is fully working — open `frontend/index.html` in a browser, or deploy
  the `frontend/` folder to any static host (Vercel, Netlify, GitHub Pages).
- **Backend** calls a **real PostgreSQL database** for car data — tested end-to-end,
  including creating, updating, and deleting cars. If no database is configured
  (`DATABASE_URL` not set), it automatically falls back to reading `cars.json`
  instead, so the site keeps working either way.
- The frontend calls the backend at page load. If the backend is unreachable, the
  frontend falls back to its own bundled data — two independent safety nets.

## Setting up the database

You need a PostgreSQL database somewhere — either installed locally, or a free
hosted one (e.g. [Neon](https://neon.tech) — free tier, no credit card, gives you
a connection string in about a minute).

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in `DATABASE_URL` with your connection string
3. Apply the schema (creates the `cars` table):
   ```bash
   psql "$DATABASE_URL" -f backend/src/db/schema.sql
   ```
   (If you're using a hosted provider like Neon, they usually have a "SQL Editor"
   in their dashboard where you can paste the contents of `schema.sql` instead.)
4. Load the car data into it:
   ```bash
   cd backend
   npm run seed
   ```
5. Start the backend as usual (`npm run dev`) — it will now use the real database.

## Running both together locally

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev
# → running on http://localhost:4000

# Terminal 2 — frontend
cd frontend
# just open index.html in a browser, or serve it:
npx serve .
```

With the backend running, open the frontend and check the browser console —
it will log `WheelRev: loaded 200 cars from backend API.` if the connection worked,
or a fallback warning if it couldn't reach the backend.

## Using the admin panel

Open `frontend/admin.html` in a browser (with the backend running). It'll ask
for an admin token — that's whatever you set `ADMIN_TOKEN` to in `backend/.env`.

From there you can search, add, edit, and delete cars — changes go straight
into the database and show up on the main site immediately.

**Important:** this is a basic shared-password gate, not real authentication
(no accounts, no encryption, no rate limiting). It's fine for you testing this
alone, but before this is deployed somewhere public, it needs proper auth —
the same pattern used for the Oakstone admin login is a good model to copy.

## Roadmap

- [x] Connect frontend to backend API (with automatic fallback to bundled data)
- [x] Real database (PostgreSQL, with automatic fallback to JSON if unavailable)
- [x] Admin panel to add/edit/remove cars and update prices without touching code
      (basic token protection only — needs real auth before going live publicly)
- [ ] Real car images via a licensed image API (currently using free stock photos —
      see the disclaimer in the site footer)
- [ ] Deploy frontend + backend (Vercel + Fly.io, matching the existing workflow)
