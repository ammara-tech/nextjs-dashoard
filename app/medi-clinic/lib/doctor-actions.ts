'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireClinicRole } from './access';
import { DOCTOR_COOKIE } from './doctor-cookie';
import { getDoctorOptions } from './doctor-context';

export async function selectDoctor(formData: FormData) {
  await requireClinicRole(['doctor']);
  const doctorId = formData.get('doctor_id');
  const { doctors } = await getDoctorOptions();
  if (
    typeof doctorId !== 'string' ||
    !doctors.some((doctor) => doctor.id === doctorId)
  ) {
    throw new Error('Select a doctor from the list.');
  }
  (await cookies()).set(DOCTOR_COOKIE, doctorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  revalidatePath('/medi-clinic', 'layout');
  redirect('/medi-clinic');
}
