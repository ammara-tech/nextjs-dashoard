# Who am I? Auth and roles you can see

**Goal**: one page, `/dashboard/users`. The system admin sees every profile; anyone else sees only their own. Same query, different rows: Row Level Security (RLS) at work. Run SQL in the SQL Editor (it runs as `postgres`, bypassing RLS).

## 1. The profiles table

Did Monday's optional roles step (owner or staff)? Run this first, in this order. Skip it if you did not.

```sql
drop policy if exists "patients: owner or practice owner can select" on public.patients;
create policy "patients: owner can select"
  on public.patients for select to authenticated
  using ((select auth.uid()) = user_id);
drop table if exists public.profiles;
```

Now the new table:

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('sys_admin', 'user')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
```

## 2. One row per sign-up

A trigger adds a profile per new user (or insert one in your sign-up Server Action).

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- existing users
insert into public.profiles (id) select id from auth.users
on conflict (id) do nothing;

-- make yourself admin
update public.profiles set role = 'sys_admin' where id = '<your user id>';
```

## 3. The trap and the helper

A policy on `profiles` that reads `profiles` fails with 42P17 `infinite recursion detected in policy for relation "profiles"`.

The fix: a `security definer` function "runs using the same role that created the function" (Supabase docs). Created by `postgres`, it has `bypassrls`, so its read skips the policy it serves. In `public` it would be callable over the Data API, so it lives in `private` with `search_path = ''`. UniGenie applies the same `search_path` rule to its own functions.

```sql
create schema if not exists private;

create or replace function private.is_sys_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'sys_admin'
  );
$$;

revoke execute on function private.is_sys_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_sys_admin() to authenticated;
```

## 4. The policies

- Select and update: your own row, or any row for the admin.
- Insert: your own row only, as a plain `user`.
- Delete: admin only, never their own row.

```sql
create policy "profiles: own or admin can select"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select private.is_sys_admin()));

create policy "profiles: own can insert"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id and role = 'user');

create policy "profiles: own or admin can update"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id or (select private.is_sys_admin()))
  with check (((select auth.uid()) = id and role = 'user')
    or (select private.is_sys_admin()));

create policy "profiles: admin can delete others"
  on public.profiles for delete to authenticated
  using ((select private.is_sys_admin()) and id <> (select auth.uid()));
```

The update `with check` tests the changed row, so self-promotion to `sys_admin` fails (check 4b).

## 5. The page

```tsx
// app/dashboard/users/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims) redirect('/login');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role');
  if (error) {
    throw new Error(`Database error ${error.code}`);
  }
  const profiles = data ?? [];
  const me = profiles.find((p) => p.id === claims.sub);

  return (
    <main>
      <h1>Users</h1>
      <p>
        You are signed in as {String(claims.email ?? claims.sub)} ({me?.role ?? 'no profile'}).
      </p>
      {profiles.length === 0 ? (
        <p>No rows. Check steps 2 and 4.</p>
      ) : (
        <ul>
          {profiles.map((p) => (
            <li key={p.id}>
              {p.full_name ?? '(no name)'}: {p.role}{p.id === claims.sub ? ' (you)' : ''}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

## 6. Six checks, two users

Checks 1-2 also work in the app (`/dashboard/users` as each user). SQL Editor: one check line per run; `rollback` undoes it. A = admin, U = user two.

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = '<id you test as>';
-- one check line here
rollback;
```

```sql
-- 1 as A: all rows. 2 as U: own row only
select full_name, role from public.profiles;
-- 3 as U: 0 rows, no error
update public.profiles set full_name = 'X' where id = '<A id>' returning id;
-- 4 as U: 1 row
update public.profiles set full_name = 'X' where id = '<U id>' returning id;
-- 4b as U: ERROR 42501 new row violates row-level security policy for table "profiles"
update public.profiles set role = 'sys_admin' where id = '<U id>';
-- 5 as U, and as A on '<A id>': 0 rows, no error
delete from public.profiles where id = '<U id>' returning id;
-- 6 as A: 1 row
delete from public.profiles where id = '<U id>' returning id;
```

## If it goes wrong

- Recursion error: a policy still reads `profiles`; call `(select private.is_sys_admin())`.
- Admin sees one row: wrong id in the step 2 update.
- Sign-up fails: the trigger errored; re-check step 2.

## Key takeaways

- Baseline first: every domain table keeps `user_id uuid not null default auth.uid()` and the four `(select auth.uid()) = user_id` policies. Roles extend it; they never replace it.

## References

- Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, User management: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase, getClaims: https://supabase.com/docs/reference/javascript/auth-getclaims
- PostgreSQL, CREATE POLICY: https://www.postgresql.org/docs/current/sql-createpolicy.html
