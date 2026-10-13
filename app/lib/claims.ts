import type { Key } from './i18n';

export type ClaimStatus = 'submitted' | 'in_review' | 'approved' | 'rejected' | 'paid';

export type Claim = {
  id: string;
  patient_id: string;
  reference: string;
  description: string;
  amount_minor: number;
  status: ClaimStatus;
  decision_note: string | null;
  submitted_at: string;
  updated_at: string;
  paid_at: string | null;
  patients?: { full_name: string } | null;
};

/** The happy path, in order. A rejected claim stops after review. */
export const claimSteps: ClaimStatus[] = ['submitted', 'in_review', 'approved', 'paid'];

export const claimColumns: ClaimStatus[] = [
  'submitted',
  'in_review',
  'approved',
  'paid',
  'rejected',
];

/** The only moves the database allows from each stage. */
export const nextClaimStatuses: Record<ClaimStatus, ClaimStatus[]> = {
  submitted: ['in_review', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['paid'],
  rejected: [],
  paid: [],
};

export const claimKey = (status: ClaimStatus) => `claims.${status}` as Key;

export const claimTone: Record<ClaimStatus, string> = {
  submitted: 'bg-[#EEF2FF] text-[#1E4FD8]',
  in_review: 'bg-amber-50 text-amber-900',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  paid: 'bg-[#E6F7F5] text-[#0F766E]',
};

export function isClaimStatus(value: unknown): value is ClaimStatus {
  return typeof value === 'string' && claimColumns.includes(value as ClaimStatus);
}

export function claimStats(claims: Claim[]) {
  const decided = claims.filter((claim) =>
    ['approved', 'paid', 'rejected'].includes(claim.status),
  );
  const accepted = decided.filter((claim) => claim.status !== 'rejected');
  return {
    open: claims.filter((claim) => claim.status === 'submitted' || claim.status === 'in_review')
      .length,
    approvalRate: decided.length === 0 ? null : Math.round((accepted.length / decided.length) * 100),
    totalClaimed: claims.reduce((sum, claim) => sum + claim.amount_minor, 0),
    totalPaid: claims
      .filter((claim) => claim.status === 'paid')
      .reduce((sum, claim) => sum + claim.amount_minor, 0),
  };
}
