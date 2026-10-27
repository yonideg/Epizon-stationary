# EPIZÓN Shop Management — Agent Notes

## Stack
Next.js 15 (App Router), TypeScript (strict), Tailwind CSS 4, Supabase (Postgres + Auth + RLS), Zod, Vitest.

## Layout
- `src/app/(app)/` — authenticated shell (dashboard, inventory, POS, cash, etc.)
- `src/lib/actions/` — server actions for mutations (checkout, products, cash, import)
- `src/lib/` — pure business logic (`money`, `profit`, `reorder`, `dates`)
- `supabase/migrations/` — SQL schema, RLS, helper functions

## Rules
- PostgreSQL is the source of truth; no localStorage for business data.
- Sensitive mutations use `createServiceClient()` on the server only.
- Employee role must not receive owner-only financial fields in API responses (enforce via RLS + queries).
- Use ETB formatting via `formatETB` and Addis timezone via `businessDateFromTimestamp`.

## Commands
```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Supabase
Apply migrations with Supabase CLI or SQL editor. Bootstrap first owner with `node scripts/bootstrap-owner.mjs` after setting env vars.
