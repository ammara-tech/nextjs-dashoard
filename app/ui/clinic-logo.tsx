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
          className={`block text-lg font-bold tracking-wide ${light ? 'text-white' : 'text-[#0F172A]'}`}
        >
          FAMILY CLINIC
        </span>
        <span
          className={`block text-xs ${light ? 'text-blue-200' : 'text-[#5B7FFF]'}`}
        >
          Medical Care
        </span>
      </span>
    </span>
  );
}
