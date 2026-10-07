alter table public.documents add column if not exists source_url text;
comment on column public.documents.source_url is 'Original public URL for a user-imported web reading. The text remains a private saved copy.';
