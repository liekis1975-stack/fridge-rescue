-- Paleiskite šį failą Supabase Dashboard > SQL Editor.
create table if not exists public.saved_recipes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  meal_id text not null,
  title text not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  constraint saved_recipes_user_meal_unique unique (user_id, meal_id)
);

alter table public.saved_recipes enable row level security;

revoke all on table public.saved_recipes from anon, authenticated;
grant select, insert, delete on table public.saved_recipes to authenticated;

drop policy if exists "Users can read their saved recipes" on public.saved_recipes;
create policy "Users can read their saved recipes"
on public.saved_recipes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can save their recipes" on public.saved_recipes;
create policy "Users can save their recipes"
on public.saved_recipes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their saved recipes" on public.saved_recipes;
create policy "Users can delete their saved recipes"
on public.saved_recipes for delete to authenticated
using ((select auth.uid()) = user_id);
