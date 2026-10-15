-- Account currency and timezone as reported by Meta (me/adaccounts).
-- meta-oauth and MetaCallback write these in a separate best-effort update,
-- so the connection flow keeps working whether or not this has been applied.
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS currency      TEXT;
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS timezone_name TEXT;
