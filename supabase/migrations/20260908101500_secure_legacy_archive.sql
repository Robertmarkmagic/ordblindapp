alter table private.legacy_user_mappings enable row level security;
alter table private.legacy_records enable row level security;

revoke all on all tables in schema private from public, anon, authenticated;
