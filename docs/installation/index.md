# Installation

Flagsweep is a self-hosted FeatureOps layer on top of the feature flags in your cloud. Your flags stay in your cloud's store, Azure App Configuration today and AWS AppConfig soon, and Flagsweep adds what the console lacks: an attributed audit trail, drift detection, locks, protected environments, owners, and retire-by dates. It is one process that serves both the API and the web UI on a single port. Data lives in a SQLite database in a data directory you choose. There are three ways to run it:

| Method | Best for | Needs |
|--------|----------|-------|
| [Pull from the registry](registry.md) | Running Flagsweep for your team, on a server or in Compose | Docker |
| [Build with Docker](docker.md) | Running the current source, or a fork, as a container | Docker, Git |
| [Build from source](dotnet.md) | Developing Flagsweep, or running it without Docker | .NET 10 SDK, Node.js 22 |

If you only want to look around, every method supports [sandbox mode](configuration.md#sandbox-mode), which replaces the cloud provider with an in-memory fake and can seed demo flags. Nothing touches a real store.

## Quick start

The fastest route is the published image:

```bash
docker run -d --name flagsweep \
  -p 8080:8080 \
  -v flagsweep-data:/app/data \
  ghcr.io/flagsweep-hq/flagsweep:latest
open http://localhost:8080
```

Then follow [Getting started](../guides/getting-started.md) to connect a store and invite your team.

## After installing

- [Configuration](configuration.md): environment variables, password policy, sandbox mode, data and backups, the health endpoint.
- [Getting started](../guides/getting-started.md): first admin, first connection.
