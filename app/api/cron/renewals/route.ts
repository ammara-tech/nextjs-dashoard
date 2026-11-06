import { NextResponse } from 'next/server';
import { createAdminClient, isAuthorisedCron } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Daily job (see vercel.json): renews due Care Plans and flags the ones that cannot be charged. */
export async function GET(request: Request) {
  if (!isAuthorisedCron(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 503 });
  }
  const { data, error } = await admin.rpc('run_plan_renewals');
  if (error) {
    console.error('Plan renewals failed:', error);
    return NextResponse.json({ error: 'Renewals could not run.' }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ renewed: row?.renewed ?? 0, failed: row?.failed ?? 0 });
}
