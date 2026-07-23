-- Floor View migration
-- Run dis once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- Two things happen here:
--   1. workstations gets pos_x / pos_y so the manager's drag-and-drop layout STICKS.
--      Without these the floor map still works, it just auto-arranges into a grid
--      every reload and dragging is session-only.
--   2. the tables get added to the realtime publication so the map updates itself
--      when a worker scans something, instead of needing a refresh.

-- ---------------------------------------------------------------------------
-- 1. Where each station sits on the manager's floor plan
-- ---------------------------------------------------------------------------

alter table workstations
  add column if not exists pos_x double precision,
  add column if not exists pos_y double precision;

comment on column workstations.pos_x is
  'X position on the manager floor map. Null means "never been dragged, auto-place it".';
comment on column workstations.pos_y is
  'Y position on the manager floor map. Null means "never been dragged, auto-place it".';

-- ---------------------------------------------------------------------------
-- 2. Let the floor map listen for live changes
-- ---------------------------------------------------------------------------
-- supabase_realtime already exists on a stock project. adding a table twice throws,
-- so each one is wrapped — dis whole script stays safe to re-run.

do $$
begin
  begin
    alter publication supabase_realtime add table components;
  exception when duplicate_object then
    raise notice 'components already in supabase_realtime, skipping';
  end;

  begin
    alter publication supabase_realtime add table status_logs;
  exception when duplicate_object then
    raise notice 'status_logs already in supabase_realtime, skipping';
  end;

  begin
    alter publication supabase_realtime add table workstations;
  exception when duplicate_object then
    raise notice 'workstations already in supabase_realtime, skipping';
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Managers need to be able to save a layout
-- ---------------------------------------------------------------------------
-- The existing update policy on workstations already covers the new columns, since
-- postgres policies apply per-row not per-column. Nothing extra needed — dis comment
-- is here so nobody goes looking for a missing policy later.

-- ---------------------------------------------------------------------------
-- Sanity check: should return 5 station rows with pos_x / pos_y present (null is fine)
-- ---------------------------------------------------------------------------
-- select name, pos_x, pos_y, is_final_station from workstations order by name;
