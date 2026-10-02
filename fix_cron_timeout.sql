SELECT cron.alter_job(
  job_id  := 2,
  command := '
  SELECT net.http_post(
    url                  := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = ''supabase_project_url''
    ) || ''/functions/v1/auto-sync-all'',
    headers              := jsonb_build_object(
      ''Content-Type'',  ''application/json'',
      ''Authorization'', ''Bearer '' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = ''supabase_service_role_key''
      )
    ),
    body                 := ''{"trigger":"pg_cron"}''::jsonb,
    timeout_milliseconds := 120000
  );
'
);
