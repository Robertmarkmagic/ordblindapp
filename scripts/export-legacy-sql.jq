.tables
| to_entries[] as $table
| $table.value.records[]
| "insert into private.legacy_records (entity_name, legacy_record_id, legacy_user_id, payload) values (convert_from(decode('\($table.key | @base64)', 'base64'), 'UTF8'), convert_from(decode('\((.id // "") | tostring | @base64)', 'base64'), 'UTF8'), nullif(convert_from(decode('\((.overskill_user_id // .author_id // .looked_up_by // "") | tostring | @base64)', 'base64'), 'UTF8'), ''), convert_from(decode('\((. | tojson) | @base64)', 'base64'), 'UTF8')::jsonb) on conflict (entity_name, legacy_record_id) do update set legacy_user_id = excluded.legacy_user_id, payload = excluded.payload;"
