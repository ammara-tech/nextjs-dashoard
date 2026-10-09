import { saveMedicalAidProfile } from '../lib/medical-aid';

export type MedicalAidProvider = { id: string; name: string; plans: string[] };
export type MedicalAidProfile = {
  provider_id: string;
  plan: string;
  member_id_last4: string;
  dependent_label: string;
  status: 'verified' | 'pending' | 'check-coverage';
  card_object_path: string | null;
};

const dependentOptions = ['Primary member', 'Spouse', 'Child 1', 'Child 2', 'Parent/guardian'];

const statusMap = {
  verified: {
    label: '🟢 Active / Verified',
    className: 'bg-[#eafaf1] text-[#1d7f53] border-[#bfead0]',
    note: 'Your policy is verified and the clinic can process in-network billing.',
  },
  pending: {
    label: '🟡 Pending Verification',
    className: 'bg-[#fff4d9] text-[#9a6500] border-[#f5d99a]',
    note: 'Clinic staff will verify your cover. Automatic switch checks are not yet enabled.',
  },
  'check-coverage': {
    label: '🔴 Check Coverage / Invalid Details',
    className: 'bg-[#fdeceb] text-[#ba3d32] border-[#f7c1bc]',
    note: 'Please confirm your member ID or submit a new card for review.',
  },
} as const;

export default function MedicalAidPanel({
  patientName,
  providers,
  profile,
}: {
  patientName: string;
  providers: MedicalAidProvider[];
  profile: MedicalAidProfile | null;
}) {
  const current = profile ? statusMap[profile.status] : null;
  const selected = providers.find((p) => p.id === profile?.provider_id) ?? providers[0];

  return (
    <section className="rounded-2xl border border-[#e9eaf0] bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[#74809a]">Medical aid & co-payment</p>
          <h2 className="mt-1 text-xl font-semibold">Coverage for {patientName}</h2>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
            current?.className ?? 'border-[#dfe3ee] bg-[#F3F7FF] text-[#727a90]'
          }`}
        >
          {current?.label ?? 'No medical aid on file'}
        </span>
      </div>

      {providers.length === 0 || !selected ? (
        <p className="mt-4 text-sm text-[#727a90]">
          Medical aid providers are not configured yet. Ask the clinic to apply the
          clinic-medical-aid migration.
        </p>
      ) : (
        <form action={saveMedicalAidProfile} className="mt-4 space-y-4 rounded-2xl bg-[#F3F7FF] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[#727a90]">
              Medical aid provider
              <select name="provider_id" className={inputClass} defaultValue={selected.id}>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#727a90]">
              Plan / option
              <input
                name="plan"
                list="medical-aid-plans"
                required
                className={inputClass}
                defaultValue={profile?.plan ?? selected.plans[0] ?? ''}
              />
              <datalist id="medical-aid-plans">
                {providers.flatMap((p) => p.plans).map((plan) => (
                  <option key={plan} value={plan} />
                ))}
              </datalist>
            </label>
            <label className="text-sm text-[#727a90]">
              Main member ID
              <input
                name="member_id"
                required
                minLength={3}
                maxLength={40}
                autoComplete="off"
                placeholder={profile ? `Saved (ending ${profile.member_id_last4})` : ''}
                className={inputClass}
              />
            </label>
            <label className="text-sm text-[#727a90]">
              Membership number (optional)
              <input name="membership_number" maxLength={40} autoComplete="off" className={inputClass} />
            </label>
            <label className="text-sm text-[#727a90]">
              Map dependent
              <select
                name="dependent_label"
                className={inputClass}
                defaultValue={profile?.dependent_label ?? 'Primary member'}
              >
                {dependentOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#727a90]">
              Digital card (PDF, JPEG, PNG)
              <input name="card" type="file" accept=".pdf,.png,.jpg,.jpeg" className={inputClass} />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#727a90]">
              {current?.note ?? 'Details are encrypted before storage.'}
              {profile?.card_object_path ? ' Card on file.' : ''}
            </p>
            <button className={buttonClass} type="submit">
              Save &amp; submit for verification
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

const inputClass =
  'mt-1 block w-full rounded-xl border border-[#dfe3ee] bg-white px-3 py-2.5 text-sm text-[#1d2940] outline-none focus:border-[#6177e8]';
const buttonClass =
  'rounded-xl bg-[#1E4FD8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E2F66]';
