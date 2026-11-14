SET TIME ZONE 'UTC';
SET extra_float_digits = 3;
SELECT 'database|' || pg_encoding_to_char(encoding) || '|' || datcollate || '|' || datctype
FROM pg_database WHERE datname = current_database();
SELECT format(
  $query$SELECT %L || count(*)::text || '|' || COALESCE(md5(string_agg(md5(row_to_json(t)::text), '' ORDER BY md5(row_to_json(t)::text) COLLATE "C")), md5('')) FROM %I.%I AS t$query$,
  'table|' || schemaname || '.' || tablename || '|', schemaname, tablename)
FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
AND schemaname !~ '^pg_toast' ORDER BY schemaname, tablename
\gexec
SELECT 'ext|' || extname || '|' || extversion FROM pg_extension ORDER BY extname;
SELECT 'index|' || schemaname || '.' || indexname || '|' || md5(indexdef)
FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
SELECT format('SELECT %L || last_value::text || ''|'' || is_called::text FROM %I.%I',
  'sequence|' || schemaname || '.' || sequencename || '|', schemaname, sequencename)
FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename
\gexec
SELECT 'enum|' || n.nspname || '.' || t.typname || '|' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' GROUP BY n.nspname, t.typname ORDER BY t.typname;
SELECT 'vector_rows|' || count(*) FROM public.resume_vector_chunks WHERE embedding IS NOT NULL;
SELECT 'migration|' || timestamp || '|' || name FROM public.migrations ORDER BY timestamp, name;
