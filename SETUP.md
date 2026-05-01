# Setup Guide — Phase 0

Complete these once to wire your local + Supabase environment. After this, the app can talk to Supabase and you're ready for Phase 1 (schema migrations).

## 1. Create the Supabase project

1. Sign in at https://supabase.com → **New project**
2. Name: `tibbiyot-gis-portal` · Region: `eu-central-1` (or closest to UZ)
3. Set a strong database password — save it in a password manager
4. Wait ~2 min for provisioning

## 2. Enable PostGIS

In **SQL Editor**, run:

```sql
create extension if not exists postgis;
create extension if not exists pg_trgm;     -- fuzzy text search
create extension if not exists unaccent;    -- diacritics-insensitive search

-- verify
select postgis_version();
```

## 3. Get your API keys

**Project Settings → API**, copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **server-only, never commit**

## 4. Configure local env

```bash
cp .env.local.example .env.local
# Open .env.local and paste your three keys
```

## 5. Install Supabase CLI (for migrations)

```bash
brew install supabase/tap/supabase     # macOS
# or: npm install -g supabase

supabase login
supabase link --project-ref <your-project-ref>   # found in project URL
```

## 6. Verify the connection

Start the dev server:

```bash
npm run dev
```

Then in any Server Component (temporarily), add:

```ts
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data, error } = await supabase.from('_realtime').select().limit(1);
console.log({ data, error });
```

A `null` data + benign error (table doesn't exist) is success — it means the URL/keys are valid. Remove the test code after.

## 7. Auth settings (Supabase Dashboard)

**Authentication → Providers → Email**
- Disable public signup (admin invites only)
- Confirm email: off for dev, on for prod

**Authentication → URL Configuration**
- Site URL: `http://localhost:9003`
- Redirect URLs: `http://admin.localhost:9003/**`

## ✅ Phase 0 done when

- [ ] Supabase project provisioned
- [ ] PostGIS enabled
- [ ] `.env.local` populated with all three keys
- [ ] `supabase link` succeeded
- [ ] Test query from a Server Component returns without auth errors

→ Next: **Phase 1 — Database Schema & Migrations**
