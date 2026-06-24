--this is just for documentation, the sql is in the supabase itself


-- first i create user and roles table for authentication later on
-- so the id must match a real user in the auth.users table
-- every profile is tied to one user, and if its not specified, its worker by default
-- and a simple data validation to ensure that the role is either worker or manager
  CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'manager'))
  );

-- workstations (factory floor stations) 
-- for now i give them id, name, location, and timestamp, pretty straightforward
  CREATE TABLE workstations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );

-- batches (one QR code per batch)
-- the qr code text should be unique and not null, AND ALSO it should be a str of 10 char
-- and i also added in a check for who created this batch, this dude must be in the authorised users table
  CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );

-- components (individual items within a batch) 
-- for now i give them id, name, current status, and timestamp, AND also which workstation it is currently at
  CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'pending' CHECK (current_status IN ('pending', 'in_progress', 'completed', 'flagged')),
    current_workstation_id UUID REFERENCES workstations(id),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

-- status logs 
-- this is the auditing 
-- on delete cascade means if the component is deleted, the status logs will be deleted too
-- yea and workstation must be someone in the workstations table
  CREATE TABLE status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    from_status TEXT, 
    to_status TEXT NOT NULL,
    workstation_id UUID REFERENCES workstations(id),
    updated_by UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ DEFAULT now()
  );

-- for now i dont create the alert configs, this is just the barebones scaffolding for now. later on then add the alert configs sql table

  ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
  ALTER TABLE components ENABLE ROW LEVEL SECURITY;
  ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;

-- this means that everyone can read their own profile
  CREATE POLICY "read own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());

-- i set such that logged-in users can read
-- so basically lets say read workstations is just a label,  and on workstation is which table it applies to, and select is for reading data only
-- to autenticated means only logged in users can read the data and there is no other conditions so using is true 
-- same logic for the rest of the tables
  CREATE POLICY "read workstations" ON workstations FOR SELECT TO authenticated USING (true);
  CREATE POLICY "read batches" ON batches FOR SELECT TO authenticated USING (true);
  CREATE POLICY "read components" ON components FOR SELECT TO authenticated USING (true);
  CREATE POLICY "read status_logs" ON status_logs FOR SELECT TO authenticated USING (true);

-- witout these lines right the row level security will not be applied, u cant  see shit at all

-- now we want the factory workers/managers to update component status and log it
-- thats why its update and insert
-- with check means that the user is checked on whether they are in the authorised users table, NOT to be confused with the actual data validation of status checks
  CREATE POLICY "update components" ON components FOR UPDATE TO authenticated USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('worker', 'manager')
  );
  CREATE POLICY "insert status_logs" ON status_logs FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('worker', 'manager')
  );

-- for now i separate workes and mangers, do let me know if you have any other suggestions for this
-- here only the managers insert batches and workstations
  CREATE POLICY "insert batches" ON batches FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );
  CREATE POLICY "insert workstations" ON workstations FOR INSERT TO authenticated WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'manager'
  );

-- ===== RPC: run_readonly_query (Ask-Your-Factory) =====
-- this is a function to run readonly queries, and not be able to modify the data
create or replace function run_readonly_query(query_text text)
 returns json
 language plpgsql
 as $$
 declare
   result json;
 begin
   -- Force read-only for everything this function runs: any INSERT/UPDATE/DELETE
   -- (even a sneaky data-modifying CTE) now errors at the database level
   execute 'set local default_transaction_read_only = on';
   -- cap runaway queries (5s). set local and hecnce scoped to this function call only
   execute 'set local statement_timeout = 5000';
   -- wrap the query as a subquery: this makes a trailing ";DROP..." a syntax error,
   -- and disallows data-modifying CTEs (Postgres forbids them inside a subselect)
   execute format('select coalesce(json_agg(t), ''[]''::json) from (%s) as t', query_text)
     into result;
   return result;
 end;
 $$;

 -- the logged-in manager calls this through the JS client as role technicallyauthenticated"
 grant execute on function run_readonly_query(text) to authenticated;