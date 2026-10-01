-- Paleiskite šį failą Supabase Dashboard > SQL Editor.

create table if not exists public.saved_ai_recipes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  original_recipe_id text,
  original_recipe_name text not null,
  user_request text not null,
  ai_result text not null,
  time_minutes int,
  servings int,
  priority text,
  created_at timestamptz not null default now()
);

-- Įjungiame Row Level Security (RLS)
alter table public.saved_ai_recipes enable row level security;

-- Apribojame teises: vieši (anon) vartotojai neturi prieigos, tik prisijungę (authenticated)
revoke all on table public.saved_ai_recipes from anon, authenticated;
grant select, insert, delete on table public.saved_ai_recipes to authenticated;

-- 1. Taisyklė: vartotojas mato TIK savo išsaugotus AI receptus
drop policy if exists "Users can read their saved AI recipes" on public.saved_ai_recipes;
create policy "Users can read their saved AI recipes"
on public.saved_ai_recipes for select to authenticated
using ((select auth.uid()) = user_id);

-- 2. Taisyklė: vartotojas gali išsaugoti TIK savo vardu (user_id privalo sutapti su auth.uid())
drop policy if exists "Users can save their AI recipes" on public.saved_ai_recipes;
create policy "Users can save their AI recipes"
on public.saved_ai_recipes for insert to authenticated
with check ((select auth.uid()) = user_id);

-- 3. Taisyklė: vartotojas gali ištrinti TIK savo AI receptus
drop policy if exists "Users can delete their saved AI recipes" on public.saved_ai_recipes;
create policy "Users can delete their saved AI recipes"
on public.saved_ai_recipes for delete to authenticated
using ((select auth.uid()) = user_id);
