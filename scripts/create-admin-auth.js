#!/usr/bin/env node
// create-admin-auth.js
// Create an auth user via Supabase Admin API and upsert public.users + public.admins via REST

import process from 'process'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY environment variables.')
  console.error('Set SUPABASE_URL=https://<project>.supabase.co and SERVICE_ROLE_KEY=<service_role_key> before running.')
  process.exit(1)
}

// ensure fetch exists (Node 18+). If not, try dynamic import of node-fetch.
let _fetch = globalThis.fetch
if (!_fetch) {
  try {
    const mod = await import('node-fetch')
    _fetch = mod.default
  } catch (err) {
    console.error('Global fetch not available and node-fetch not installed. Please run: npm install node-fetch')
    process.exit(1)
  }
}

const headersAuth = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function createAuthUser(email, password) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users`
  const body = { email, password, email_confirm: true }
  const res = await _fetch(url, { method: 'POST', headers: headersAuth, body: JSON.stringify(body) })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch (e) { data = { raw: text } }
  return { status: res.status, ok: res.ok, data }
}

async function getAuthUserByEmail(email) {
  // Admin API: try to get user by email
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users?email=${encodeURIComponent(email)}`
  const res = await _fetch(url, { method: 'GET', headers: headersAuth })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch (e) { data = { raw: text } }
  return { status: res.status, ok: res.ok, data }
}

async function upsertRow(table, row) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`
  const res = await _fetch(url, {
    method: 'POST',
    headers: {
      ...headersAuth,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch (e) { data = { raw: text } }
  return { status: res.status, ok: res.ok, data }
}

async function ensureAdminsTable() {
  // Create table if not exists via SQL endpoint
  const sqlUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc` // not used; instead use SQL via SQL editor recommended
  // We'll attempt to create via upsert into admins; if table missing user will see error and we instruct manual step
}

async function main() {
  console.log('Creating auth user (if not exists) and upserting profile/admin rows...')
  // 1) Try to create the auth user
  let created = await createAuthUser(ADMIN_EMAIL, ADMIN_PASSWORD)
  if (created.ok) {
    console.log('Auth user created:', created.data?.id || created.data)
  } else {
    console.log('Create auth user response:', created.status)
    // If user exists, try to fetch it
    if (created.status === 400 || (created.data && created.data?.message && /already exists|duplicate/i.test(created.data.message))) {
      console.log('User may already exist — fetching by email...')
    } else {
      console.warn('Create user returned non-ok status; will attempt to fetch by email anyway')
    }
  }

  // 2) Get the user id by email
  const found = await getAuthUserByEmail(ADMIN_EMAIL)
  if (!found.ok) {
    console.error('Failed to fetch auth user by email. Response:', found.status, found.data)
    console.error('If the user does not exist, create it from Supabase Console or with the Admin API. Aborting.')
    process.exit(1)
  }

  // found.data may be an array or an object depending on API
  let userId = null
  if (Array.isArray(found.data) && found.data.length > 0) userId = found.data[0].id
  else if (found.data && found.data.id) userId = found.data.id

  if (!userId) {
    console.error('No auth user found for email', ADMIN_EMAIL)
    console.error('Create the user in Supabase Auth (Dashboard) or retry the Admin API and then re-run this script.')
    process.exit(1)
  }

  console.log('Found auth user id:', userId)

  // 3) Upsert into public.users
  const userRow = { id: userId, email: ADMIN_EMAIL, role: 'admin', created_at: new Date().toISOString() }
  const upsertUsers = await upsertRow('users', userRow)
  if (!upsertUsers.ok) {
    console.error('Failed to upsert into public.users. Response:', upsertUsers.status, upsertUsers.data)
    console.error('Ensure the table `public.users` exists and your service role key has permission to access the REST API.')
  } else {
    console.log('Upserted public.users:', upsertUsers.data)
  }

  // 4) Upsert into public.admins (create table first if it doesn't exist via SQL editor)
  const adminRow = { user_id: userId }
  const upsertAdmins = await upsertRow('admins', adminRow)
  if (!upsertAdmins.ok) {
    console.error('Failed to upsert into public.admins. Response:', upsertAdmins.status, upsertAdmins.data)
    console.error('If `public.admins` table does not exist, create it in SQL editor:')
    console.error("CREATE TABLE IF NOT EXISTS public.admins (user_id text PRIMARY KEY, created_at timestamptz DEFAULT now());")
  } else {
    console.log('Upserted public.admins:', upsertAdmins.data)
  }

  console.log('Done. If you encountered table-missing errors, create the missing tables via Supabase SQL editor and re-run this script.')
}

main().catch((err) => {
  console.error('Unexpected error', err)
  process.exit(1)
})
