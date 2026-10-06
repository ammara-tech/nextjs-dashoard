# Stuck? Symptom, cause, fix

**Goal:** find your symptom and apply the fix. Row Level Security (RLS) causes most of these.

**Redirect loop on /dashboard**
- Cause: `proxy.ts` sends you to a login path it does not exempt, or a page uses `getSession()` while the proxy uses `getClaims()`, or the proxy returns a response without the refreshed cookies.
- Fix: in `lib/supabase/proxy.ts` call `supabase.auth.getClaims()` straight after `createServerClient`, nothing in between. Exempt `/login` from the redirect. Return `supabaseResponse` as it is. Keep the starter's `matcher`. Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and in Vercel.

**List is empty although rows exist**
- Cause: no select policy, rows seeded with another user's `user_id`, or a server read through `@/lib/supabase/client`.
- Fix: run `select user_id, count(*) from public.patients group by 1;` and compare with Authentication → Users. Check the select policy. Import `createClient` from `@/lib/supabase/server`.

**`new row violates row-level security policy for table "patients"` (code 42501)**
- Cause: no insert policy, or the insert sends a `user_id` that is not yours, or `user_id` has no `default auth.uid()`.
- Fix: add the insert policy with `with check ((select auth.uid()) = user_id)`. Leave `user_id` out of the insert. Add the default:

```sql
alter table public.patients alter column user_id set default auth.uid();
```

**`infinite recursion detected in policy for relation "profiles"` (code 42P17)**
- Cause: a policy on `public.profiles` reads `public.profiles` to find your role, which recurses.
- Fix: follow "Who am I?": put the check in `private.is_sys_admin()`, a `security definer` function with `set search_path = ''`, and call `(select private.is_sys_admin())` from the policy.

**Chart renders empty**
- Cause: the seed rows belong to another user, the view has no grant, `dataKey` does not match the column names, every count is 0, or `ResponsiveContainer` sits in a parent with no height.
- Fix: check the owner as above. Run `grant select on public.patients_per_month to authenticated;`. Match `dataKey` to the view's columns exactly. Give `ResponsiveContainer` `height={300}`. Pass only plain rows of strings and numbers from the Server Component to the chart.

## Key takeaways

- The SQL Editor runs as `postgres`; only the app, signed in, tests RLS.
- Read the error code: 42501 is a policy or grant, 42P17 is recursion.

Still stuck? Post it on the stuck board (Teams channel or whiteboard) with the exact error text.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://nextjs.org/docs/app/getting-started/server-and-client-components
