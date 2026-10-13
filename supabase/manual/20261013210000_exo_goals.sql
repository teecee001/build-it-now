-- Exo goal memory. NOT applied automatically: run once in the Supabase SQL editor.
-- Safe to re-run. Owner-only RLS; no access for other users.
create table if not exists public.exo_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  goal text not null check (char_length(goal) between 1 and 300),
  target_amount numeric(14,2) check (target_amount is null or target_amount >= 0),
  target_date date,
  created_at timestamptz not null default now()
);
create index if not exists exo_goals_user_id_idx on public.exo_goals(user_id);

alter table public.exo_goals enable row level security;

drop policy if exists "exo_goals_select_own" on public.exo_goals;
drop policy if exists "exo_goals_insert_own" on public.exo_goals;
drop policy if exists "exo_goals_update_own" on public.exo_goals;
drop policy if exists "exo_goals_delete_own" on public.exo_goals;
create policy "exo_goals_select_own" on public.exo_goals for select to authenticated using (user_id = auth.uid());
create policy "exo_goals_insert_own" on public.exo_goals for insert to authenticated with check (user_id = auth.uid());
create policy "exo_goals_update_own" on public.exo_goals for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exo_goals_delete_own" on public.exo_goals for delete to authenticated using (user_id = auth.uid());

revoke all on public.exo_goals from anon;
grant select, insert, update, delete on public.exo_goals to authenticated;
