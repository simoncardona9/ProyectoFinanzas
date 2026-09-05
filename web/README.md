# Finanzas Familiares

Aplicación local para centralizar el control financiero de un hogar. El proyecto
se encuentra en su etapa de base técnica; no contiene ni debe contener datos
financieros reales.

## Requisitos

- Node.js 20 o posterior y pnpm.
- PostgreSQL local.

Para ejecutar todo el sistema mediante Docker Compose, consulta la guía de
Docker en el [README principal](../README.md#ejecutar-con-docker). Esa opción
crea los contenedores de Node.js y PostgreSQL, por lo que no requiere instalar
estas dependencias en el equipo anfitrión.

## Configuración local

1. Instalar dependencias con `pnpm install`.
2. Copiar `.env.example` a `.env.local`.
3. Configurar `DATABASE_URL` con la conexión PostgreSQL local. No confirmar
   `.env.local` ni credenciales en el repositorio.

## Comandos

- `pnpm dev`: iniciar la aplicación en desarrollo.
- `pnpm test`: ejecutar pruebas unitarias.
- `pnpm lint`: ejecutar ESLint.
- `pnpm format:check`: comprobar formato.
- `pnpm exec tsc --noEmit`: comprobar tipos.
- `pnpm build`: crear una compilación de producción local.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`: comandos de Drizzle.

## Autenticación (Paso 1)

Ejecutar `pnpm db:migrate` antes de usar el inicio de sesión. Las cuentas se
crean mediante un proceso administrativo controlado; no existe registro público.
El propietario puede agregar una cuenta ya aprovisionada a su hogar desde el
endpoint de miembros. La especificación está en
[`../docs/api/openapi.v1.yaml`](../docs/api/openapi.v1.yaml) y el avance del
proyecto se registra en [`../docs/development-progress.md`](../docs/development-progress.md).

Con la aplicación en marcha, `GET /api/health` responde `200` con
`{"status":"ok"}` cuando PostgreSQL está disponible; responde `503` con
`{"status":"unavailable"}` si no lo está.

## Política de datos y despliegue

El proyecto está limitado al desarrollo local. No se deben subir datos reales,
credenciales ni exportaciones financieras, y no habrá despliegue en la nube
hasta que se apruebe una decisión específica al respecto.
