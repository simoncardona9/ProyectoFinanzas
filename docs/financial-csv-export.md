# Contrato de exportación CSV financiera

La exportación `GET /api/v1/reports/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv`
entrega una descarga UTF-8 con BOM para una importación segura en aplicaciones de
planilla. Solo propietarios, editores y contadores del hogar activo pueden pedirla.
Una descarga exitosa crea un evento de auditoría `export` / `financial_export` con
el rango, formato y cantidad de filas; no conserva el contenido exportado.

## Alcance y filas

El rango es inclusivo y se aplica a la fecha financiera propia de cada fila:

- movimientos (`transaction:*`) por `date`;
- obligaciones por `dueDate`;
- facturas por `serviceDate`;
- deudas por `incurredDate`; y
- cotizaciones por `effectiveDate`.

No incluye lotes de importación en preparación, contenido original de archivos,
sesiones, credenciales ni el historial de auditoría. Las monedas no se convierten
ni se combinan. El contrato usa una fila por registro con estas columnas estables:
`record_type`, `id`, `date`, `status`, `currency`, `amount_minor`, `account_id`,
`account_name`, `category_id`, `category_name`, `counterparty`, `description` y
`related_record_id`. Los importes se expresan siempre en unidades menores enteras,
salvo `exchange_rate`, cuyo valor es la cotización decimal documentada en la
columna `amount_minor` por compatibilidad de formato.

Todos los campos se entrecomillan, las comillas se escapan según RFC 4180 y los
valores que comienzan con `=`, `+`, `-` o `@` se prefijan con un apóstrofo para que
una planilla no los evalúe como fórmulas.

Esta exportación permite análisis y portabilidad de registros; no es una copia de
seguridad ni un mecanismo de restauración. La recuperación de PostgreSQL se
verifica por separado en la Slice 9.7.
