# Freeze plan and the safe way to ship: branch, preview, smoke test, merge

Until Wednesday you pushed straight to main. From Thursday you do not: main is production, and production changes only when you merge a branch you have already checked on a preview URL.

## 1. The freeze plan (paste into README.md)

```markdown
## Freeze plan (8 Oct)

### Must ship today (max 5, each one testable on the preview URL)
1. 
2. 

### Cut (one honest sentence each)
- Third entity (<name>): 
- Stretch (<name>): 

### Monday polish (max 3, cosmetic or README-only)
1. 
```

Rules: each must-ship line starts with a verb and names its test ("Appointments delete works in production; smoke check 4"). The third entity from your proposal is must-ship only if entity one and entity two both have Create, Read, Update, Delete (CRUD) behind Row Level Security (RLS) and both charts render from real rows, all in production now. Any one false: cut it, with a reason. A cut with a line in the README beats a half-built feature. A Realtime or Storage stretch that already works from Wednesday may stay as ONE must-ship line with its test (checks R and S below); nothing new starts today, and a half-built one is cut. Commit the plan on main: that is your last direct push to main.

## 2. Branch and push

```bash
git switch main
git pull
git switch -c freeze/must-ship
pnpm build
git add -A
git commit -m "fix: appointments delete revalidates the list (smoke 4)"
git push -u origin freeze/must-ship
```

`git switch -c` creates the branch and switches to it. `-u` records the upstream, so later pushes on this branch are plain `git push`. Run `pnpm build` before every push: it is the same check Vercel runs.

## 3. Find the preview URL

A push to any branch other than main makes Vercel build a Preview deployment. Two places to find it:

- Vercel, your project, **Deployments** tab: the newest row carries your branch name.
- If you open a pull request on GitHub (base `main`), Vercel comments on it. **Visit Preview** is the branch URL, which always shows the latest push on the branch; **View deployment** is that one commit.

The branch URL has the shape `<project-name>-git-<branch-name>-<scope-slug>.vercel.app`.

## 4. Environment variables are per environment

Each variable in Project, Settings, Environment Variables is ticked for Production, Preview and/or Development. A preview that fails with a missing Supabase URL or key almost always means `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `POSTGRES_URL`, while the Learn tables remain) is not ticked for Preview. Changes apply only to new deployments, so tick it, save, then Redeploy or push again.

## 5. Smoke checklist: preview first, production after the merge

```markdown
- [ ] 1. Signed out, /dashboard redirects to the login page
- [ ] 2. User one signs in and lands on /dashboard
- [ ] 3. Entity one: create, edit, delete; the list updates each time
- [ ] 4. Entity two: create (select shows only my rows), edit, delete
- [ ] 5. Both charts render from real rows, question as title, labelled axes or legend
- [ ] 6. User two (private window): before adding rows, sees empty states, not errors; after one row, sees none of user one's rows
- [ ] 7. User two opening user one's edit URL gets the not-found page
- [ ] 8. An empty create form shows field messages; nothing saved
- [ ] 9. An unknown URL shows the not-found page
- [ ] 10. Sign out returns to login; Back does not reveal the dashboard; .env.local is not on GitHub
- [ ] R. (only if you kept Realtime) an insert in window A updates window B within a second
- [ ] S. (only if you kept Storage) upload and signed link work; user two cannot open user one's file; the bucket is private
```

Every failure is a new commit on the same branch and another push; the branch URL updates by itself.

## 6. Merge, then check production

On GitHub: your pull request, **Merge pull request**, **Confirm merge**. Or locally:

```bash
git switch main
git pull
git merge freeze/must-ship
git push
```

Merging into main triggers a Production deployment. Wait for **Ready** in Deployments, then run the ten checks again on the production URL and tick them in README.md.

## 7. If production breaks after a merge

Revert the merge: this adds a new commit that undoes it and rewrites no history.

```bash
git switch main
git pull
git log --oneline -n 5
git revert -m 1 <merge-commit-sha>
git push
```

`-m 1` tells git that parent 1 (main before the merge) is the mainline to keep. The push builds a new production deployment without the change. Git warns that a reverted merge's changes will not come back if you merge the same branch again, so fix the bug on a new branch made from the updated main. If the log shows no merge commit (a local merge can fast-forward), revert each of the branch's commits with `git revert <sha>`, newest first.

## If it goes wrong

| Symptom | Fix |
|---|---|
| no deployment for the branch | `git remote -v`: you pushed to a repository Vercel is not connected to |
| preview errors about the Supabase URL or key | tick Preview for the variable, save, Redeploy |
| preview works, production fails | the variable is ticked for Preview only; tick Production, Redeploy |
| a confirmation or password-reset email links to localhost | Supabase, Authentication, URL Configuration: set Site URL to production; add `https://*-<team-or-account-slug>.vercel.app/**` to Redirect URLs. Plain email-and-password sign-in does not use this list |
| you committed on main by mistake | if not pushed: `git switch -c freeze/must-ship` takes the work with it; if pushed, run the checklist on production and branch for the next fix |

## Key takeaways

- Freeze plan first: five testable must-ship lines; everything else cut, with a line in the README.
- Branch, push, preview, checklist, merge. Production changes only at the merge.
- Variables are per environment and apply to new deployments only.
- A broken merge is undone with `git revert -m 1`, never by force-pushing main.

## References

- Vercel environments: https://vercel.com/docs/deployments/environments
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel generated URLs: https://vercel.com/docs/deployments/generated-urls
- Vercel for GitHub: https://vercel.com/docs/git/vercel-for-github
- git switch: https://git-scm.com/docs/git-switch
- git push: https://git-scm.com/docs/git-push
- git revert: https://git-scm.com/docs/git-revert
- Supabase Auth redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
