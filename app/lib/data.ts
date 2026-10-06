import postgres from 'postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { createClient } from '@/lib/supabase/server';
import { customers, invoices, revenue as fallbackRevenueData } from './placeholder-data';

const sql = process.env.POSTGRES_URL
  ? postgres(process.env.POSTGRES_URL, { ssl: 'require' })
  : null;

function buildInvoiceRows() {
  return invoices.map((invoice, index) => {
    const customer = customers.find((entry) => entry.id === invoice.customer_id);
    return {
      id: `inv-${index + 1}`,
      customer_id: invoice.customer_id,
      amount: invoice.amount,
      status: invoice.status,
      date: invoice.date,
      name: customer?.name ?? 'Unknown Customer',
      email: customer?.email ?? '',
      image_url: customer?.image_url ?? '/customers/evil-rabbit.png',
    };
  });
}

export async function fetchRevenue() {
  if (!sql) {
    return fallbackRevenueData;
  }

  try {
    const data = await sql<Revenue[]>`SELECT * FROM revenue`;
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    return fallbackRevenueData;
  }
}

export async function fetchLatestInvoices() {
  if (!sql) {
    return buildInvoiceRows()
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((invoice) => ({
        ...invoice,
        amount: formatCurrency(invoice.amount),
      }));
  }

  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    return buildInvoiceRows()
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((invoice) => ({
        ...invoice,
        amount: formatCurrency(invoice.amount),
      }));
  }
}

export async function fetchCardData() {
  if (!sql) {
    const numberOfInvoices = invoices.length;
    const numberOfCustomers = customers.length;
    const totalPaidInvoices = formatCurrency(
      invoices
        .filter((invoice) => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    );
    const totalPendingInvoices = formatCurrency(
      invoices
        .filter((invoice) => invoice.status === 'pending')
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  }

  try {
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].count ?? '0');
    const numberOfCustomers = Number(data[1].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      numberOfCustomers: customers.length,
      numberOfInvoices: invoices.length,
      totalPaidInvoices: formatCurrency(
        invoices
          .filter((invoice) => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + invoice.amount, 0),
      ),
      totalPendingInvoices: formatCurrency(
        invoices
          .filter((invoice) => invoice.status === 'pending')
          .reduce((sum, invoice) => sum + invoice.amount, 0),
      ),
    };
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  if (!sql) {
    const search = query.trim().toLowerCase();
    const rows = buildInvoiceRows().filter((invoice) => {
      if (!search) return true;
      return [
        invoice.name,
        invoice.email,
        invoice.amount.toString(),
        invoice.date,
        invoice.status,
      ].some((value) => value.toLowerCase().includes(search));
    });

    return rows.slice(offset, offset + ITEMS_PER_PAGE) as InvoicesTable[];
  }

  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoices;
  } catch (error) {
    console.error('Database Error:', error);
    const search = query.trim().toLowerCase();
    const rows = buildInvoiceRows().filter((invoice) => {
      if (!search) return true;
      return [
        invoice.name,
        invoice.email,
        invoice.amount.toString(),
        invoice.date,
        invoice.status,
      ].some((value) => value.toLowerCase().includes(search));
    });

    return rows.slice(offset, offset + ITEMS_PER_PAGE) as InvoicesTable[];
  }
}

export async function fetchInvoicesPages(query: string) {
  if (!sql) {
    const search = query.trim().toLowerCase();
    const matchingRows = buildInvoiceRows().filter((invoice) => {
      if (!search) return true;
      return [
        invoice.name,
        invoice.email,
        invoice.amount.toString(),
        invoice.date,
        invoice.status,
      ].some((value) => value.toLowerCase().includes(search));
    });
    return Math.max(1, Math.ceil(matchingRows.length / ITEMS_PER_PAGE));
  }

  try {
    const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    const search = query.trim().toLowerCase();
    const matchingRows = buildInvoiceRows().filter((invoice) => {
      if (!search) return true;
      return [
        invoice.name,
        invoice.email,
        invoice.amount.toString(),
        invoice.date,
        invoice.status,
      ].some((value) => value.toLowerCase().includes(search));
    });
    return Math.max(1, Math.ceil(matchingRows.length / ITEMS_PER_PAGE));
  }
}

