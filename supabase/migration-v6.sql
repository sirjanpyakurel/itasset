-- Migration v6: allow updating orders in your locations, so a pending order
-- can be *partially* received — its quantity reduced to the outstanding
-- balance — instead of only ever being fully delivered or cancelled.
--
-- Without this policy, RLS silently blocks the UPDATE (0 rows changed, no
-- error), which would let stock be topped up while the order stayed at its
-- full quantity and got counted again on the next delivery. The app guards
-- against that by verifying the row actually changed, but partial delivery
-- only works once this runs.
--
-- Run this in the Supabase SQL Editor (safe to run more than once).

drop policy if exists "Users can update orders in their locations" on public.orders;

create policy "Users can update orders in their locations"
    on public.orders for update
    to authenticated
    using (public.has_location_access(location_id))
    with check (public.has_location_access(location_id));
