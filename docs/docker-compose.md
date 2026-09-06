# Local Docker Compose Runtime

## Purpose

Docker Compose provides the supported local runtime for the application on
Windows, macOS, and Linux. It builds the current source checkout and starts
the web application and its PostgreSQL database together. This is a local
runtime, not a cloud deployment.

## Services

| Service   | Responsibility                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `web`     | Production Next.js server built from `web/`; publishes port 3000 by default.                                                     |
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
   and set `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, and optionally
   `TEST_HOUSEHOLD_NAME`. Use synthetic, local-only credentials. The `.env`
   file must never be committed.
4. Run `docker compose up --build` from the repository root.
5. Visit `http://localhost:3000` and confirm `/api/health` returns status 200.
   Sign in with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from `.env`.

Docker Desktop is the only runtime dependency for this workflow. Node.js,
pnpm, and PostgreSQL on the host are optional and are needed only for direct
source development outside containers.

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
