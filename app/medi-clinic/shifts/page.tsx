import { requireClinicRole } from '../lib/access';
import { fetchClinicProviders, fetchProviderShifts } from '../lib/data';
import { demoDoctors, demoShifts } from '../lib/demo-data';
import { loadDoctorSchedule, requireSelectedDoctor } from '../lib/doctor-context';
import { SampleBanner } from '../ui/doctor-dashboard';
import AvailabilityForm from '../ui/availability-form';
import WeeklyShifts from '../ui/weekly-shifts';

export default async function ClinicShiftsPage() {
  const { role } = await requireClinicRole(['owner', 'admin', 'front_desk', 'doctor']);

  if (role === 'doctor') {
    const { selected } = await requireSelectedDoctor();
    const schedule = await loadDoctorSchedule(selected);
    return (
      <div className="space-y-6">
        <PageHeading subtitle={selected.display_name} title="My shifts" />
        {schedule.sampleShifts ? (
          <SampleBanner>
            Showing a sample weekly shift pattern for {selected.display_name}. Shifts set
            by the clinic owner will appear here automatically.
          </SampleBanner>
        ) : null}
        <section className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]">
          <WeeklyShifts shifts={schedule.shifts} />
        </section>
      </div>
    );
  }

  const [providersResult, shiftsResult] = await Promise.allSettled([
    fetchClinicProviders(),
    fetchProviderShifts(),
  ]);
  const providers =
    providersResult.status === 'fulfilled' ? providersResult.value : [];
  const shifts = shiftsResult.status === 'fulfilled' ? shiftsResult.value : [];
  const useSample = providers.length === 0;
  const canEdit = (role === 'owner' || role === 'admin') && !useSample;

  return (
    <div className="space-y-6">
      <PageHeading subtitle={
          role === 'owner' || role === 'admin'
            ? 'Weekly availability. Open "Change availability" to edit when a provider works.'
            : 'Weekly availability, Monday to Friday'
        } title="Provider shifts" />
      {useSample ? (
        <SampleBanner>
          No providers are set up yet, so sample doctors and shifts are shown. Add real
          providers under Providers &amp; availability.
        </SampleBanner>
      ) : null}
      {(useSample ? demoDoctors : providers).map((provider) => (
        <section
          className="rounded-2xl border border-[#e9eaf0] bg-white p-6 shadow-[0_8px_30px_rgba(31,41,55,0.04)]"
          key={provider.id}
        >
          <WeeklyShifts
            heading={`${provider.display_name} · ${provider.specialty}`}
            shifts={
              useSample
                ? demoShifts(provider)
                : shifts.filter((shift) => shift.provider_id === provider.id)
            }
          />
          {canEdit ? (
            <details className="mt-4 rounded-xl border border-[#e9eaf0] bg-[#fafbfe] px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-[#1E4FD8]">
                Change availability
              </summary>
              <AvailabilityForm
                providerId={provider.id}
                shifts={shifts.filter((shift) => shift.provider_id === provider.id)}
              />
            </details>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function PageHeading({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div>
      <p className="text-sm text-[#74809a]">{subtitle}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
    </div>
  );
}
