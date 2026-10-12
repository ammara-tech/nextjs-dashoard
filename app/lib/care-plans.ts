// Family Clinic Care Plans. Shared by the patient portal and the medical aid
// dashboard so both always show the same plans.
//
// The monthly price shown here must match supabase/clinic-care-plans.sql, which
// is the source of truth for what a payment record is created for.

export type CarePlanCode = 'essential' | 'family-plus' | 'premium';

export type CarePlan = {
  code: CarePlanCode;
  name: string;
  tagline: string;
  priceMinor: number;
  featured: boolean;
  perks: string[];
};

export const carePlans: CarePlan[] = [
  {
    code: 'essential',
    name: 'Essential',
    tagline: 'Everyday care for one person',
    priceMinor: 19900,
    featured: false,
    perks: [
      '2 discounted GP consultations a month',
      'Annual wellness check-up included',
      '10% off clinic pharmacy items',
      'Online booking and records',
    ],
  },
  {
    code: 'family-plus',
    name: 'Family Plus',
    tagline: 'Cover for the whole household',
    priceMinor: 54900,
    featured: true,
    perks: [
      'Up to 2 adults and 4 children',
      'Unlimited discounted consultations',
      'Free child immunisation visits',
      'Priority same-day booking',
      '20% off pharmacy and treatments',
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    tagline: 'Full-service care and extras',
    priceMinor: 89900,
    featured: false,
    perks: [
      'Everything in Family Plus',
      'Dental and optical benefits',
      'Chronic medication management',
      'Dedicated care coordinator',
      'Free specialist referral letters',
    ],
  },
];

export function getCarePlan(code: string | null | undefined) {
  return carePlans.find((plan) => plan.code === code) ?? null;
}

/** 19900 -> "R199", 54950 -> "R549.50" */
export function formatRand(minor: number) {
  const rand = minor / 100;
  return `R${minor % 100 === 0 ? rand.toFixed(0) : rand.toFixed(2)}`;
}

export type CarePlanDocument = {
  title: string;
  description: string;
  href: string;
};

// Sample PDFs served from /public/care-plans. They are generic demo documents,
// not generated per member.
export function carePlanDocuments(code: CarePlanCode): CarePlanDocument[] {
  const plan = getCarePlan(code);
  return [
    {
      title: 'Membership certificate (sample)',
      description: 'Proof of membership you can show at reception.',
      href: '/care-plans/membership-certificate-sample.pdf',
    },
    {
      title: `${plan?.name ?? 'Plan'} benefit guide (sample)`,
      description: 'What your plan covers and the discounts that apply.',
      href: `/care-plans/${code}-benefit-guide.pdf`,
    },
    {
      title: 'Terms and conditions (sample)',
      description: 'How membership, billing and cancellation work.',
      href: '/care-plans/terms-and-conditions-sample.pdf',
    },
    {
      title: 'Debit authorisation (sample)',
      description: 'The monthly card debit you agree to when you join.',
      href: '/care-plans/debit-authorisation-sample.pdf',
    },
  ];
}

export const carePlanDisclaimer =
  'Plan prices, benefits and documents are illustrative. Final terms are confirmed by the clinic.';
