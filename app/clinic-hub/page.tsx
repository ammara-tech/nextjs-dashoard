import Link from 'next/link';
import {
  ArrowRightIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  HeartIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import ClinicLogo, { ClinicMark } from '@/app/ui/clinic-logo';
import { lusitana } from '@/app/ui/fonts';

export default function ClinicHubPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <ClinicLogo />
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <span className="flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1E2F66]">
            <ShieldCheckIcon className="w-4" /> A dedicated workspace for every
            role
          </span>
          <h1
            className={`${lusitana.className} text-5xl font-bold leading-tight text-slate-900 md:text-6xl`}
          >
            Welcome to your
            <span className="block text-[#5B7FFF]">Family Clinic portal.</span>
          </h1>
          <p className="max-w-md text-lg text-slate-600">
            Sign in to continue to the workspace assigned to your account.
            Access is based on your clinic role.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/clinic-login?callbackUrl=%2Fmedi-clinic"
              className="flex items-center gap-2 rounded-lg bg-[#1E2F66] px-6 py-3 font-medium text-white transition hover:bg-[#2b4190]"
            >
              Sign in to continue <ArrowRightIcon className="w-5" />
            </Link>
            <Link
              href="/clinic-register"
              className="flex items-center gap-2 rounded-lg border border-[#1E2F66] px-6 py-3 font-medium text-[#1E2F66] transition hover:bg-[#EEF2FF]"
            >
              Create user
            </Link>
          </div>
          <p className="text-sm text-slate-500">
            Use the account credentials provided by your clinic.{' '}
            <Link href="/clinic-register" className="text-[#5B7FFF] underline">
              New patient? Create an account
            </Link>
          </p>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-[#DCE5FF] to-[#EEF2FF] p-5">
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <ClinicMark className="h-14 w-14" />
            <h2
              className={`${lusitana.className} mt-8 text-2xl font-bold text-slate-900`}
            >
              One sign-in. The right workspace.
            </h2>
            <p className="mt-3 text-slate-600">
              Your account role determines which areas of the clinic portal you
              can access.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <UserGroupIcon className="w-6 text-[#5B7FFF]" />
                <div>
                  <p className="font-semibold text-slate-900">
                    Role-based access
                  </p>
                  <p className="text-sm text-slate-500">
                    Patient, clinical, pharmacy, and admin areas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
                <ShieldCheckIcon className="w-6 text-[#5B7FFF]" />
                <div>
                  <p className="font-semibold text-slate-900">
                    Account-protected pages
                  </p>
                  <p className="text-sm text-slate-500">
                    Sign in to access your permitted workspace
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#1E2F66] p-6 text-white md:grid-cols-4">
          {[
            ['7', 'Role workspaces'],
            ['24/7', 'Patient portal access'],
            ['Medical aid', 'Cover captured per patient'],
            ['Encrypted', 'Member IDs & records'],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-[#C7D4FF]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2
          className={`${lusitana.className} text-3xl font-bold text-slate-900`}
        >
          A workspace for every role
        </h2>
        <p className="mt-2 max-w-xl text-slate-600">
          Everyone on the care team sees only what they need.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [CalendarDaysIcon, 'Patients', 'Book visits, view prescriptions and manage medical aid.'],
            [HeartIcon, 'Doctors', 'Consultations, notes and prescriptions in one view.'],
            [BeakerIcon, 'Pharmacy', 'Dispense prescribed medication and track stock.'],
            [ClipboardDocumentListIcon, 'Front desk', 'Registration, scheduling and check-in.'],
            [CreditCardIcon, 'Medical aid', 'Scheme details, dependants and cover status.'],
            [ShieldCheckIcon, 'Admin', 'Clinic-wide reports, staff and access control.'],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof HeartIcon;
            return (
              <div
                key={title as string}
                className="rounded-2xl border border-slate-200 p-6 transition hover:border-[#5B7FFF] hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF2FF]">
                  <I className="w-5 text-[#1E2F66]" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">
                  {title as string}
                </h3>
                <p className="mt-1 text-sm text-slate-600">{text as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#F5F8FF] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className={`${lusitana.className} text-center text-3xl font-bold text-slate-900`}
          >
            How it works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['1', 'Create your account', 'Register as a patient or use the login your clinic gave you.'],
              ['2', 'Sign in securely', 'You are taken straight to the workspace for your role.'],
              ['3', 'Get on with care', 'Book, prescribe, dispense and manage cover from one place.'],
            ].map(([n, title, text]) => (
              <div key={n} className="rounded-2xl bg-white p-6 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5B7FFF] font-bold text-white">
                  {n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-slate-500 sm:flex-row">
          <ClinicLogo />
          <div className="flex gap-4">
            <Link href="/clinic-login?callbackUrl=%2Fmedi-clinic" className="hover:text-slate-900">Sign in</Link>
            <Link href="/clinic-register" className="hover:text-slate-900">Register</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