function normalizeInvoiceStatus(status: string): InvoiceForm['status'] {
  return status === 'paid' ? 'paid' : 'pending';
}

export async function fetchInvoiceById(id: string) {
  if (!sql) {
    const invoice = buildInvoiceRows().find((item) => item.id === id);
    if (!invoice) return undefined;
    return {
      id: invoice.id,
      customer_id: invoice.customer_id,
      amount: invoice.amount / 100,
      status: normalizeInvoiceStatus(invoice.status),
    } satisfies InvoiceForm;
  }

  try {
    const data = await sql<{ id: string; customer_id: string; amount: number; status: string }[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,
      amount: invoice.amount / 100,
      status: normalizeInvoiceStatus(invoice.status),
    }));

    return invoice[0] as InvoiceForm | undefined;
  } catch (error) {
    console.error('Database Error:', error);
    const invoice = buildInvoiceRows().find((item) => item.id === id);
    if (!invoice) return undefined;
    return {
      id: invoice.id,
      customer_id: invoice.customer_id,
      amount: invoice.amount / 100,
      status: normalizeInvoiceStatus(invoice.status),
    } satisfies InvoiceForm;
  }
}

export async function fetchCustomers() {
  if (!sql) {
    return customers.map(({ id, name }) => ({ id, name }));
  }

  try {
    const customersList = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customersList;
  } catch (err) {
    console.error('Database Error:', err);
    return customers.map(({ id, name }) => ({ id, name }));
  }
}

export async function fetchFilteredCustomers(query: string) {
  if (!sql) {
    const search = query.trim().toLowerCase();
    return customers
      .filter((customer) => {
        if (!search) return true;
        return [customer.name, customer.email].some((value) =>
          value.toLowerCase().includes(search),
        );
      })
      .map((customer) => {
        const customerInvoices = invoices.filter(
          (invoice) => invoice.customer_id === customer.id,
        );
        const totalPending = customerInvoices
          .filter((invoice) => invoice.status === 'pending')
          .reduce((sum, invoice) => sum + invoice.amount, 0);
        const totalPaid = customerInvoices
          .filter((invoice) => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + invoice.amount, 0);

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          image_url: customer.image_url,
          total_invoices: customerInvoices.length,
          total_pending: formatCurrency(totalPending),
          total_paid: formatCurrency(totalPaid),
        };
      });
  }

  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customerRows = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customerRows;
  } catch (err) {
    console.error('Database Error:', err);
    const search = query.trim().toLowerCase();
    return customers
      .filter((customer) => {
        if (!search) return true;
        return [customer.name, customer.email].some((value) =>
          value.toLowerCase().includes(search),
        );
      })
      .map((customer) => {
        const customerInvoices = invoices.filter(
          (invoice) => invoice.customer_id === customer.id,
        );
        const totalPending = customerInvoices
          .filter((invoice) => invoice.status === 'pending')
          .reduce((sum, invoice) => sum + invoice.amount, 0);
        const totalPaid = customerInvoices
          .filter((invoice) => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + invoice.amount, 0);

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          image_url: customer.image_url,
          total_invoices: customerInvoices.length,
          total_pending: formatCurrency(totalPending),
          total_paid: formatCurrency(totalPaid),
        };
      });
  }
}

export type Patient = {
  id: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
};

export async function fetchPatients(): Promise<Patient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, phone, date_of_birth, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message);
  }
  return (data ?? []) as Patient[];
}

export async function fetchPatientById(id: string): Promise<Patient | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, phone, date_of_birth, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(error.message);
  }
  return (data as Patient | null) ?? null;
}
