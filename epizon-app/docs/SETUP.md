# EPIZÓN — Setup & Deployment

## 1. Create Supabase project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a project (region close to Ethiopia if available).
2. Note **Project URL**, **anon key**, and **service role key** (Settings → API).

## 2. Apply database migrations
Using Supabase CLI (recommended):
```bash
npm i -g supabase
supabase login
cd epizon-app
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```
Or run each file in `supabase/migrations/` in order in the SQL Editor.

## 3. Configure environment
Copy `.env.example` to `.env.local` and fill in values.

## 4. Bootstrap first owner
```bash
node scripts/bootstrap-owner.mjs
```
Creates an Auth user, `profiles` row with `role = owner`, using `BOOTSTRAP_OWNER_*` env vars.

## 5. Run locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000), sign in as owner, then:
1. Settings — confirm business name and reorder defaults.
2. Inventory — add products or import CSV with opening stock and costs.
3. Cash — employee opens shift before POS sales.
4. POS — record sales; print receipts.

Create employee users in Supabase Auth, then insert/update `profiles` with `role = employee`.

## 6. Deploy to Vercel
1. Push repository to GitHub.
2. Import project in Vercel; set root directory to `epizon-app` if the repo includes the parent folder.
3. Add the same environment variables (never expose `SUPABASE_SERVICE_ROLE_KEY` to the client).
4. Deploy and verify login + POS against production Supabase.

## 7. Verify live deployment
- Owner login and dashboard loads with real (empty) metrics.
- Employee login redirects to POS; `/reports` blocked for employee.
- Complete a test sale; confirm stock movement in Supabase.

## Initial data entry (recommended order)
1. Business settings and categories.
2. Suppliers (optional).
3. Products with opening stock and purchase costs.
4. Opening cash via first cashier shift.
5. Opening supplier balances (owner-only) if any.

## Daily employee procedure
1. Open cash shift with counted drawer cash.
2. Sell via POS; use split payments when needed.
3. Record any approved cash expenses (owner) separately.
4. Close shift; count cash; note variance.
