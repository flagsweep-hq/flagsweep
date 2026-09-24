# Build with Docker

Build the image from source and run it with Compose. Use this when you want to run the current `master`, a branch, or your own fork as a container, without waiting for a release.

## Prerequisites

- Docker with the Compose plugin
- Git

The image build compiles the API and the web UI inside Docker, so you do not need .NET or Node.js on the host.

## Build and run

```bash
git clone https://github.com/flagsweep-hq/flagsweep.git
cd flagsweep
docker compose up -d
open http://localhost:8080
```

The repository's `docker-compose.yml` builds the image from the `Dockerfile`, publishes port 8080, and mounts the `flagsweep-data` named volume at `/app/data` for the SQLite database.

On first visit you are taken to `/setup` to create the admin account. Then follow [Getting started](../guides/getting-started.md).

## Rebuilding after changes

Compose only rebuilds when asked. After pulling new commits or editing the source:

```bash
docker compose up -d --build
```

The volume keeps the database across rebuilds.

## Building the image by itself

To produce an image without Compose, for example to push to your own registry:

```bash
docker build -t flagsweep:local .
docker run -d --name flagsweep -p 8080:8080 -v flagsweep-data:/app/data flagsweep:local
```

## Try it with demo data

Pass the sandbox flags as the container command:

```bash
docker compose run --rm --service-ports flagsweep --sandbox --seed
```

Or with a plain `docker run`, append `--sandbox --seed` after the image name. See [Sandbox mode](configuration.md#sandbox-mode).

## Settings

Add environment variables under the `flagsweep` service in `docker-compose.yml`. The full list is in [Configuration](configuration.md).

The `flagsweep-data` volume holds the database and its key ring, so rebuilds and recreates keep your connections connected and your users signed in. See [Data and backups](configuration.md#data-and-backups).

Connection strings are stored in plain text until you configure a secret key. For anything beyond a trial, follow [Connection string encryption](connection-string-encryption.md).
