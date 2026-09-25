#!/usr/bin/env bash
# Verifies that a synthetic Docker Compose PostgreSQL database can be backed up
# and restored without ever placing a dump in the repository or publishing it.
set -euo pipefail

if ! docker compose config --quiet; then
  echo "Docker Compose configuration is invalid. Create the local .env from .env.docker.example first." >&2
  exit 1
fi

umask 077
backup_directory="$(mktemp -d "${TMPDIR:-/tmp}/finanzas-backup-restore.XXXXXX")"
restore_container="finanzas-restore-check-$$"
dump_file="$backup_directory/household-check.dump"

cleanup() {
  docker rm --force "$restore_container" >/dev/null 2>&1 || true
  rm -rf "$backup_directory"
}
trap cleanup EXIT

echo "Checking that the Compose database is running..."
docker compose exec -T db pg_isready >/dev/null

echo "Creating an encrypted-at-rest-by-host, owner-only temporary dump..."
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  >"$dump_file"
test -s "$dump_file"

echo "Starting an isolated disposable PostgreSQL 17 restore database..."
docker run --detach --rm --name "$restore_container" \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:17-alpine >/dev/null

until docker exec "$restore_container" pg_isready -U postgres -d postgres >/dev/null 2>&1; do
  sleep 1
done

echo "Restoring the dump and validating core schema and records..."
docker exec -i "$restore_container" pg_restore -U postgres -d postgres --no-owner --no-privileges --exit-on-error <"$dump_file"

schema_tables="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'households', 'memberships', 'accounts', 'transactions', 'obligations', 'invoices', 'debts', 'audit_logs', 'financial_periods');")"
test "$schema_tables" = "10"

households="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc 'SELECT count(*) FROM households;')"
memberships="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc 'SELECT count(*) FROM memberships;')"
audits="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc 'SELECT count(*) FROM audit_logs;')"
transactions="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc 'SELECT count(*) FROM transactions;')"
obligations="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc 'SELECT count(*) FROM obligations;')"
invoices="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc 'SELECT count(*) FROM invoices;')"
debts="$(docker exec "$restore_container" psql -U postgres -d postgres -Atqc 'SELECT count(*) FROM debts;')"

test "$households" -ge 1
test "$memberships" -ge 1
test "$transactions" -ge 1
test "$audits" -ge 1

echo "Restore passed: ${schema_tables} core tables; ${households} household(s); ${memberships} membership(s); ${transactions} transaction(s); ${obligations} obligation(s); ${invoices} invoice(s); ${debts} debt(s); ${audits} audit event(s)."
echo "The isolated restore database and the temporary dump will now be removed."
