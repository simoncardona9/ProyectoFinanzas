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
