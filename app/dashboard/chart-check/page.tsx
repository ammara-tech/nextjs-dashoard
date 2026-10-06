import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ChartCheckPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patients_per_month')
    .select('month_start, label, new_patients')
    .order('month_start', { ascending: true });

  return (
    <pre className="p-4 text-sm">
      {error ? error.message : JSON.stringify(data, null, 2)}
    </pre>
  );
}
