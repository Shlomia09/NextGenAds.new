-- ============================================================
-- Migration: 20260813_auto_sync_cron.sql
-- Schedule auto-sync-all Edge Function every hour via pg_cron + pg_net.
--
-- PREREQUISITES (run manually in SQL Editor FIRST):
--   1. Enable pg_cron extension:
--      CREATE EXTENSION IF NOT EXISTS pg_cron;
--      CREATE EXTENSION IF NOT EXISTS pg_net;
--
--   2. Store secrets in Vault (so they're not in DB logs in plain text):
--      SELECT vault.create_secret(
--        'https://nplbghydqjapkycoiucl.supabase.co',
--        'supabase_project_url'
--      );
--      -- Replace <YOUR_SERVICE_ROLE_KEY> with your actual key:
--      SELECT vault.create_secret(
--        '<YOUR_SERVICE_ROLE_KEY>',
--        'supabase_service_role_key'
--      );
--
-- After running the prerequisites above, run this migration.
-- ============================================================

-- ── Remove any existing schedule with the same name (idempotent) ──────────
SELECT cron.unschedule('nextadsgen-auto-sync-all')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'nextadsgen-auto-sync-all'
);

-- ── Schedule: every hour at minute 0 ──────────────────────────────────────
SELECT cron.schedule(
  'nextadsgen-auto-sync-all',
  '0 * * * *',            -- Every hour at :00
  $$
  SELECT net.http_post(
    url     := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_project_url'
    ) || '/functions/v1/auto-sync-all',

    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'supabase_service_role_key'
      )
    ),

    body    := '{"trigger":"pg_cron"}'::jsonb
  );
  $$
);

-- ── Verify the job was created ────────────────────────────────────────────
-- Run this to confirm:
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'nextadsgen-auto-sync-all';
