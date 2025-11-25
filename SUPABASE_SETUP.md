# Supabase Setup for Funbox

This document provides SQL and guidance to create the minimal tables and Row Level Security (RLS) policies used by the app.

## Required tables

Run these SQL statements in the Supabase SQL editor (or via `psql`):

-- users table (profile rows linking to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  email text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- download_links table
CREATE TABLE IF NOT EXISTS public.download_links (
  id bigserial PRIMARY KEY,
  title text,
  url text,
  created_at timestamptz DEFAULT now()
);

## Recommended Row Level Security (RLS)

Enable RLS and add minimal policies so users can manage their own profile rows, and allow public read for download links.

-- enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- allow authenticated users to INSERT a profile for themselves
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- allow authenticated users to SELECT their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- allow authenticated users to UPDATE their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins: to allow privileged operations (managed from the Admin dashboard), it's common to use a custom claim on the JWT
-- or keep a separate `role` column and create a policy that allows users with role = 'admin' to SELECT/UPDATE/DELETE arbitrary rows.

-- Example policy to allow admin users (based on `role` column) to manage users table
CREATE POLICY "users_admin_manage" ON public.users
  FOR ALL
  USING ( (auth.role() = 'authenticated' AND exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')) )
  WITH CHECK ( (auth.role() = 'authenticated' AND exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')) );

-- enable RLS on download_links
ALTER TABLE public.download_links ENABLE ROW LEVEL SECURITY;

-- allow public read for download_links
CREATE POLICY "download_links_public_read" ON public.download_links
  FOR SELECT
  USING (true);

-- allow admin-only insert/update/delete for download_links using same admin existence check
CREATE POLICY "download_links_admin_manage" ON public.download_links
  FOR ALL
  USING ( exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') )
  WITH CHECK ( exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin') );

Notes:
- The `auth.uid()` helper returns the logged-in user's id from the JWT.
- The example `users_admin_manage` policy uses a subquery against the `users` table itself; this is a common pattern but verify performance and that your `users` table contains the admin rows.

## Service role considerations

- Deleting an auth account (from `auth.users`) requires the Supabase service role key. Do not embed that key in client code. Use a secure server function (Edge Function) or an admin backend to perform destructive auth operations.

## Quick Manual Steps

1. Create the two tables via SQL editor.
2. Insert at least one admin row into `users` with the `id` equal to the `auth.users` id of the admin account and `role = 'admin'`.
3. Test authentication from the app and verify admin users can access `/admin`.

SUPABASE_URL=https://<project-ref>.supabase.co
SERVICE_ROLE_KEY=<your_service_role_key_here>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@123
