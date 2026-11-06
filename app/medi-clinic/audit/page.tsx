import Link from 'next/link';
import { getT } from '@/app/lib/lang';
import { requireClinicRole } from '../lib/access';

export const metadata = { title: 'Audit log' };

const entities: Record<string, string> = {
  patients: 'Patient',
  appointments: 'Appointment',
  clinic_claims: 'Claim',
  clinic_care_plan_memberships: 'Care Plan membership',
  clinic_care_plan_payments: 'Care Plan payment',
};

const verbs: Record<string, string> = {
  insert: 'Created',
  update: 'Edited',
  delete: 'Deleted',
  status_change: 'Changed status',
};

function describe(action: string, details: Record<string, unknown> | null) {
  const verb = verbs[action] ?? action;
  if (!details) return verb;
  if (action === 'status_change') {
    return `${verb}: ${String(details.status_from)} to ${String(details.status_to)}`;
  }
  if (action === 'update' && Array.isArray(details.fields)) {
    return `${verb}: ${(details.fields as string[]).join(', ')}`;
  }
  if (action === 'insert' && typeof details.status === 'string') {
    return `${verb} (${details.status})`;
  }
  return verb;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const { t, lang } = await getT();
  const { supabase } = await requireClinicRole(['owner', 'admin']);
  const filter = type && type in entities ? type : undefined;

  let query = supabase
    .from('clinic_audit_events')
    .select('id, actor_id, entity_type, entity_id, action, occurred_at, details')
    .order('occurred_at', { ascending: false })
    .limit(200);
  if (filter) query = query.eq('entity_type', filter);

  const [eventsResult, patientsResult, providersResult] = await Promise.all([
    query,
    supabase.from('patients').select('auth_user_id, full_name').not('auth_user_id', 'is', null),
    supabase.from('clinic_providers').select('auth_user_id, display_name').not('auth_user_id', 'is', null),
  ]);

  if (eventsResult.error) {
    console.error('Supabase audit log error:', eventsResult.error);
    return (
      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6">
        <h1 className="text-2xl font-bold">{t('audit.title')}</h1>
        <p className="mt-2 text-sm text-[#727a90]">
          The audit log could not be loaded. Run <code>supabase/clinic-audit-log.sql</code> in the
          Supabase SQL editor, then refresh this page.
        </p>
      </section>
    );
  }

  const names = new Map<string, string>();
  for (const row of patientsResult.data ?? []) {
    if (row.auth_user_id) names.set(row.auth_user_id, `${row.full_name} (patient)`);
  }
  for (const row of providersResult.data ?? []) {
    if (row.auth_user_id) names.set(row.auth_user_id, row.display_name);
  }

  const locale = lang === 'af' ? 'af-ZA' : 'en-GB';
  const events = eventsResult.data ?? [];
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? 'border-[#1E4FD8] bg-[#1E4FD8] text-white'
        : 'border-[#e3e8f5] bg-white text-[#727a90] hover:bg-[#EEF2FF]'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">{t('audit.subtitle')}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{t('audit.title')}</h1>
      </div>

      <nav aria-label={t('audit.record')} className="flex flex-wrap gap-2">
        <Link className={chip(!filter)} href="/medi-clinic/audit">
          {t('audit.all')}
        </Link>
        {Object.entries(entities).map(([key, label]) => (
          <Link className={chip(filter === key)} href={`/medi-clinic/audit?type=${key}`} key={key}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
        {events.length === 0 ? (
          <p className="text-sm text-[#727a90]">{t('audit.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-[#8b91a3]">
                <tr>
                  <th className="px-3 py-2">{t('audit.when')}</th>
                  <th className="px-3 py-2">{t('audit.who')}</th>
                  <th className="px-3 py-2">{t('audit.record')}</th>
                  <th className="px-3 py-2">{t('audit.what')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eff0f4]">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-3 py-3 text-[#727a90]">
                      {new Date(event.occurred_at).toLocaleString(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Africa/Johannesburg',
                      })}
                    </td>
                    <td className="px-3 py-3">{names.get(event.actor_id) ?? 'Clinic staff'}</td>
                    <td className="px-3 py-3">
                      {entities[event.entity_type] ?? event.entity_type}
                      <span className="ml-2 text-xs text-[#8b91a3]">
                        {String(event.entity_id).slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {describe(event.action, event.details as Record<string, unknown> | null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
