// TEMPORARY diagnostics page. Delete this file once the sign-in problem is fixed.
// Shows only information about the account that is currently signed in.
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = { step: string; result: string };

type QueryResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

function describe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function check(
  step: string,
  run: () => PromiseLike<QueryResult>,
): Promise<Row> {
  try {
    const { data, error } = await run();
    if (error) {
      return { step, result: `ERROR ${error.code ?? ''}: ${error.message}` };
    }
    const rows = Array.isArray(data) ? `${data.length} rows` : data ? '1 row' : 'no row';
    return { step, result: `ok (${rows})` };
  } catch (error) {
    return { step, result: `THREW: ${describe(error)}` };
  }
}

function tokenClaims(token: string | undefined) {
  if (!token) return 'no access token';
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return {
      clinic_role: claims.app_metadata?.clinic_role ?? '(missing)',
      clinic_owner_id: claims.app_metadata?.clinic_owner_id ?? '(missing)',
      expires: new Date(claims.exp * 1000).toISOString(),
    };
  } catch (error) {
    return `could not read token: ${describe(error)}`;
  }
}

export default async function ClinicDebugPage() {
  const rows: Row[] = [];

  try {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      rows.push({
        step: 'Signed in?',
        result: `NO - ${userError?.message ?? 'no user'}. Sign in at /clinic-login first, then reload this page.`,
      });
    } else {
      const user = userData.user;
      rows.push({
        step: 'Account (fresh from the auth server)',
        result: JSON.stringify(
          {
            email: user.email,
            clinic_role: user.app_metadata?.clinic_role ?? '(missing)',
            clinic_owner_id: user.app_metadata?.clinic_owner_id ?? '(missing)',
          },
          null,
          2,
        ),
      });

      const { data: sessionData } = await supabase.auth.getSession();
      rows.push({
        step: 'Token the database sees (this is what the access rules use)',
        result: JSON.stringify(
          tokenClaims(sessionData.session?.access_token),
          null,
          2,
        ),
      });

      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const dayAfterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString();

      let patientId: string | null = null;
      const patientRow = await check('patients: my own record', async () => {
        const result = await supabase
          .from('patients')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        patientId = (result.data as { id: string } | null)?.id ?? null;
        return result;
      });
      rows.push(patientRow);

      rows.push(
        await check('clinic_providers', () =>
          supabase.from('clinic_providers').select('id').eq('active', true),
        ),
        await check('clinic_appointment_types', () =>
          supabase.from('clinic_appointment_types').select('id').eq('active', true),
        ),
        await check('appointments (same query as the portal)', () =>
          supabase
            .from('appointments')
            .select(
              'id, starts_at, status, duration_minutes, clinic_providers(display_name), clinic_appointment_types(name)',
            )
            .limit(25),
        ),
        await check('Overview: new patients chart', () =>
          supabase
            .from('patients')
            .select('created_at')
            .gte('created_at', sixMonthsAgo)
            .lt('created_at', nextMonth),
        ),
        await check('Overview: appointment outcomes chart', () =>
          supabase
            .from('appointments')
            .select('status, patients!inner(id)')
            .gte('starts_at', monthStart)
            .lt('starts_at', nextMonth),
        ),
        await check("Overview: tomorrow's appointments", () =>
          supabase
            .from('appointments')
            .select(
              'id, patient_id, provider_id, appointment_type_id, duration_minutes, starts_at, status, patients!inner(full_name, phone), clinic_providers(display_name, specialty), clinic_appointment_types(name, category)',
            )
            .eq('status', 'booked')
            .gte('starts_at', tomorrowStart)
            .lt('starts_at', dayAfterStart),
        ),
        await check('Patients page: patient list', () =>
          supabase
            .from('patients')
            .select('id, full_name, phone, date_of_birth, email, patient_number, auth_user_id, created_at')
            .is('archived_at', null),
        ),
      );

      if (patientId) {
        const id: string = patientId;
        rows.push(
          await check('clinic_patient_documents', () =>
            supabase
              .from('clinic_patient_documents')
              .select('id')
              .eq('patient_id', id)
              .is('archived_at', null),
          ),
          await check('clinic_payments', () =>
            supabase.from('clinic_payments').select('id').eq('patient_id', id),
          ),
          await check('clinic_wallet_entries', () =>
            supabase.from('clinic_wallet_entries').select('amount_minor').eq('patient_id', id),
          ),
          await check('clinic_prescriptions', () =>
            supabase.from('clinic_prescriptions').select('id').eq('patient_id', id),
          ),
        );
      } else {
        rows.push({
          step: 'Patient-only tables',
          result: 'skipped - no patient record found for this account',
        });
      }
    }
  } catch (error) {
    rows.push({ step: 'Unexpected failure', result: describe(error) });
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold">Sign-in diagnostics (temporary)</h1>
      <p className="mt-1 text-sm text-gray-600">
        Take a screenshot of this page and send it. Delete this page afterwards.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <section className="rounded-lg border border-gray-200 p-3" key={row.step}>
            <h2 className="text-sm font-semibold">{row.step}</h2>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{row.result}</pre>
          </section>
        ))}
      </div>
    </main>
  );
}
