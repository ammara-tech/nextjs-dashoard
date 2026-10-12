import Link from 'next/link';
import { signOut } from '@/app/lib/actions';
import { getClinicAccess } from './lib/access';
import { getSelectedDoctor } from './lib/doctor-context';
import ClinicNavigation from './ui/navigation';
import ClinicLogo from '@/app/ui/clinic-logo';

export const dynamic = 'force-dynamic';

export default async function MediClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await getClinicAccess();
  const selectedDoctor =
    role === 'doctor' ? (await getSelectedDoctor()).selected : null;

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#1E2F66]">
      <header className="sticky top-0 z-30 border-b border-[#e9eaf0] border-t-4 border-t-[#1E4FD8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link className="flex items-center gap-3" href="/medi-clinic">
            <ClinicLogo />
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {role === 'doctor' && (
              <Link
                className="rounded-xl bg-[#EEF2FF] px-4 py-2 text-sm font-medium text-[#1E4FD8] hover:bg-[#dfe7ff]"
                href="/medi-clinic?switch=1"
              >
                {selectedDoctor
                  ? `${selectedDoctor.display_name} · Switch`
                  : 'Choose doctor'}
              </Link>
            )}
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
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 lg:px-10 lg:py-8">
        <aside className="mb-6 lg:mb-0">
          <div className="lg:sticky lg:top-28">
            <ClinicNavigation role={role} />
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
