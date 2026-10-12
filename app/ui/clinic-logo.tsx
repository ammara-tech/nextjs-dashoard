export function ClinicMark({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Family Clinic logo"
    >
      <circle cx="32" cy="32" r="30" fill="#1E4FD8" />
      <path
        d="M8 36c6 14 20 22 36 18-10-2-18-8-22-18z"
        fill="#9CC9FF"
        opacity="0.9"
      />
      <path
        d="M32 40c-7-5-11-9-11-14a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 5-4 9-11 14z"
        fill="#fff"
      />
      <path
        d="M14 44c4 0 7 1 10 3l8 2 10-3c2-.6 3 1.5 1.4 2.6L38 53H26l-8-3h-4z"
        fill="#fff"
      />
    </svg>
  );
}

/** Logo for the Care Plans (medical aid) dashboard: a shield with a cross. */
export function MedicalAidMark({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Medical aid logo"
    >
      <circle cx="32" cy="32" r="30" fill="#0D9488" />
      <path
        d="M32 13l15 5.5V31c0 9.2-6.4 15.8-15 19.5C23.4 46.8 17 40.2 17 31V18.5L32 13z"
        fill="#fff"
      />
      <rect x="29" y="23" width="6" height="18" rx="1.5" fill="#0D9488" />
      <rect x="23" y="29" width="18" height="6" rx="1.5" fill="#0D9488" />
    </svg>
  );
}

export default function ClinicLogo({
  className = '',
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <ClinicMark />
      <span className="leading-tight">
        <span
          className={`block text-xs uppercase tracking-wider ${light ? 'text-blue-200' : 'text-[#5B7FFF]'}`}
        >
          Health Care
        </span>
        <span
          className={`block text-xl font-bold ${light ? 'text-white' : 'text-[#1E2F66]'}`}
        >
          Family Clinic
        </span>
      </span>
    </span>
  );
}

/** Wordmark for the Medical Aid (Care Plans) dashboard. */
export function MedicalAidLogo({
  className = '',
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <MedicalAidMark />
      <span className="leading-tight">
        <span
          className={`block text-xs uppercase tracking-wider ${light ? 'text-teal-200' : 'text-[#0D9488]'}`}
        >
          Family Clinic
        </span>
        <span
          className={`block text-xl font-bold ${light ? 'text-white' : 'text-[#0F172A]'}`}
        >
          Medical Aid
        </span>
      </span>
    </span>
  );
}
