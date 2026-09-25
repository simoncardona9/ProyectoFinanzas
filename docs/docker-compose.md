# Local Docker Compose Runtime

## Purpose

Docker Compose provides the supported local runtime for the application on
Windows, macOS, and Linux. It builds the current source checkout and starts
the web application and its PostgreSQL database together. This is a local
runtime, not a cloud deployment.

## Services

| Service   | Responsibility                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `web`     | Production Next.js server built from `web/`; reachable only by other Compose services.                                          |
| `proxy`   | Caddy HTTPS reverse proxy. It is the only service that publishes host ports (80 and 443 by default).                            |
| `migrate` | One-shot Drizzle migration runner. It must complete successfully before `web` starts.                                            |
| `seed`    | One-shot local-only seed runner. It creates or updates the configured test user and gives it owner access to its test household. |
| `db`      | PostgreSQL 17 with persistent data in the `postgres_data` Docker volume. It is available only to Compose services.               |

The application image is built from the source checked out from GitHub. The
multi-stage Dockerfile installs pinned pnpm dependencies, builds Next.js
standalone output, and uses a non-root production process. The migration
service uses the same source and lockfile, including Drizzle Kit and the SQL
migration files.

## Windows workflow

1. Install Docker Desktop and use its WSL 2 engine.
2. Clone `https://github.com/simoncardona9/ProyectoFinanzas.git`.
3. Copy `.env.docker.example` to `.env`, choose a local `POSTGRES_PASSWORD`,
   set `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, and optionally
   `TEST_HOUSEHOLD_NAME`, and set `APP_DOMAIN` to the Windows machine's LAN IP
   address or DNS name. Use synthetic, local-only credentials. The `.env` file
   must never be committed.
4. Run `docker compose up --build` from the repository root.
5. Visit `https://<APP_DOMAIN>` and confirm `/api/health` returns status 200.
   Sign in with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from `.env`.

For a LAN IP or local hostname, Caddy uses its local certificate authority.
Export `root.crt` from `/data/caddy/pki/authorities/local/` in the `proxy`
container and install it in the trusted root store of every client. Caddy sets
`default_sni` to `APP_DOMAIN` because Windows clients omit SNI when connecting
to an IP address and Docker's TCP proxy can hide the destination IP. For a
public DNS name with ports 80 and 443 reachable, Caddy obtains a public
certificate automatically. Allow inbound TCP ports 80 and 443 through the
Windows private-network firewall profile.

Docker Desktop is the only runtime dependency for this workflow. Node.js,
pnpm, and PostgreSQL on the host are optional and are needed only for direct
source development outside containers.

## Optional public access with ngrok

The normal Compose configuration is for LAN HTTPS. To share the application
temporarily without opening router ports, use the ngrok override. It changes
the proxy to listen only on `127.0.0.1:80` and uses HTTP for the local ngrok to
Caddy hop; ngrok terminates the public HTTPS connection.

```powershell
docker compose -f compose.yaml -f compose.ngrok.yaml up --build -d
ngrok http 80 --url=https://starfish-trailside-rocklike.ngrok-free.dev
```

The ngrok domain must belong to the account configured on the Windows host.
While the command runs, the public URL is reachable from the Internet. Use
only synthetic data and unique test credentials, and stop the command with
`Ctrl+C` when remote access is no longer needed. To return to the normal LAN
HTTPS configuration, stop the stack and start it without
`compose.ngrok.yaml`.

## Kubernetes boundary

Docker Compose is the supported local runtime only. Kubernetes is not
configured for this project: no Kubernetes manifests, Helm charts, cluster
resources, image registry workflow, or deployment process are included.
Kubernetes must not be treated as an alternative runtime until a separate
deployment decision defines its security, secret handling, persistent storage,
ingress/TLS, backup, and operating procedures.

## Operations and data handling

- `docker compose down` stops the stack and preserves the database volume.
- `docker compose down --volumes` also deletes the local Docker database. Use
  it only when test data may be discarded.
- PostgreSQL has no host port mapping. Use
  `docker compose exec db psql -U finanzas_app -d finanzas_dev` for local
  inspection.
- Use synthetic data only. Never commit `.env`, database dumps, credentials,
  or financial exports.
- The seed is idempotent: each `docker compose up` re-enables the configured
  user and applies its configured password. It does not add financial data.

## Backup and restore acceptance (Slice 9.7)

This is an access-controlled **local recovery check**, not a cloud backup
service. It may be run only by the person who controls the local Docker host
and its `.env` file. Use synthetic data only. Do not run it against real
financial data until a separate backup-retention and storage decision exists.

The checked-in helper creates its custom-format PostgreSQL dump in a private
temporary directory, restores it into a separate disposable PostgreSQL 17
container with no published ports, checks the core schema plus household,
membership, financial-record, and audit counts, and then removes both the
container and dump. It never prints the database password or writes a backup
into the repository.

1. Start the normal local stack with synthetic credentials and create at least
   one synthetic financial record with its normal linked audit event. Sign in
   as the seeded owner and retain only the displayed counts needed for the
   review; do not copy record contents into this repository.
2. From the repository root, run:

   ```bash
   ./scripts/verify-compose-backup-restore.sh
   ```

   On Windows, run it from Git Bash or WSL with Docker Desktop available.
   The first run may pull `postgres:17-alpine` for the isolated restore
   container.
3. Record the script's success line in the local acceptance note. It must show
   all ten core tables and non-zero household, membership, transaction, and
   audit counts. The helper fails if those mandatory records are absent; its
   printed transaction, obligation, invoice, and debt counts provide the
   source-versus-restored comparison. Do not accept a mismatch.
4. Confirm the command's cleanup message appeared and that neither a
   `finanzas-restore-check-*` container nor a dump file remains. If a command
   is interrupted, remove only its exact named container and the exact
   temporary directory reported by the script; do not use `docker compose down
   --volumes` as part of this procedure.

For a manually retained emergency copy (outside this acceptance test), use a
directory owned only by the local operator, keep it outside the repository and
encrypted by the host's storage protection, and restrict read permission to
that operator. Its location, retention, and destruction schedule are outside
the current local-only scope. CSV export remains a reporting feature and is
not a recovery substitute.
