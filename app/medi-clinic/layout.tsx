import Link from 'next/link';
import { signOut } from '@/app/lib/actions';
import { getClinicAccess } from './lib/access';
import ClinicNavigation from './ui/navigation';

export const dynamic = 'force-dynamic';

export default async function MediClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role } = await getClinicAccess();

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-[#20263b]">
      <header className="border-b border-[#e9eaf0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link className="flex items-center gap-3" href="/medi-clinic">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8edff] text-lg font-bold text-[#6077ed]">
                +
              </span>
              <span>
                <span className="block text-lg font-bold tracking-tight">
                  Family Clinic
                </span>
                <span className="block text-xs text-[#8b91a3]">
                  Practice dashboard
                </span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
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
          <ClinicNavigation role={role} />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        {children}
      </div>
    </main>
  );
}
