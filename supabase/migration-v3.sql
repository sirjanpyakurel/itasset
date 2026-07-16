-- Migration v3: purchase URL so an asset's name can link straight to the
-- product on the purchasing website.
-- Run this in the Supabase SQL Editor (safe to run more than once).

alter table public.assets
    add column if not exists purchase_url text;
