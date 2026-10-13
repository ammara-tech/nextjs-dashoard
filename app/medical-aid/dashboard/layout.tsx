import Link from 'next/link';
import { signOut } from '@/app/lib/actions';
import { getClinicAccess } from '@/app/medi-clinic/lib/access';
import { MedicalAidLogo } from '@/app/ui/clinic-logo';
import HistoryNav from '@/app/ui/history-nav';
import HeaderTools from '@/app/ui/header-tools';
import { getT } from '@/app/lib/lang';

export const dynamic = 'force-dynamic';

export default async function MedicalAidDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await getClinicAccess();
  const { t } = await getT();

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#0F766E]">
      <header className="sticky top-0 z-30 border-b border-[#e9eaf0] border-t-4 border-t-[#0D9488] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <HistoryNav fallbackHref="/medical-aid" />
            <Link className="flex items-center gap-3" href="/medical-aid">
              <MedicalAidLogo />
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {role === 'patient' ? (
              <Link
                className="rounded-xl bg-[#E6F7F5] px-4 py-2 text-sm font-medium text-[#0D9488] hover:bg-[#CDEFEA]"
                href="/medi-clinic/portal?tab=medical-aid"
              >
                {t('ui.patientPortal')}
              </Link>
            ) : (
              <Link
                className="rounded-xl bg-[#E6F7F5] px-4 py-2 text-sm font-medium text-[#0D9488] hover:bg-[#CDEFEA]"
                href="/medi-clinic"
              >
                {t('ui.clinicDashboard')}
              </Link>
            )}
            <HeaderTools />
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium">{user.email}</span>
              <span className="block text-xs capitalize text-[#8b91a3]">
                {role.replace('_', ' ')}
              </span>
            </span>
            <form action={signOut}>
              <button
                className="rounded-xl border border-[#e9eaf0] px-4 py-2 text-sm font-medium text-[#626b82] hover:bg-[#f7f8fc]"
                type="submit"
              >
                {t('ui.signOut')}
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</div>
    </main>
  );
}
