# Charts guide: first chart in five steps, with the why

**Goal:** a bar chart on `/dashboard` behind Row Level Security (RLS), then a donut across two entities.

## 1. Seed 20-40 realistic rows

Why: a chart over three rows teaches nothing.

The SQL Editor runs as `postgres`, where `auth.uid()` is null, so paste user one's id (Authentication → Users) over the placeholder:

```sql
insert into public.patients (user_id, full_name, created_at)
select
  'PASTE-USER-ONE-ID-HERE'::uuid,
  'Seed patient ' || g,
  now() - ((g * 37) % 150) * interval '1 day'
from generate_series(1, 30) as g;
```

30 rows over five months. Remove them with `delete from public.patients where full_name like 'Seed patient %';`

## 2. A view that runs as the caller

Why: the Supabase RLS guide says "Views bypass RLS by default because they are usually created with the `postgres` user." `security_invoker = true` (Postgres 15 and above) makes it use "the policies and permissions of the invoking user".

A quiet month shows as 0. Same columns as Tuesday's view, so it replaces it.

```sql
create or replace view public.patients_per_month
with (security_invoker = true) as
select
  m.month_start,
  to_char(m.month_start, 'Mon YYYY') as label,
  count(p.id)::int as new_patients
from generate_series(
  date_trunc('month', now()) - interval '5 months',
  date_trunc('month', now()),
  interval '1 month'
) as m(month_start)
left join public.patients p
  on p.created_at >= m.month_start
 and p.created_at < m.month_start + interval '1 month'
group by m.month_start
order by m.month_start;

grant select on public.patients_per_month to authenticated;
```

## 3. Fetch through the server client

Why: the Learn dashboard's `postgres` package logs in as a privileged role that skips row security; the server client sends your JSON Web Token (JWT), so policies run.

```ts
// app/lib/charts.ts
import { createClient } from '@/lib/supabase/server'

export interface PatientsPerMonthRow {
  label: string
  new_patients: number
}

export async function fetchPatientsPerMonth(): Promise<PatientsPerMonthRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('patients_per_month')
    .select('label, new_patients')
    .order('month_start', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as PatientsPerMonthRow[]
}
```

```tsx
// app/ui/dashboard/patients-per-month.tsx
import { fetchPatientsPerMonth } from '@/app/lib/charts'
import PatientsPerMonthChart from '@/app/ui/dashboard/patients-per-month-chart'

export default async function PatientsPerMonth() {
  const rows = await fetchPatientsPerMonth()
  const total = rows.reduce((sum, r) => sum + r.new_patients, 0)
  return (
    <div>
      <h2>Is the practice growing? New patients per month</h2>
      {total === 0 ? <p>No patients in the last six months yet.</p> : <PatientsPerMonthChart rows={rows} />}
      <p>So what: if the last three bars fall, the owner holds off on opening a second consulting day.</p>
    </div>
  )
}
```

Check the total, not `rows.length`: this view always returns six rows.

## 4. The chart is a Client Component

`pnpm add recharts react-is` (Recharts 3.10.1 supports React 19; `react-is` must match your React version).

```tsx
// app/ui/dashboard/patients-per-month-chart.tsx
'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { PatientsPerMonthRow } from '@/app/lib/charts'

export default function PatientsPerMonthChart({ rows }: { rows: PatientsPerMonthRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <XAxis dataKey="label" label={{ value: 'Month', position: 'insideBottom', offset: -12 }} />
        <YAxis
          domain={[0, 'auto']}
          allowDecimals={false}
          label={{ value: 'New patients (count)', angle: -90, position: 'insideLeft' }}
        />
        <Bar dataKey="new_patients" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

Render `<PatientsPerMonth />` in place of `<RevenueChart />`.

## 5. Honesty checklist

- The title states the question
- Both axes are labelled, with units
- Bars start at zero
- An empty state when there are no rows
- One "so what" line naming who acts

## Then: chart two as a donut

"What share of this month's appointments are no-shows?" Both tables' policies apply.

```sql
create or replace view public.appointment_status_this_month
with (security_invoker = true) as
select a.status, count(*)::int as total
from public.appointments a
join public.patients p on p.id = a.patient_id
where a.starts_at >= date_trunc('month', now())
  and a.starts_at < date_trunc('month', now()) + interval '1 month'
group by a.status;

grant select on public.appointment_status_this_month to authenticated;
```

```ts
// app/lib/charts.ts (add)
export interface StatusRow {
  status: 'booked' | 'done' | 'no_show'
  total: number
}

export async function fetchStatusThisMonth(): Promise<StatusRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('appointment_status_this_month').select('status, total')
  if (error) throw new Error(error.message)
  return (data ?? []) as StatusRow[]
}
```

```tsx
// app/ui/dashboard/status-donut.tsx
'use client'

import { Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { StatusRow } from '@/app/lib/charts'

const NAMES = { booked: 'Booked', done: 'Done', no_show: 'No-show' }
const COLOURS = { booked: '#2563eb', done: '#16a34a', no_show: '#dc2626' }

export default function StatusDonut({ rows }: { rows: StatusRow[] }) {
  const data = rows.map((r) => ({ name: NAMES[r.status], value: r.total, fill: COLOURS[r.status] }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} innerRadius="55%"
          label={({ name, value }) => `${name}: ${value}`} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

Copy step 3's Server Component as `StatusThisMonth` with `fetchStatusThisMonth()`, the question as title, `<StatusDonut rows={rows} />` and "So what: the owner decides whether to send reminder messages." Labels print name and count: colour is not the only signal.

## If it goes wrong

- Empty for user one: the seed used another id: `select user_id, count(*) from public.patients group by 1;`
- User two sees user one's counts: the view lacks `security_invoker`.
- Blank chart: `ResponsiveContainer` needs a numeric `height`; `dataKey` must match the view's columns.

## Key takeaways

- View with `security_invoker`, server client, `'use client'` chart.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://www.postgresql.org/docs/current/sql-createview.html
- https://recharts.github.io/en-US/api/Pie
- https://nextjs.org/docs/app/getting-started/server-and-client-components
