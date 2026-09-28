# Finance App Documentation

This folder is the product and technical foundation for replacing the family-finance workbook with a secure cloud application.

| Document | Purpose |
|---|---|
| [vision.md](vision.md) | Problem, goals, users, and product boundaries. |
| [requirements.md](requirements.md) | Functional and non-functional requirements. |
| [functionalities.md](functionalities.md) | Features grouped by release priority. |
| [data-model.md](data-model.md) | Core entities, fields, and relationships. |
| [business-rules.md](business-rules.md) | Financial calculation and classification rules. |
| [architecture.md](architecture.md) | Proposed cloud architecture and engineering principles. |
| [technology-stack.md](technology-stack.md) | Chosen languages, frameworks, and database direction. |
| [docker-compose.md](docker-compose.md) | Local Docker Compose runtime, GitHub checkout, operations, and the Slice 9.7 backup/restore acceptance procedure. |
| [backend-api-design.md](backend-api-design.md) | Backend layers, controllers, endpoint contracts, and module boundaries. |
| [api-documentation-policy.md](api-documentation-policy.md) | Mandatory endpoint-contract and OpenAPI documentation rules. |
| [logging-error-policy.md](logging-error-policy.md) | Structured logging, error handling, and domain-exception rules. |
| [security-privacy.md](security-privacy.md) | Access, privacy, backups, and audit requirements. |
| [data-migration.md](data-migration.md) | Plan to migrate and reconcile the Excel workbook. |
| [dashboard-acceptance.md](dashboard-acceptance.md) | Synthetic local reconciliation checklist for the dashboard. |
| [debt-acceptance.md](debt-acceptance.md) | Synthetic local acceptance checklist for debt payments and selected-rate exposure. |
| [tax-reserve-acceptance.md](tax-reserve-acceptance.md) | Synthetic local acceptance checklist for IVA reserve settlement. |
| [dashboard-tax-reserve-acceptance.md](dashboard-tax-reserve-acceptance.md) | Synthetic local acceptance checklist for protected IVA on the dashboard. |
| [import-historical-acceptance.md](import-historical-acceptance.md) | Synthetic local UI checklist for the Slice 8.4 linked historical import. |
| [import-file-conversion-acceptance.md](import-file-conversion-acceptance.md) | Synthetic local UI checklist for Slice 8.5 CSV/Excel conversion. |
| [import-august-reconciliation-acceptance.md](import-august-reconciliation-acceptance.md) | Slice 8.6 synthetic reconciliation, retry, and rollback checklist. |
| [audit-export-acceptance.md](audit-export-acceptance.md) | Slice 9.6 synthetic UI checklist for audit filtering and CSV export. |
| [grocery-acceptance.md](grocery-acceptance.md) | Slice 10.4 synthetic local checklist for private grocery planning and paid-purchase reconciliation. |
| [roadmap.md](roadmap.md) | Phased implementation plan. |
| [development-process.md](development-process.md) | Incremental delivery, validation, release, and feedback process. |
| [git-workflow.md](git-workflow.md) | Branches, pull requests, local testing, and GitHub ownership rules. |
| [agent-workflow.md](agent-workflow.md) | How development agents should work safely and consistently. |

The workbook remains the source of historical input until its data has been reconciled and imported.
