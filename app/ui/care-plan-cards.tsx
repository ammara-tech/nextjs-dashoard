import Link from 'next/link';
import {
  carePlanDisclaimer,
  carePlans,
  formatRand,
  type CarePlan,
  type CarePlanCode,
} from '@/app/lib/care-plans';

/**
 * The "Plans that grow with you" section. Used by the patient portal and the
 * medical aid pages, which only differ in where each plan's button leads.
 */
export default function CarePlanCards({
  hrefFor,
  buttonLabel = (plan) => `Enquire about ${plan.name}`,
  selectedCode,
  currentCode,
  theme = 'blue',
}: {
  hrefFor: (plan: CarePlan) => string;
  buttonLabel?: (plan: CarePlan) => string;
  /** Plan the person asked about; gets a ring so it is easy to spot. */
  selectedCode?: CarePlanCode | null;
  /** Plan the person already has, shown instead of a button. */
  currentCode?: CarePlanCode | null;
  /** Blue in the clinic portal, teal in the Medical Aid dashboard. */
  theme?: 'blue' | 'teal';
}) {
  const t =
    theme === 'teal'
      ? {
          soft: 'text-[#99E0D6]',
          featured: 'border-[#2DD4BF] bg-[#0F766E]',
          ring: 'ring-[#5EEAD4]',
          badge: 'bg-[#0D9488]',
          btnFeatured: 'bg-white text-[#0F766E] hover:bg-[#E6F7F5]',
          btn: 'bg-[#0D9488] text-white hover:bg-[#115E59]',
          note: 'text-[#5EEAD4]',
        }
      : {
          soft: 'text-[#C7D4FF]',
          featured: 'border-[#5B7FFF] bg-[#1E2F66]',
          ring: 'ring-[#9CC9FF]',
          badge: 'bg-[#5B7FFF]',
          btnFeatured: 'bg-white text-[#1E2F66] hover:bg-[#EEF2FF]',
          btn: 'bg-[#1E4FD8] text-white hover:bg-[#2b4190]',
          note: 'text-[#9CC9FF]',
        };
  return (
    <section
      className="rounded-2xl bg-[#0F172A] p-6 text-white shadow-sm sm:p-8"
      id="plans"
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold">Plans that grow with you</h2>
        <p className={`mx-auto mt-2 max-w-xl text-sm ${t.soft}`}>
          Family Clinic Care Plans give you perks you will actually use.
          Choose the one that fits your household.
        </p>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {carePlans.map((plan) => {
          const isCurrent = plan.code === currentCode;
          return (
            <div
              className={`flex flex-col rounded-2xl border p-6 ${
                plan.featured
                  ? t.featured
                  : 'border-white/10 bg-white/5'
              } ${plan.code === selectedCode ? `ring-2 ${t.ring}` : ''}`}
              key={plan.code}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {isCurrent ? (
                  <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold">
                    Your plan
                  </span>
                ) : plan.featured ? (
                  <span className={`rounded-full ${t.badge} px-2.5 py-0.5 text-xs font-semibold`}>
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 text-sm ${t.soft}`}>{plan.tagline}</p>
              <p className="mt-5 text-4xl font-bold">
                {formatRand(plan.priceMinor)}
                <span className={`text-sm font-normal ${t.soft}`}> / month</span>
              </p>
              {isCurrent ? (
                <span className={`mt-5 rounded-xl border border-white/20 px-4 py-2.5 text-center text-sm font-semibold ${t.soft}`}>
                  You are on this plan
                </span>
              ) : (
                <Link
                  className={`mt-5 rounded-xl px-4 py-2.5 text-center text-sm font-semibold ${
                    plan.featured
                      ? t.btnFeatured
                      : t.btn
                  }`}
                  href={hrefFor(plan)}
                >
                  {buttonLabel(plan)}
                </Link>
              )}
              <p className={`mt-2 text-center text-xs ${t.note}`}>
                No commitment · Cancel anytime
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {plan.perks.map((perk) => (
                  <li className="flex gap-2" key={perk}>
                    <span className={t.note}>✓</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className={`mt-6 text-center text-xs ${t.note}`}>{carePlanDisclaimer}</p>
    </section>
  );
}
