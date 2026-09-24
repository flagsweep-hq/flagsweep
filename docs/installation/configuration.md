# Configuration

Settings apply the same way however you run Flagsweep. They are standard ASP.NET Core configuration: environment variables in a container, or `appsettings.*.json` and environment variables when running with .NET. Nested keys use double underscores in variable names, so `Auth:Password:RequiredLength` becomes `Auth__Password__RequiredLength`.

## Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | `Development` also exposes the OpenAPI document at `/openapi/v1.json` |
| `Cors__AllowedOrigins__0` | `http://localhost:5173` | Allowed browser origins. Only relevant when the UI is served from a different origin than the API |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | `true` in the image, `false` with .NET | Trust `X-Forwarded-For` and `X-Forwarded-Proto` from a reverse proxy. See [Running behind a reverse proxy](#running-behind-a-reverse-proxy) |
| `Auth__Password__RequiredLength` | `6` | Minimum password length |
| `Auth__Password__RequireDigit` | `false` | Require a digit |
| `Auth__Password__RequireLowercase` | `false` | Require a lowercase character |
| `Auth__Password__RequireUppercase` | `false` | Require an uppercase character |
| `Auth__Password__RequireNonAlphanumeric` | `false` | Require a symbol |
| `DataProtection__SecretKey` | not set | Key (32+ characters) that encrypts stored connection strings. Not set means they are stored in plain text. See [Connection string encryption](connection-string-encryption.md) for this and the related `SecretKeyFile` and `PreviousSecretKeys` settings |
| `DataProtection__KeyRingPath` | `<data dir>/keys` | Where the key rings are kept. Leave it on the data volume |
| `Sandbox` | `false` | Use in-memory fake providers. Same as `--sandbox` |
| `SeedSandbox` | `false` | Seed demo data. Requires sandbox mode. Same as `--seed` |

## Running behind a reverse proxy

Flagsweep serves plain HTTP on port 8080 and does not terminate TLS itself. For anything beyond a local trial, put a reverse proxy such as Caddy, nginx, or Traefik in front of it and let the proxy handle HTTPS. Two things need to be true for links and cookies to come out right:

1. **Forwarded headers must be on.** Invite links and password-reset links are built from the scheme and host of the incoming request. Without this the app sees the proxy's plain-HTTP hop and generates `http://` links. The Docker image ships with `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true`, so the app honours `X-Forwarded-Proto` and `X-Forwarded-For`, which every common proxy sends. When running with .NET directly, set that variable yourself.
2. **Pass the original `Host` header through.** Caddy and Traefik do this by default. For nginx add `proxy_set_header Host $host;` to the location block.

With forwarded headers on, a client that reaches port 8080 directly can claim any scheme or address in those headers, so do not publish 8080 to the internet; bind it to localhost or a private network and expose only the proxy. If you do run the app without a proxy and want it to ignore those headers, set `ASPNETCORE_FORWARDEDHEADERS_ENABLED=false`.

Send `Strict-Transport-Security` from the proxy rather than the app, since the proxy is the component that owns the TLS endpoint.

The app itself sets `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` on every response. The policy allows scripts and API calls from its own origin only, plus the Figtree font from Google Fonts. If you serve the UI from a different origin than the API, the browser will block the API calls until the `connect-src` directive is widened, so the recommended setup is to serve both from one origin.

## Sandbox mode

Sandbox mode replaces the cloud provider with an in-memory fake and uses a separate database file, `flagsweep-sandbox.db`, so nothing touches a real store or your real data. Turn it on with the `--sandbox` argument or `Sandbox=true`.

Adding `--seed` (or `SeedSandbox=true`) fills every environment of every existing connection with demo flags: a few with owners and retire-by dates, one already overdue, and deliberate differences between environments so the Drift badge and the rollout strips have something to show. The seeder only creates flags, so create a connection first, then restart; otherwise it has nowhere to put them.

The fake provider's flag state is in-memory only, so every restart re-seeds. Flags will show an Out of sync badge after a restart until they are written through Flagsweep again.

## Data and backups

The data directory holds two things: the SQLite database, and the key ring under `keys/`, which protects sign-in tokens. In the container that is `/app/data`, mounted from the `flagsweep-data` named volume; with .NET it is `src/api/Flagsweep.Api/data`. Flag values themselves live in your cloud store, not here.

:::warning[Back up the data directory as a unit]

The database and the key ring under `keys/` go together: restoring the database without it signs every user out, and the key ring is on the volume precisely so it survives the container being replaced or upgraded.

:::

Out of the box, connection strings are stored in plain text, so anyone who can read the volume or a backup of it can read them. Configure a secret key to encrypt them, and keep that key out of the volume's backups: see [Connection string encryption](connection-string-encryption.md).

The container runs as the unprivileged `app` user (uid 1654), not root. A named volume such as `flagsweep-data` picks up the right ownership automatically. If you bind-mount a host directory instead, make it writable by that uid first:

```bash
mkdir -p ./data && sudo chown -R 1654:1654 ./data
```

## Health check

`GET /health` returns status, version, uptime, and database connectivity as JSON without authentication. The Docker image uses it as its healthcheck, and it is a quick way to confirm an upgrade took.
