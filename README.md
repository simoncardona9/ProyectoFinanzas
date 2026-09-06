# Finanzas Familiares

Aplicación web local para que un hogar organice ingresos, gastos, cuentas,
categorías, obligaciones y reservas sin depender de fórmulas de una planilla.
El objetivo es reemplazar gradualmente el libro de cálculo familiar por una
fuente de información financiera trazable, privada y fácil de usar.

La interfaz está pensada inicialmente para español de Uruguay y maneja UYU y
USD. El proyecto se encuentra en desarrollo activo: no contiene ni debe
contener datos financieros reales, credenciales ni exportaciones personales.

## Estado actual

Están completados los cimientos del proyecto, la autenticación con aislamiento
por hogar y la estructura financiera inicial. Un propietario o editor puede
administrar cuentas y categorías desde `/structure`; las transacciones y los
reportes llegarán en los siguientes pasos del plan.

El avance detallado y los criterios de cada etapa están en
[docs/development-progress.md](docs/development-progress.md) y
[docs/development-process.md](docs/development-process.md).

## Organización del repositorio

```text
.
├── web/                         Aplicación Next.js, API, base de datos y pruebas
├── docs/                        Producto, arquitectura, reglas y proceso
├── Resumen_Financiero_Agosto_2026.md
│                                Resumen histórico de referencia del libro fuente
└── _Finanzas Familiares_Agosto_2026_dashboard_actualizado.xlsm
                                 Libro fuente: no editar ni usar como datos de prueba
```

### `web/`

Contiene el monolito modular de Next.js/TypeScript, las rutas REST bajo
`/api/v1`, el esquema y las migraciones de PostgreSQL con Drizzle, y las
pruebas con Vitest. Consulta [web/README.md](web/README.md) para requisitos,
configuración local y comandos de desarrollo.

### `docs/`

Contiene la documentación que guía el producto y su implementación. Su índice
completo está en [docs/README.md](docs/README.md). Las referencias más útiles
para comenzar son:

- [Visión del producto](docs/vision.md) y [requisitos](docs/requirements.md).
- [Arquitectura](docs/architecture.md) y [tecnologías](docs/technology-stack.md).
- [Modelo de datos](docs/data-model.md) y [reglas de negocio](docs/business-rules.md).
- [Diseño de API](docs/backend-api-design.md) y el contrato
  [OpenAPI](docs/api/openapi.v1.yaml).
- [Seguridad y privacidad](docs/security-privacy.md), [migración de datos](docs/data-migration.md)
  y [flujo de Git](docs/git-workflow.md).

## Principios del proyecto

- Los datos de cada hogar están aislados en el servidor y los permisos se
  verifican en cada operación.
- Los importes se guardan en unidades monetarias menores; UYU y USD nunca se
  suman sin una tasa de cambio explícita.
- Los cambios se entregan en cortes verticales pequeños, con validación y
  pruebas, antes de ampliar el alcance.
- Durante la fase actual, todo funciona únicamente en local con datos
  sintéticos. Cualquier despliegue en la nube requiere aprobación separada.

## Empezar a trabajar

1. Lee [web/README.md](web/README.md) y prepara Node.js 20+, pnpm y PostgreSQL
   local.
2. Configura `web/.env.local` a partir de su archivo de ejemplo, sin confirmar
   credenciales.
3. Desde `web/`, instala dependencias, aplica las migraciones y ejecuta las
   verificaciones indicadas en ese README.
4. Antes de implementar una funcionalidad, revisa el paso actual en
   [docs/development-process.md](docs/development-process.md) y las reglas que
   le correspondan.

No introduzcas datos reales hasta que las etapas de estabilidad, respaldo y
reconciliación previstas por el proceso estén aprobadas.

## Ejecutar con Docker

Docker Compose inicia la aplicación actual, PostgreSQL 17 y aplica las
migraciones de Drizzle antes de arrancar la web.

