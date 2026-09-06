# Security and Privacy

Financial information is sensitive personal data. Security is a product requirement, not a later enhancement.

## Required controls

- Unique authenticated user accounts; no shared passwords.
- Passwords are hashed with Argon2id; plain-text passwords are never stored, logged, or returned.
- Role-based authorization and household-level data isolation.
- HTTPS for all traffic.
- Encryption at rest provided by the cloud platform.
- Encrypted, tested backups and a documented restore process.
- Audit log for financial changes, imports, exports, and permission changes.
- Batch imports are household-scoped, require owner/editor authorization, and
  must be staged and explicitly confirmed before live financial data changes.
- Session expiration and secure password-reset flow.
- Sessions use random opaque tokens stored only in `HttpOnly`, `Secure`, `SameSite=Lax` cookies. The database stores only a token hash, expiry, and revocation state.
- Secrets stored outside source control.
- Minimal collection of personal information.

## Data handling rules

- Never commit exported finance data, production credentials, or receipt images to the source repository.
- Provide a full household-data export and account deletion path.
- Use anonymized/synthetic data for automated tests and development demos.
- Do not put JSON import bundles, spreadsheets, raw rows, or their contents in
  application logs. Retain only access-controlled import staging data and safe
  audit metadata such as import ID, hash, source type, row counts, and actor.
- Before enabling bank integrations, perform a separate security and privacy assessment.
- Public user registration is disabled in version 1. Users are created through a controlled administrative database process.
- Household market prices, products, grocery plans, and receipt details are private by default. Shared catalog contributions require explicit opt-in and must not reveal household identity, purchases, budgets, or quantities.
