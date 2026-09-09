create index if not exists notes_document_idx on public.notes (document_id);
create index if not exists lookups_document_idx on public.lookups (document_id);
create index if not exists share_links_document_idx on public.share_links (document_id);
create index if not exists trial_signups_user_idx on public.trial_signups (user_id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_purpose text;
  signup_locale text;
  signup_name text;
  signup_help text;
begin
  signup_name := nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), '');
  signup_help := nullif(new.raw_user_meta_data ->> 'help_needs', '');
  signup_locale := case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'da' end;
  signup_purpose := case
    when new.raw_user_meta_data ->> 'purpose' in ('work', 'education', 'personal', 'child', 'other')
      then new.raw_user_meta_data ->> 'purpose'
    else null
  end;

  insert into public.profiles (
    user_id,
    display_name,
    purpose,
    help_needs,
    locale,
    onboarding_completed
  )
  values (
    new.id,
    signup_name,
    signup_purpose,
    signup_help,
    signup_locale,
    coalesce((new.raw_user_meta_data ->> 'onboarding_completed')::boolean, false)
  )
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if coalesce((new.raw_user_meta_data ->> 'trial_signup')::boolean, false) then
    insert into public.trial_signups (
      user_id,
      name,
      email,
      purpose,
      help_needs,
      locale,
      status,
      consent_at
    )
    values (
      new.id,
      coalesce(signup_name, split_part(coalesce(new.email, ''), '@', 1)),
      coalesce(new.email, ''),
      coalesce(signup_purpose, 'other'),
      signup_help,
      signup_locale,
      'invited',
      now()
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