En Windows instala Docker Desktop y habilita su motor WSL 2. No hace falta
instalar Node.js, pnpm ni PostgreSQL: los contenedores los incluyen.

1. Abre PowerShell y descarga el código desde GitHub:

   ```powershell
   git clone https://github.com/simoncardona9/ProyectoFinanzas.git
   cd ProyectoFinanzas
   ```

   Si el repositorio es privado, inicia sesión en GitHub cuando Git lo solicite.

2. Copia `.env.docker.example` a `.env`, sustituye `POSTGRES_PASSWORD` por
   una contraseña local segura y elige las credenciales de la cuenta de prueba.
   En PowerShell:

   ```powershell
   Copy-Item .env.docker.example .env
   notepad .env
   ```

3. En `.env`, establece `APP_DOMAIN` al nombre DNS o a la dirección IP LAN del
   equipo Windows que ejecuta Docker. Para usarlo solo desde ese equipo, deja
   `APP_DOMAIN=localhost`.

4. Construye e inicia el sistema:

   ```powershell
   docker compose up --build
   ```

5. Abre `https://<APP_DOMAIN>` e inicia sesión con `TEST_USER_EMAIL` y
   `TEST_USER_PASSWORD` de `.env`. La verificación de disponibilidad está en
   `https://<APP_DOMAIN>/api/health`.

### Acceso HTTPS desde la red local

El proxy Caddy publicado por Docker atiende en los puertos 80 y 443 y reenvía
el tráfico cifrado al contenedor web. No abras el puerto 3000 hacia la red.

- Con un nombre DNS público que resuelva al equipo y puertos 80/443 accesibles,
  Caddy obtiene y renueva automáticamente un certificado de confianza pública.
- Con una IP privada o un nombre local, Caddy emite un certificado desde su CA
  local. Exporta su certificado y confía en él en cada cliente Windows antes de
  abrir la aplicación:

  ```powershell
  docker compose cp proxy:/data/caddy/pki/authorities/local/root.crt .\caddy-root.crt
  Import-Certificate -FilePath .\caddy-root.crt -CertStoreLocation Cert:\LocalMachine\Root
  ```

  Ejecuta el segundo comando desde una consola de PowerShell como administrador.
  Repite la importación en cada equipo cliente. Después accede mediante
  `https://<IP-LAN-DEL-EQUIPO>`.

Permite conexiones TCP entrantes a los puertos 80 y 443 en el Firewall de
Windows para el perfil de red privado.

### Cuenta de prueba de Docker

El servicio `seed` se ejecuta después de las migraciones y antes de iniciar la
web. Crea (o actualiza) una cuenta local de prueba y le concede el rol de
propietario de su hogar. Configúrala en el archivo `.env` que copiaste de la
plantilla:

| Variable              | Obligatoria | Descripción                                                              |
| --------------------- | ----------- | ------------------------------------------------------------------------ |
| `TEST_USER_EMAIL`     | Sí          | Email para iniciar sesión. Usa un email sintético.                       |
| `TEST_USER_PASSWORD`  | Sí          | Contraseña local de la cuenta de prueba. Nunca uses una contraseña real. |
| `TEST_HOUSEHOLD_NAME` | No          | Nombre del hogar de prueba; por defecto `Test household`.                |

El proceso es idempotente: cada `docker compose up` activa nuevamente la
cuenta configurada y aplica la contraseña indicada. No crea transacciones ni
otros datos financieros. Si cambias estas variables, vuelve a ejecutar
`docker compose up` para aplicar el cambio.

Los datos de PostgreSQL se conservan en el volumen `postgres_data`. Para
detener los servicios usa `docker compose down`. Para eliminar también los
datos locales de Docker, usa `docker compose down --volumes`.

PostgreSQL no se publica en el equipo anfitrión; para una consola de base de
datos usa `docker compose exec db psql -U finanzas_app -d finanzas_dev`.
