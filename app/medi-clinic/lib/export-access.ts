import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * For CSV download routes: returns the signed-in Supabase client when the
 * person has one of the allowed clinic roles, otherwise a plain-text response.
 * Row-level security still limits the rows to the person's own clinic.
 */
export async function exportAccess(roles: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: new Response('Sign in to export.', { status: 401 }) } as const;
  }
  const role = user.app_metadata?.clinic_role;
  if (typeof role !== 'string' || !roles.includes(role)) {
    return {
      response: new Response('Your clinic role cannot export this list.', { status: 403 }),
    } as const;
  }
  return { supabase } as const;
}
