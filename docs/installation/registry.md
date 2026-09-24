# Pull from the registry

Images are published to `ghcr.io/flagsweep-hq/flagsweep` on GitHub Container Registry by the release workflow. Every image is built for `linux/amd64` and `linux/arm64`, so the same tag works on Intel servers, Apple Silicon, and Graviton. There is nothing to build and no source to check out; Docker is the only requirement.

## Run it

```bash
docker run -d --name flagsweep \
  -p 8080:8080 \
  -v flagsweep-data:/app/data \
  ghcr.io/flagsweep-hq/flagsweep:latest
open http://localhost:8080
```

On first visit you are taken to `/setup` to create the admin account. Then follow [Getting started](../guides/getting-started.md).

The named volume `flagsweep-data` holds the SQLite database and its key ring. Keep it and back it up as a unit. See [Data and backups](configuration.md#data-and-backups).

Connection strings are stored in plain text until you configure a secret key. For anything beyond a trial, follow [Connection string encryption](connection-string-encryption.md).

## Tags

| Tag | Meaning |
|-----|---------|
| `latest` | The most recent release. Fine for trying it out; pin a version for production |
| `1.2.3` | An exact release. Immutable |
| `1.2`, `1` | Floating tags that follow the newest patch or minor release |
| `edge` | The current `master` branch. Passes CI, but has not been released |

Every image is labelled with the commit it was built from (`org.opencontainers.image.revision`), and the [provenance attestation](#verifying-the-image) ties it to the workflow run.

```bash
docker pull ghcr.io/flagsweep-hq/flagsweep:1.2.3
```

## Docker Compose

A minimal `docker-compose.yml` using the published image:

```yaml
services:
  flagsweep:
    image: ghcr.io/flagsweep-hq/flagsweep:1.2.3
    ports:
      - "8080:8080"
    volumes:
      - flagsweep-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:8080/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

volumes:
  flagsweep-data:
```

```bash
docker compose up -d
```

Settings go under `environment:`; the full list is in [Configuration](configuration.md). The image is built to run behind a reverse proxy that terminates TLS; see [Running behind a reverse proxy](configuration.md#running-behind-a-reverse-proxy).

## Upgrading

Change the tag (or keep `latest`), pull, and recreate the container. The volume keeps the database.

```bash
docker compose pull
docker compose up -d
```

`GET /health` reports the running version, so you can confirm the upgrade took.

The volume also holds the key ring, so upgrades keep your users signed in. See [Data and backups](configuration.md#data-and-backups).

## Verifying the image

Each pushed image carries a build provenance attestation linking it to the exact commit and workflow run that produced it. Check it with the GitHub CLI:

```bash
gh attestation verify oci://ghcr.io/flagsweep-hq/flagsweep:1.2.3 \
  --owner flagsweep-hq
```

## Try it with demo data

```bash
docker run -p 8080:8080 ghcr.io/flagsweep-hq/flagsweep:latest --sandbox --seed
```

See [Sandbox mode](configuration.md#sandbox-mode).
