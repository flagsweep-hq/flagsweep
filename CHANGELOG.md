# Changelog

## [0.1.0] - Unreleased

First release. Flagsweep is a self-hosted FeatureOps layer on top of the feature flags in your cloud. Your flags stay in Azure App Configuration, and Flagsweep adds what the portal lacks: an attributed audit trail, drift detection, locks, protected environments, owners, and retire-by dates.

Boolean flags only. Multi-variant flags, feature filters, AWS AppConfig, and a hosted edition are planned.

### Connect

- A connection is one Azure App Configuration store, reached with its access-key connection string.
- Environments map to Azure labels, in an order you choose.
- Connection strings are encrypted with AES-256-GCM when you provide a secret key, with key rotation and startup validation. Without a key they are stored in plain text.

### Flags

- The flag list has one row per flag, with a rollout strip that shows every environment and switches it.
- Each flag has a page where you toggle it, add it to environments that lack it, lock it, edit it, and delete it across all environments at once.
- Every flag has an owner, which any member can assign. The dashboard's **My flags** card lists yours.
- Every flag gets a retire-by date, 90 days out by default, unless you mark it permanent.
- Status badges, with a matching filter, mark flags that are Out of sync, Drift, Locked, Overdue, Retiring soon, or Owner deleted.

### Govern

- The audit trail records who changed which flag, in which environment, when, and the old and new values. It can be filtered, and entries survive the removal of the user.
- Drift marks a flag switched differently from the baseline environment.
- Out of sync marks a flag changed outside Flagsweep: in the portal, the CLI, or a pipeline.
- An admin or the flag's owner can lock a flag, which makes it read-only in Azure itself.
- In a protected environment only admins can change flags, and every toggle asks for confirmation.

### Team

- There are two roles, Admin and Member. The first account becomes the admin.
- Admins invite users by link, change roles, reset passwords, and remove users.
- Re-inviting a removed user's email restores the account with its audit history intact.
- The password policy is configurable.

### Run it

- One Docker image for `linux/amd64` and `linux/arm64` at `ghcr.io/flagsweep-hq/flagsweep`, with build provenance. It runs as an unprivileged user.
- All state lives in one directory: a SQLite database and its key ring.
- The image is set up to run behind a reverse proxy that terminates TLS, and sends security headers on every response.
- `GET /health` reports status, version, uptime, and database connectivity.
- Sandbox mode (`--sandbox --seed`) lets you try it without an Azure account.
- The documentation site covers installation, configuration, and a guide per feature.

[0.1.0]: https://github.com/flagsweep-hq/flagsweep/releases/tag/v0.1.0
