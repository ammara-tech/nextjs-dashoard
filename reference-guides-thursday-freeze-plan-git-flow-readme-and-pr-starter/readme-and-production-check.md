# README and production check for Checkpoint W30.4

## Goal

Checkpoint W30.4 is due Mon 12 Oct 08:00. For the 30 tier the reviewer opens your `README.md`, follows the production URL at the top, signs in with your demo login, and finds Create, Read, Update, Delete (CRUD) on two entities, two charts from real data, and Row Level Security (RLS) keeping a second user out of the first user's rows. This page condenses Thursday's README and production blocks into one checklist.

## 1. The README skeleton

Keep the headings; the reviewer looks for them by name. Fill in every angle-bracket line.

```markdown
# <Project name>

Production: https://<your-production-domain>

## What it is
<Two sentences: who uses it, and what decision it helps them make.>

## Entities and the two questions the charts answer
Entities: <patients>, <appointments (foreign key to patients)>
1. <Is the practice growing?>: <bar chart of new patients per month>. Who acts: <the owner>.
2. <What share of appointments are no-shows?>: <donut of status this month>. Who acts: <the owner>.

## Chart honesty checklist (both charts)
- [ ] The title states the question the chart answers
- [ ] Both axes are labelled, with units (the donut: a labelled legend)
- [ ] With no rows for the signed-in user, a sentence shows instead of an empty chart
- [ ] One "so what" line under the chart names who acts and on what

## DEMO LOGIN (for reviewers)
Email: demo@<your-project>.example
Password: <a throwaway password used nowhere else>
A demo-only account with seed data; not a real person.

## How to run locally
1. Clone the repository and run pnpm install.
2. Create .env.local with these variable NAMES (values from your own Supabase project):
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
3. Run the SQL in the supabase/ folder in the SQL Editor.
4. Run pnpm dev and open http://localhost:3000.

## Smoke test (date, run on production as two users)
- [ ] 1. Signed out, /dashboard redirects to login
- [ ] 2. User one signs in and lands on /dashboard
- [ ] 3. Entity one: create, edit, delete; list updates
- [ ] 4. Entity two: create (select shows only my rows), edit, delete
- [ ] 5. Both charts render from real rows, question as title
- [ ] 6. User two (private window) sees none of user one's rows
- [ ] 7. User two opening user one's edit URL gets not-found
- [ ] 8. Empty create form shows messages, saves nothing
- [ ] 9. Unknown URL shows the not-found page
- [ ] 10. Sign out works; .env.local is not on GitHub
- [ ] R. (only if shipped) Realtime: an insert in window A updates window B within a second
- [ ] S. (only if shipped) Storage: upload and signed link work; user two cannot open user one's file; the bucket is private

## Freeze plan (8 Oct)
### Cut (one honest sentence each)
- <Third entity>: <why it is not shipping>

## Stretch (delete this section if you cut it)
<Realtime or Storage: what it does and which table or bucket. Bucket: <name>, private, size limit <size>. Smoke check R or S ticked above.>

## Known gaps
- <anything failing, one honest line each>
- Example for a booking-shaped domain: "Two users can book the same slot; this app assumes one calendar owner."
```

The demo login is a dedicated demo user with a throwaway password, never your real password: the README is public, so anything in it is published. Enter the seed rows while signed in **as the demo user**, because RLS shows each user only their own rows. Before you submit, sign in as it yourself in a private window.

## 2. The production check

1. Vercel → Project → Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` have **Production** ticked. Vercel: "Any change you make to environment variables are not applied to previous deployments, they only apply to new deployments." Change one, then Redeploy.
2. Vercel → Deployments: the newest **Production** row, built from main, reads **Ready**.
3. Copy the domain from Settings → Domains, open it in a **private window**, and check it matches the Production line of your README.
4. Sign in with the demo login exactly as the README spells it. Copy and paste; do not retype from memory.
5. If you kept Realtime or Storage, run its check (R or S) on the production URL and run the three catalogue queries from Thursday's deploy block: the bucket is private, its policies exist, the table is in the publication. Delete your test files from the bucket.

## 3. The one test every reviewer runs

The reviewer signs in as a second user and looks for the first user's rows. Run it first: private window, user two, open both lists and both charts, then paste one of user one's edit URLs. User two should see nothing of user one's, and that edit URL should give the not-found page.

## 4. No secrets in the repository

Check that .env.local was never committed:

```bash
git ls-files | grep env
```

Only an example file of names may appear. Then open the repository on GitHub and confirm no .env.local is listed.

Supabase's API keys page says the publishable key is "Safe to expose online", while a secret key: "Never put one in a browser, a shipped application, or source control." Next.js inlines every `NEXT_PUBLIC_` value into the JavaScript sent to the browser, so a secret key must never sit in a `NEXT_PUBLIC_` variable. If a secret key was committed, create a new one in Supabase (Settings → API Keys), replace it everywhere, then delete the old one.

## 5. Get the blob link and submit

On GitHub open `README.md` on main and copy the address bar. It has this shape:

```text
https://github.com/<you>/<repo>/blob/main/README.md
```

Submit that GitHub URL only, with the production URL at the top of the file.

## If it goes wrong

| Symptom | Fix |
|---|---|
| works locally, not in production | a variable missing for Production, or a type error: run `pnpm build` locally, fix, push, Redeploy |
| demo login fails | the user was created in a different Supabase project from the one production uses, or the email is unconfirmed |
| charts empty in production | the seed rows belong to another user; sign in as the demo user and enter them again |

## Key takeaways

- The README is the reviewer's first screen: title, production URL, demo login.
- Variable names in the README, never values.
- A tick means: on production, today, as the right user.
- Publishable key in the browser, secret key never.

## References

- Vercel environment variables: https://vercel.com/docs/environment-variables
- Supabase API keys: https://supabase.com/docs/guides/api/api-keys
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
- GitHub, URLs to files: https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files
- git ls-files: https://git-scm.com/docs/git-ls-files
