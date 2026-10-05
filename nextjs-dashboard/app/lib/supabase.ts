import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

type Condition = { column: string; value: unknown; operator: '=' | '!=' | '>' | '<' | '>=' | '<=' };
type QueryError = Error & { code?: string };
type QueryResult<T> = { data: T | null; error: QueryError | null };

type QueryBuilder<T = Record<string, unknown>[]> = {
  data: T | null;
  error: QueryError | null;
  select: (columns?: string) => QueryBuilder<T>;
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  maybeSingle: () => Promise<QueryResult<Record<string, unknown>>>;
  insert: (values: Record<string, unknown>) => Promise<{ error: QueryError | null }>;
  update: (values: Record<string, unknown>) => {
    eq: (column: string, value: unknown) => Promise<{ error: QueryError | null }>;
  };
  delete: () => {
    eq: (column: string, value: unknown) => Promise<{ error: QueryError | null }>;
  };
};

function buildTableName(table: string) {
  return table.includes('.') ? table : `"${table}"`;
}

export async function createClient() {
  const from = (table: string): QueryBuilder => {
    const state: {
      columns?: string;
      conditions: Condition[];
      orderBy?: { column: string; ascending: boolean };
    } = { conditions: [] };

    const read = async (): Promise<QueryResult<Record<string, unknown>[]>> => {
      try {
        let sqlText = `SELECT ${state.columns ?? '*'} FROM ${buildTableName(table)}`;
        const params: unknown[] = [];

        if (state.conditions.length > 0) {
          const clauses = state.conditions.map((condition, index) => {
            params.push(condition.value);
            return `${condition.column} ${condition.operator} $${index + 1}`;
          });
          sqlText += ` WHERE ${clauses.join(' AND ')}`;
        }

        if (state.orderBy) {
          const direction = state.orderBy.ascending ? 'ASC' : 'DESC';
          sqlText += ` ORDER BY ${state.orderBy.column} ${direction}`;
        }

        const rows = (await sql.unsafe(sqlText, ...(params as any[]))) as Record<string, unknown>[];
        builder.data = rows as any;
        builder.error = null;
        return { data: rows, error: null };
      } catch (error) {
        const typedError = error as QueryError;
        builder.error = typedError;
        return { data: [], error: typedError };
      }
    };

    const builder: QueryBuilder = {
      data: null,
      error: null,
      select(columns = '*') {
        state.columns = columns;
        return builder;
      },
      eq(column, value) {
        state.conditions.push({ column, value, operator: '=' });
        return builder;
      },
      order(column, options) {
        state.orderBy = { column, ascending: options?.ascending ?? true };
        return builder;
      },
      async maybeSingle() {
        const { data, error } = await read();
        return { data: Array.isArray(data) ? (data[0] ?? null) : null, error };
      },
      async insert(values) {
        const columns = Object.keys(values).map((key) => `"${key}"`).join(', ');
        const placeholders = Object.keys(values)
          .map((_, index) => `$${index + 1}`)
          .join(', ');

        try {
          await sql.unsafe(`INSERT INTO ${buildTableName(table)} (${columns}) VALUES (${placeholders})`, ...(Object.values(values) as any[]));
          return { error: null };
        } catch (error) {
          return { error: error as QueryError };
        }
      },
      update(values) {
        const stateForUpdate: { table: string; values: Record<string, unknown>; conditions: Condition[] } = {
          table,
          values,
          conditions: [],
        };

        return {
          async eq(column, value) {
            stateForUpdate.conditions.push({ column, value, operator: '=' });
            try {
              const assignments = Object.entries(stateForUpdate.values)
                .map(([_key], index) => `"${_key}" = $${index + 1}`)
                .join(', ');
              const whereClause = stateForUpdate.conditions
                .map((condition, index) => `${condition.column} = $${Object.keys(stateForUpdate.values).length + index + 1}`)
                .join(' AND ');
              const params = [...Object.values(stateForUpdate.values), ...stateForUpdate.conditions.map((condition) => condition.value)];
              await sql.unsafe(`UPDATE ${buildTableName(stateForUpdate.table)} SET ${assignments} WHERE ${whereClause}`, ...(params as any[]));
              return { error: null };
            } catch (error) {
              return { error: error as QueryError };
            }
          },
        };
      },
      delete() {
        return {
          async eq(column, value) {
            try {
              await sql.unsafe(`DELETE FROM ${buildTableName(table)} WHERE ${column} = $1`, value as any);
              return { error: null };
            } catch (error) {
              return { error: error as QueryError };
            }
          },
        };
      },
    };

    return builder;
  };

  return { from };
}
