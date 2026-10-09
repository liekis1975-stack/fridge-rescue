-- Paleiskite šį failą Supabase Dashboard > SQL Editor.

create table if not exists public.kitchen_items (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_name text not null,
  created_at timestamptz default now()
);

alter table public.kitchen_items enable row level security;

revoke all on table public.kitchen_items from anon, authenticated;
grant select, insert, delete on table public.kitchen_items to authenticated;

drop policy if exists "Users can read their kitchen items" on public.kitchen_items;
create policy "Users can read their kitchen items"
on public.kitchen_items for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their kitchen items" on public.kitchen_items;
create policy "Users can add their kitchen items"
on public.kitchen_items for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their kitchen items" on public.kitchen_items;
create policy "Users can delete their kitchen items"
on public.kitchen_items for delete to authenticated
using ((select auth.uid()) = user_id);
