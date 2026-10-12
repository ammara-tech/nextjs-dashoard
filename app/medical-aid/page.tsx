import Link from 'next/link';
import {
  ArrowRightIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import ClinicLogo, { ClinicMark } from '@/app/ui/clinic-logo';
import CarePlanCards from '@/app/ui/care-plan-cards';
import { lusitana } from '@/app/ui/fonts';
import { getCarePlan } from '@/app/lib/care-plans';
import { createClient } from '@/lib/supabase/server';
import { faqs } from './faq';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Family Clinic Care Plans' };

async function currentRole() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { signedIn: false, role: null };
    const role = user.app_metadata?.clinic_role;
    return { signedIn: true, role: typeof role === 'string' ? role : null };
  } catch {
    return { signedIn: false, role: null };
  }
}

export default async function MedicalAidLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: requestedPlan } = await searchParams;
  const asked = getCarePlan(requestedPlan);
  const { signedIn, role } = await currentRole();
  const isPatient = signedIn && role === 'patient';

  // Where "choose this plan" leads: straight into the dashboard when signed in,
  // otherwise to sign-in with the plan carried through.
  const dashboardFor = (code?: string) =>
    `/medical-aid/dashboard?tab=plans${code ? `&plan=${code}` : ''}`;
  const signInFor = (code?: string) =>
    `/medical-aid/login?callbackUrl=${encodeURIComponent(dashboardFor(code))}`;
  const registerFor = (code?: string) =>
    `/medical-aid/register?callbackUrl=${encodeURIComponent(dashboardFor(code))}`;

  return (
    <main className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <ClinicLogo />
        <Link
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
          href="/clinic-hub"
        >
          Back to the clinic portal
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 md:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <span className="flex items-center gap-2 rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1E2F66]">
            <ShieldCheckIcon className="w-4" /> Care plans for the whole family
          </span>
          <h1
            className={`${lusitana.className} text-5xl font-bold leading-tight text-slate-900 md:text-6xl`}
          >
            Welcome to your
            <span className="block text-[#5B7FFF]">Family Clinic Care Plans.</span>
          </h1>
          <p className="max-w-md text-lg text-slate-600">
            Choose a plan, save the card it is paid from, and see your cover and
            documents in your patient portal. Same login as the clinic.
          </p>
          {asked ? (
            <p className="rounded-xl bg-[#EEF2FF] px-4 py-3 text-sm text-[#1E2F66]">
              You asked about <strong>{asked.name}</strong>. Sign in or create a
              user to continue with it.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {isPatient ? (
              <Link
                href={dashboardFor(asked?.code)}
                className="flex items-center gap-2 rounded-lg bg-[#1E2F66] px-6 py-3 font-medium text-white transition hover:bg-[#2b4190]"
              >
                {asked ? `Continue with ${asked.name}` : 'Open my care plans'}{' '}
                <ArrowRightIcon className="w-5" />
              </Link>
            ) : signedIn ? (
              <Link
                href="/medi-clinic"
                className="flex items-center gap-2 rounded-lg bg-[#1E2F66] px-6 py-3 font-medium text-white transition hover:bg-[#2b4190]"
              >
                Open the clinic dashboard <ArrowRightIcon className="w-5" />
              </Link>
            ) : (
              <>
                <Link
                  href={signInFor(asked?.code)}
                  className="flex items-center gap-2 rounded-lg bg-[#1E2F66] px-6 py-3 font-medium text-white transition hover:bg-[#2b4190]"
                >
                  Sign in to continue <ArrowRightIcon className="w-5" />
                </Link>
                <Link
                  href={registerFor(asked?.code)}
                  className="flex items-center gap-2 rounded-lg border border-[#1E2F66] px-6 py-3 font-medium text-[#1E2F66] transition hover:bg-[#EEF2FF]"
                >
                  Create user
                </Link>
              </>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Use the same email and password as your Family Clinic patient
            account.
          </p>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-[#DCE5FF] to-[#EEF2FF] p-5">
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <ClinicMark className="h-14 w-14" />
            <h2
              className={`${lusitana.className} mt-8 text-2xl font-bold text-slate-900`}
            >
              One sign-in. Your plan, your cover.
            </h2>
            <p className="mt-3 text-slate-600">
              Join a plan in minutes and manage payments, cards and documents
              from one dashboard.
            </p>
            <div className="mt-6 space-y-3">
              {[
                [CreditCardIcon, 'Save your card online', 'Choose which card your plan is debited from'],
                [DocumentTextIcon, 'Your documents', 'Membership certificate and benefit guide'],
                [ShieldCheckIcon, 'Account-protected', 'Only you can see your plan and payments'],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof CreditCardIcon;
                return (
                  <div
                    className="flex items-center gap-4 rounded-xl bg-slate-50 p-4"
                    key={title as string}
                  >
                    <I className="w-6 shrink-0 text-[#5B7FFF]" />
                    <div>
                      <p className="font-semibold text-slate-900">{title as string}</p>
                      <p className="text-sm text-slate-500">{text as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#1E2F66] p-6 text-white md:grid-cols-4">
          {[
            ['3', 'Care plans to choose from'],
            ['No contract', 'Cancel anytime'],
            ['Your card', 'You pick what is debited'],
            ['Last 4 only', 'Card numbers are never stored'],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-[#C7D4FF]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <CarePlanCards
          buttonLabel={(plan) =>
            isPatient ? `Choose ${plan.name}` : `Sign in to choose ${plan.name}`
          }
          hrefFor={(plan) =>
            isPatient ? dashboardFor(plan.code) : signInFor(plan.code)
          }
          selectedCode={asked?.code}
        />
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
              ['1', 'Create your account', 'Sign up as a patient, or use the login you already have.'],
              ['2', 'Choose a plan and a card', 'Save a card online and pick the one your plan is debited from.'],
              ['3', 'See your cover', 'Your plan, payments and documents show in your patient portal.'],
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

      <section className="mx-auto max-w-3xl px-6 py-16" id="faq">
        <h2
          className={`${lusitana.className} text-center text-3xl font-bold text-slate-900`}
        >
          Questions and answers
        </h2>
        <p className="mt-2 text-center text-slate-600">
          Everything you need to know before you sign up.
        </p>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {faqs.map((faq) => (
            <details className="group p-5" key={faq.question}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="text-xl text-[#5B7FFF] transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl bg-[#0F172A] px-6 py-12 text-center text-white">
          <h2 className={`${lusitana.className} text-3xl font-bold`}>
            Ready to join?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[#C7D4FF]">
            Sign up in a couple of minutes. No commitment, cancel anytime.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isPatient ? (
              <Link
                className="rounded-lg bg-white px-6 py-3 font-medium text-[#1E2F66] hover:bg-[#EEF2FF]"
                href={dashboardFor(asked?.code)}
              >
                Open my care plans
              </Link>
            ) : (
              <>
                <Link
                  className="rounded-lg bg-white px-6 py-3 font-medium text-[#1E2F66] hover:bg-[#EEF2FF]"
                  href={registerFor(asked?.code)}
                >
                  Create user
                </Link>
                <Link
                  className="rounded-lg border border-white/40 px-6 py-3 font-medium text-white hover:bg-white/10"
                  href={signInFor(asked?.code)}
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-slate-500 sm:flex-row">
          <ClinicLogo />
          <div className="flex gap-4">
            <Link href={signInFor(asked?.code)} className="hover:text-slate-900">Sign in</Link>
            <Link href={registerFor(asked?.code)} className="hover:text-slate-900">Register</Link>
            <Link href="#faq" className="hover:text-slate-900">FAQ</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
