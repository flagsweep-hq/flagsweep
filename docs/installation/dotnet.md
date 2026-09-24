# Build from source

Run the API and the web UI directly on your machine. This is the setup for developing Flagsweep, and it also works for running it without Docker.

## Prerequisites

- .NET 10 SDK
- Node.js 22 or newer
- Docker, only if you want the local Azure App Configuration emulator or the test suites

## Run the API and the UI

The API and the web UI are separate processes in development. Start each in its own terminal.

```bash
# Terminal 1: the API on http://localhost:5001
dotnet run --project src/api/Flagsweep.Api
```

```bash
# Terminal 2: the web UI on http://localhost:5173
cd src/web
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the API, so the UI talks to it without any CORS setup. On first visit you are taken to `/setup` to create the admin account.

The SQLite database is created at `src/api/Flagsweep.Api/data/flagsweep.db`.

## Try it with demo data

Run the API with the sandbox launch profile. It swaps the cloud provider for an in-memory fake, uses a separate `flagsweep-sandbox.db`, and seeds demo flags:

```bash
dotnet run --project src/api/Flagsweep.Api --launch-profile sandbox
```

The equivalent without a launch profile:

```bash
dotnet run --project src/api/Flagsweep.Api -- --sandbox --seed
```

See [Sandbox mode](configuration.md#sandbox-mode) for what the seeder creates.

## A local Azure App Configuration emulator

You do not need an Azure account to develop against a real provider. Flagsweep uses [floci](https://github.com/floci-io/floci-az) for this: an open-source local emulator whose Azure App Configuration module is wire-compatible with the real service, so the same provider code runs unchanged against it. The dev Compose file starts it as a container:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Then create a connection in Flagsweep with this connection string. The emulator accepts any secret in dev mode:

```
Endpoint=http://localhost:4577/devstoreaccount1-appconfig;Id=devstoreaccount1;Secret=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMh0==
```

Each store can be connected only once. For a second connection, give the emulator another account name: replace both `devstoreaccount1`s (in the endpoint path and in `Id=`) with a new name such as `devstoreaccount2`. The emulator keeps each account's data separate.

Emulator storage is in-memory, so flags reset when the container restarts.

## Running the tests

```bash
dotnet test Flagsweep.sln
```

- `tests/Flagsweep.UnitTests`: pure unit tests, no I/O.
- `tests/Flagsweep.FunctionalTests`: the whole API in-process against a floci-az container started by Testcontainers. Requires Docker.
- `tests/Flagsweep.IntegrationTests`: the Azure provider against a real store. Skipped unless `AZURE_APPCONFIG_CONNECTION_STRING` is set. Point it at a dedicated test store; it writes and deletes `flagsweep-test-*` keys, and deletes any it finds that are older than an hour.

End-to-end tests with Playwright and Cucumber live in `e2e/`. They run against a fresh container in sandbox mode:

```bash
cd e2e
npm install
npm run test:local    # starts the container, runs the tests on the host
npm run test:docker   # runs everything in Docker, as CI does
```

C# formatting is enforced in CI:

```bash
dotnet tool restore
dotnet csharpier check .
```

## Settings

Configuration is standard ASP.NET Core. In development the usual places are `src/api/Flagsweep.Api/appsettings.Development.json` and environment variables. The full list is in [Configuration](configuration.md).
