import {
  createClinicAppointmentType,
  createClinicProvider,
  createClinicProviderBlock,
  createClinicProviderShift,
} from '../lib/actions';
import { requireClinicRole } from '../lib/access';
import {
  fetchClinicAppointmentTypes,
  fetchClinicProviders,
  fetchProviderBlocks,
  fetchProviderShifts,
} from '../lib/data';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default async function ClinicProvidersPage() {
  await requireClinicRole(['owner', 'admin']);
  const [providers, appointmentTypes, shifts, blocks] = await Promise.all([
    fetchClinicProviders(),
    fetchClinicAppointmentTypes(),
    fetchProviderShifts(),
    fetchProviderBlocks(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[#74809a]">Owner-managed scheduling rules</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Providers & availability
        </h1>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <ConfigCard title="Add provider">
          <form action={createClinicProvider} className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider name">
              <input className={inputClass} name="display_name" required />
            </Field>
            <Field label="Specialty">
              <input className={inputClass} name="specialty" required />
            </Field>
            <Field label="Doctor Auth user UUID (optional)">
              <input
                className={inputClass}
                name="auth_user_id"
                placeholder="Link to a doctor account"
              />
            </Field>
            <Field label="IANA time zone">
              <input
                className={inputClass}
                defaultValue="UTC"
                name="time_zone"
                placeholder="Europe/London"
                required
              />
            </Field>
            <Field label="Daily appointment cap">
              <input
                className={inputClass}
                defaultValue="20"
                min="1"
                max="500"
                name="max_daily_appointments"
                required
                type="number"
              />
            </Field>
            <button className={buttonClass} type="submit">
              Add provider
            </button>
          </form>
        </ConfigCard>

        <ConfigCard title="Add appointment type">
          <form
            action={createClinicAppointmentType}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field label="Appointment name">
              <input className={inputClass} name="name" required />
            </Field>
            <Field label="Category">
              <select className={inputClass} name="category" required>
                <option value="">Select a category</option>
                <option>Routine & preventive</option>
                <option>Acute illness</option>
                <option>Chronic condition management</option>
                <option>New or concerning symptoms</option>
                <option>Mental health & administrative</option>
                <option>Specialist consultation</option>
                <option>Surgical consultation</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Duration (minutes)">
              <input
                className={inputClass}
                min="5"
                max="480"
                name="duration_minutes"
                required
                type="number"
              />
            </Field>
            <button className={buttonClass} type="submit">
              Add appointment type
            </button>
          </form>
        </ConfigCard>
      </section>

      <ConfigCard title="Provider weekly shifts">
        {providers.length === 0 ? (
          <p className="text-sm text-[#7b8296]">Add a provider before setting shifts.</p>
        ) : (
          <form
            action={createClinicProviderShift}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <Field label="Provider">
              <select className={inputClass} name="provider_id" required>
                <option value="">Select provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Weekday">
              <select className={inputClass} name="weekday" required>
                {weekdays.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </Field>
            <Field label="Shift starts">
              <input className={inputClass} name="starts_at" required type="time" />
            </Field>
            <Field label="Shift ends">
              <input className={inputClass} name="ends_at" required type="time" />
            </Field>
            <div className="flex items-end">
              <button className={buttonClass} type="submit">Add shift</button>
            </div>
          </form>
        )}
        {shifts.length > 0 && (
          <ul className="mt-4 divide-y divide-[#eff0f4]">
            {shifts.map((shift) => (
              <li className="py-2 text-sm text-[#727a90]" key={shift.id}>
                {providers.find((provider) => provider.id === shift.provider_id)?.display_name}
                {' — '}{weekdays[shift.weekday]} {shift.starts_at.slice(0, 5)}–{shift.ends_at.slice(0, 5)}
              </li>
            ))}
          </ul>
        )}
      </ConfigCard>

      <ConfigCard title="Unavailable blocks">
        {providers.length === 0 ? (
          <p className="text-sm text-[#7b8296]">Add a provider before blocking time.</p>
        ) : (
          <>
            <form
              action={createClinicProviderBlock}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              <Field label="Provider">
                <select className={inputClass} name="provider_id" required>
                  <option value="">Select provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Starts">
                <input className={inputClass} name="starts_at" required type="datetime-local" />
              </Field>
              <Field label="Ends">
                <input className={inputClass} name="ends_at" required type="datetime-local" />
              </Field>
              <Field label="Reason">
                <input className={inputClass} name="reason" required />
              </Field>
              <div className="flex items-end">
                <button className={buttonClass} type="submit">Add block</button>
              </div>
            </form>
            <p className="mt-2 text-xs text-[#9298a8]">
              Enter block times in the selected provider’s time zone.
            </p>
            {blocks.length > 0 && (
              <ul className="mt-4 divide-y divide-[#eff0f4]">
                {blocks.map((block) => (
                  <li className="py-2 text-sm text-[#727a90]" key={block.id}>
                    {providers.find((provider) => provider.id === block.provider_id)?.display_name}
                    {' — '}{new Date(block.starts_at).toLocaleString()} to{' '}
                    {new Date(block.ends_at).toLocaleString()} ({block.reason})
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </ConfigCard>

      <ConfigCard title="Active appointment types">
        {appointmentTypes.length === 0 ? (
          <p className="text-sm text-[#7b8296]">Add an appointment type before booking.</p>
        ) : (
          <ul className="divide-y divide-[#eff0f4]">
            {appointmentTypes.map((type) => (
              <li className="py-2 text-sm text-[#727a90]" key={type.id}>
                {type.category}: {type.name} ({type.duration_minutes} minutes)
              </li>
            ))}
          </ul>
        )}
      </ConfigCard>
    </div>
  );
}

const inputClass = 'mt-1 block w-full rounded-xl border-[#e3e5eb] text-sm';
const buttonClass =
  'rounded-xl bg-[#647cf5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#526be8]';

function ConfigCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-[#e9eaf0] bg-white p-5 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block text-sm text-[#727a90]">
      {label}
      {children}
    </label>
  );
}
