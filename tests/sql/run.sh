#!/usr/bin/env bash
# Applies the real migrations to a scratch PostgreSQL, then runs the RLS tests.
# Usage: PGHOST=... PGPORT=... PGUSER=... PGDATABASE=... tests/sql/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -v ON_ERROR_STOP=1 -q"
$P -f tests/sql/stubs.sql
while read -r f; do
  [ -z "$f" ] && continue
  echo "== $f"
  $P -f "supabase/$f"
done < tests/sql/order.txt
echo "== tests"
$P -f tests/sql/rls.test.sql
echo "SQL tests passed"
