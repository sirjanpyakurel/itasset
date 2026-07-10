-- Migration v2: low-stock thresholds, edit/delete audit, history preservation.
-- Run this in the Supabase SQL Editor (safe to run more than once).

-- 1. Per-item reorder threshold (used for low-stock highlighting & reorder list)
alter table public.assets
    add column if not exists reorder_level integer not null default 5
    check (reorder_level >= 0);

-- 2. Allow EDIT and DELETE entries in the history audit trail
alter table public.history drop constraint if exists history_action_check;
alter table public.history
    add constraint history_action_check
    check (action in ('ADD', 'REMOVE', 'EDIT', 'DELETE'));

-- 3. Preserve history when an asset is deleted (was: cascade delete, which
--    erased the audit trail; now the history row stays with asset_id = null)
alter table public.history alter column asset_id drop not null;
alter table public.history drop constraint if exists history_asset_id_fkey;
alter table public.history
    add constraint history_asset_id_fkey
    foreign key (asset_id) references public.assets on delete set null;

-- 4. Allow authenticated users to delete assets
drop policy if exists "Authenticated users can delete assets" on public.assets;
create policy "Authenticated users can delete assets"
    on public.assets for delete
    to authenticated
    using (true);
