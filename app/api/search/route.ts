import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { navItemsByRole } from '@/app/lib/nav-items';

export const dynamic = 'force-dynamic';

const patientRoles = new Set(['owner', 'admin', 'front_desk', 'doctor']);

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get('q') ?? '')
    .replace(/[,()%*\\]/g, ' ')
    .trim()
    .slice(0, 40);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role =
      typeof user?.app_metadata?.clinic_role === 'string'
        ? (user.app_metadata.clinic_role as string)
        : null;

    if (!user || !role || !navItemsByRole[role]) {
      return NextResponse.json({ role: null, pages: [], patients: [] });
    }

    let patients: { id: string; full_name: string; patient_number: string | null }[] = [];
    if (patientRoles.has(role) && query.length >= 2) {
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, patient_number')
        .or(`full_name.ilike.%${query}%,patient_number.ilike.%${query}%`)
        .limit(6);
      patients = data ?? [];
    }

    return NextResponse.json({ role, pages: navItemsByRole[role], patients });
  } catch {
    return NextResponse.json({ role: null, pages: [], patients: [] });
  }
}
