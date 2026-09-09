create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ''),
    case
      when new.raw_user_meta_data ->> 'purpose' in ('work', 'education', 'personal', 'child', 'other')
        then new.raw_user_meta_data ->> 'purpose'
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'help_needs', ''),
    case when new.raw_user_meta_data ->> 'locale' = 'en' then 'en' else 'da' end,
    coalesce((new.raw_user_meta_data ->> 'onboarding_completed')::boolean, false)
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
