# TamTam POS - frontend

Plain HTML + JavaScript (ES modules). It never talks to the database. It calls the Laravel API
(`tamtam-api`) and uses Supabase only for login, logout and password reset.

```
index.html          starts everything (loads config.js + ui/main.js)
ui/                 UI layer: screens (pos, products, customers, stock, reports, audit), router, login
business/           Business layer: cart rules, formatting (no network, unit tested)
data/               Data layer: api.js (the only file that calls the API), auth.js (Supabase login)
scripts/            build-config.js picks .env.<environment> and builds dist/
.env.development    API + Supabase URLs for your laptop      (public values only)
.env.staging        ... for the testing copy
.env.production     ... for the real stall
```

## Run locally
1. Fill in `.env.development` (your dev Supabase publishable key).
2. `npm run build:dev`  (needs Node.js; writes `config.js` next to `index.html`)
3. Start the API: `php artisan serve` in `tamtam-api`.
4. Open `index.html` with VS Code **Live Server** (http://127.0.0.1:5500).

Use `npm run build:staging` to point your local page at the staging API instead.
The API must allow your page's address in `CORS_ALLOWED_ORIGINS`.

## Tests
`npm test` runs the business-layer tests. Manual checklist for staging is in the project notes.

## Deploy (Vercel)
Build settings come from `vercel.json` (build: `node scripts/build-config.js`, output: `dist`).
Branch `main` builds with `.env.production`, `staging` with `.env.staging`, anything else with `.env.development`.
The build stops with a clear message if an env file still has a placeholder value.
