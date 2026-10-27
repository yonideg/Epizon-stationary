# Backup & recovery (Supabase)

## What CSV export is not
CSV exports from the app are **operational copies** for spreadsheets. They are **not** a full database backup (no RLS policies, auth users, or complete relational history in one file).

## Supabase-managed backups
- **Free tier**: rely on manual exports + migration files in git.
- **Pro**: enable daily backups in project settings and test a restore in a staging project periodically.

## Manual logical backup
Use `pg_dump` with the direct connection string (Settings → Database):
```bash
pg_dump "postgresql://..." --format=custom --file=epizon-backup.dump
```

## Recovery
1. Create a new Supabase project or restore snapshot (Pro).
2. Re-apply migrations from `supabase/migrations/` if starting fresh.
3. Restore dump: `pg_restore --dbname=... epizon-backup.dump`
4. Redeploy Vercel with unchanged env keys pointing at the restored project.

## Regular owner practice
Weekly: export products, sales, and inventory movements CSV from the app after connecting export routes, plus keep Supabase backup if on Pro.
