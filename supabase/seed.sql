  delete from status_logs;
  delete from components;
  delete from workstations;

  insert into workstations (id, name, location) values
    ('11111111-1111-1111-1111-111111111111', 'Cutting',   'Bay A'),
    ('22222222-2222-2222-2222-222222222222', 'Welding',   'Bay B'),
    ('33333333-3333-3333-3333-333333333333', 'Assembly',  'Bay C'),
    ('44444444-4444-4444-4444-444444444444', 'Painting',  'Bay D'),
    ('55555555-5555-5555-5555-555555555555', 'QA',        'Bay E'),
    ('66666666-6666-6666-6666-666666666666', 'Packaging', 'Bay F');

  insert into components (id, name, current_status)
  select gen_random_uuid(), 'Component #' || g, 'pending'
  from generate_series(1, 80) as g;

  insert into status_logs (component_id, from_status, to_status, workstation_id, timestamp)
  select
    c.id,
    case when e.k = 1 then null
         when e.k = 2 then 'pending'
         else 'in_progress' end,
    case when e.k = 1 then 'pending'
         when e.k = 2 then 'in_progress'
         when e.k = c.n then (array['completed','flagged'])[(1 + floor(random() * 2))::int]
         else 'in_progress' end,
    case when e.k >= 2
         then (array[
           '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
           '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444',
           '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666'
         ])[(1 + floor(random() * 6))::int]::uuid
         else null end,
    now()
      - ((c.n - e.k) * interval '90 minutes')
      - (random() * interval '45 minutes')
  from (select id, (4 + floor(random() * 5))::int as n from components) as c
  cross join lateral generate_series(1, c.n) as e(k);
  
  update components c set
    current_status           = latest.to_status,
    current_workstation_id   = latest.workstation_id,
    current_workstation_name = w.name
  from (
    select distinct on (component_id) component_id, to_status, workstation_id
    from status_logs
    order by component_id, timestamp desc
  ) as latest
  left join workstations w on w.id = latest.workstation_id
  where c.id = latest.component_id;
