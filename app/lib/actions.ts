'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireClinicStaff } from '@/app/medi-clinic/lib/access';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  // Insert data into the database
  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}

// ---------------------------------------------------------------------
// Clinic patients
// ---------------------------------------------------------------------

export type PatientState = {
  errors?: {
    full_name?: string[];
    email?: string[];
    phone?: string[];
    date_of_birth?: string[];
  };
  message?: string | null;
};

const PatientFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Enter the patient’s full name.')
    .max(160),
  email: z.union([
    z.string().trim().email('Enter a valid email address.').max(254),
    z.literal(''),
  ]),
  phone: z.string().trim().max(40),
  date_of_birth: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.'),
    z.literal(''),
  ]),
});

function parsePatientForm(formData: FormData) {
  return PatientFormSchema.safeParse({
    full_name: formData.get('full_name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    date_of_birth: formData.get('date_of_birth') ?? '',
  });
}

export async function createPatient(
  _prevState: PatientState,
  formData: FormData,
): Promise<PatientState> {
  const { supabase } = await requireClinicStaff();

  const parsed = parsePatientForm(formData);
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing or invalid fields. Patient was not added.',
    };
  }

  const { full_name, email, phone, date_of_birth } = parsed.data;

  // user_id is intentionally omitted: the database fills it with the clinic
  // owner's id, which is what the row-level security policy checks.
  const { error } = await supabase.from('patients').insert({
    full_name,
    email: email || null,
    phone: phone || null,
    date_of_birth: date_of_birth || null,
  });

  if (error) {
    console.error('Create patient error:', error);
    return {
      message:
        error.code === '42501'
          ? 'Your account is not allowed to add patients.'
          : 'Database error: failed to add the patient.',
    };
  }

  revalidatePath('/medi-clinic/patients');
  redirect('/medi-clinic/patients');
}

export async function updatePatient(
  id: string,
  _prevState: PatientState,
  formData: FormData,
): Promise<PatientState> {
  const { supabase } = await requireClinicStaff();

  const parsed = parsePatientForm(formData);
  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
      message: 'Missing or invalid fields. Patient was not updated.',
    };
  }

  const { full_name, email, phone, date_of_birth } = parsed.data;

  const { data, error } = await supabase
    .from('patients')
    .update({
      full_name,
      email: email || null,
      phone: phone || null,
      date_of_birth: date_of_birth || null,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Update patient error:', error);
    return { message: 'Database error: failed to update the patient.' };
  }
  // An update blocked by row-level security returns no error and no row.
  if (!data) {
    return {
      message: 'Patient not found, or you do not have permission to edit it.',
    };
  }

  revalidatePath('/medi-clinic/patients');
  redirect('/medi-clinic/patients');
}

// DELETE is revoked on patients in the database (records are archived, not
// erased), so this archives. Patient lists should filter `archived_at is null`.
export async function deletePatient(id: string) {
  const { supabase } = await requireClinicStaff();

  const { error } = await supabase
    .from('patients')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Archive patient error:', error);
    throw new Error('Failed to archive the patient.');
  }

  revalidatePath('/medi-clinic/patients');
  redirect('/medi-clinic/patients');
}

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
  const credentials = z
    .object({ email: z.string().email(), password: z.string().min(6) })
    .safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

  if (!credentials.success) {
    return 'Invalid email or password.';
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials.data);
  if (error) {
    console.error('Supabase authentication error:', error);
    return 'Invalid email or password.';
  }

  const requestedPath = formData.get('redirectTo');
  const redirectTo =
    typeof requestedPath === 'string' &&
    requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//')
      ? requestedPath
      : '/dashboard';
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Supabase sign-out error:', error);
    throw new Error('Failed to sign out.');
  }
  redirect('/');
}
