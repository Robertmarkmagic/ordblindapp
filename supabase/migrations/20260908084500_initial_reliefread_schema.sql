create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  purpose text check (purpose is null or purpose in ('work', 'education', 'personal', 'child', 'other')),
  help_needs text,
  locale text not null default 'da' check (locale in ('da', 'en')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'tester', 'premium', 'team')),
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  trial_ends_at timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  default_font text not null default 'lexend',
  default_background_tint text not null default 'cream',
  default_voice text not null default 'default',
  default_playback_speed numeric not null default 1,
  default_font_size numeric not null default 18,
  default_word_spacing numeric not null default 0,
  default_bionic boolean not null default false,
  default_line_height numeric not null default 1.7,
  default_letter_spacing numeric not null default 0,
  app_preferences jsonb not null default '{"aesthetic":"calm","decorations":true,"gentleMessages":true,"toolbar":["read","write","explain","riley"]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content_raw text not null default '',
  language text not null default 'auto' check (language in ('auto', 'da', 'en')),
  listened boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_user_created_idx on public.documents (user_id, created_at desc);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null default '',
  anchor_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_document_idx on public.notes (user_id, document_id);

create table public.dictionary_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  language text not null default 'auto' check (language in ('auto', 'da', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, word, language)
);

create table public.lookups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  source_text text not null,
  source_lang text,
  target_lang text,
  kind text check (kind is null or kind in ('explain', 'translate')),
  result_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lookups_user_document_idx on public.lookups (user_id, document_id, created_at desc);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  public_slug text not null unique,
  title text not null default '',
  content_raw text not null default '',
  language text not null default 'auto',
  settings_json text not null default '{}',
  sharer_premium boolean not null default false,
  view_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index share_links_user_document_idx on public.share_links (user_id, document_id, created_at desc);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  documents_created integer not null default 0 check (documents_created >= 0),
  tts_seconds_used integer not null default 0 check (tts_seconds_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table public.trial_signups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  purpose text not null check (purpose in ('work', 'education', 'personal', 'child', 'other')),
  help_needs text,
  locale text not null default 'da' check (locale in ('da', 'en')),
  status text not null default 'pending' check (status in ('pending', 'invited', 'activated', 'declined')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index trial_signups_email_active_idx
  on public.trial_signups (lower(email))
  where status in ('pending', 'invited', 'activated');

create table private.legacy_user_mappings (
  legacy_user_id text primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  mapped_at timestamptz
);

create table private.legacy_records (
  id uuid primary key default gen_random_uuid(),
  entity_name text not null,
  legacy_record_id text not null,
  legacy_user_id text,
  payload jsonb not null,
  imported_at timestamptz not null default now(),
  unique (entity_name, legacy_record_id)
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, locale)
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'da' end
  )
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'subscriptions', 'user_settings', 'documents', 'notes',
    'dictionary_words', 'lookups', 'share_links', 'usage_counters'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

alter table public.trial_signups enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy user_settings_select_own on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy documents_select_own on public.documents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy documents_insert_own on public.documents
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy documents_update_own on public.documents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy documents_delete_own on public.documents
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy notes_select_own on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy notes_insert_own on public.notes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
create policy notes_update_own on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
create policy notes_delete_own on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy dictionary_words_select_own on public.dictionary_words
  for select to authenticated using ((select auth.uid()) = user_id);
create policy dictionary_words_insert_own on public.dictionary_words
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy dictionary_words_update_own on public.dictionary_words
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy dictionary_words_delete_own on public.dictionary_words
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy lookups_select_own on public.lookups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy lookups_insert_own on public.lookups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy lookups_update_own on public.lookups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy lookups_delete_own on public.lookups
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy share_links_select_own on public.share_links
  for select to authenticated using ((select auth.uid()) = user_id);
create policy share_links_insert_own on public.share_links
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = (select auth.uid())
    )
  );
create policy share_links_update_own on public.share_links
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy share_links_delete_own on public.share_links
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy usage_counters_select_own on public.usage_counters
  for select to authenticated using ((select auth.uid()) = user_id);
create policy usage_counters_insert_own on public.usage_counters
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy usage_counters_update_own on public.usage_counters
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function private.set_updated_at();
create trigger documents_set_updated_at before update on public.documents
  for each row execute function private.set_updated_at();
create trigger notes_set_updated_at before update on public.notes
  for each row execute function private.set_updated_at();
create trigger dictionary_words_set_updated_at before update on public.dictionary_words
  for each row execute function private.set_updated_at();
create trigger lookups_set_updated_at before update on public.lookups
  for each row execute function private.set_updated_at();
create trigger share_links_set_updated_at before update on public.share_links
  for each row execute function private.set_updated_at();
create trigger usage_counters_set_updated_at before update on public.usage_counters
  for each row execute function private.set_updated_at();
create trigger trial_signups_set_updated_at before update on public.trial_signups
  for each row execute function private.set_updated_at();

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.dictionary_words to authenticated;
grant select, insert, update, delete on public.lookups to authenticated;
grant select, insert, update, delete on public.share_links to authenticated;
grant select, insert, update on public.usage_counters to authenticated;

revoke all on public.trial_signups from anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
