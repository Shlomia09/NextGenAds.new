-- Migration: 20260913000000_dev_handoff_table
-- Creates _dev_handoff table for cross-session handoff tracking.
-- Readable by service_role only (no public RLS policy).

CREATE TABLE IF NOT EXISTS public._dev_handoff (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  commit_sha text,
  summary    text,
  open_items text,
  blockers   text
);

ALTER TABLE public._dev_handoff ENABLE ROW LEVEL SECURITY;
-- No public policies: service role access only