# OW2 Analytics (ridiculoid // buttstough)

A SquadUp-themed analytics site:
- Upload one end-of-match scoreboard screenshot (contains both players)
- Client-side OCR (Tesseract.js)
- Confirm parsed fields
- Save to Supabase (Postgres)
- Dashboards: maps, heroes, streaks

## 1) Create Supabase tables

Open Supabase SQL editor and run:

- `supabase/schema.sql`

## 2) Configure env vars

Copy `.env.example` to `.env.local` and fill:

- `APP_PASSCODE`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (not used in MVP, but kept for future client auth)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `BLOB_READ_WRITE_TOKEN`

## 3) Install + run

```bash
npm install
npm run dev
```

Visit:
- `/login` (enter passcode)
- `/import` (upload screenshot, OCR, confirm, save)
- `/dashboard`

## Notes

- OCR is heuristic by default. Always confirm values.
- Hero extraction from screenshots is best-effort; type the hero if OCR misses it.
