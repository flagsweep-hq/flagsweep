# Flagsweep: notes for coding agents

Flagsweep is a self-hosted feature flag manager that sits on top of Azure App Configuration. It is a .NET 10 API and a React 19 single-page app, with SQLite for its own data. Flags are boolean only.

[Build from source](docs/installation/dotnet.md) covers running it locally, sandbox mode and the floci-az emulator. This file holds what that page does not.

## Layout

- `src/api/Flagsweep.Api`: minimal-API endpoints, auth wiring, SPA fallback
- `src/api/Flagsweep.Application`: one folder per feature (`Flags`, `Connections`, `Users`, `Audit`), one handler class per use case
- `src/api/Flagsweep.Domain`: entities and rules, no dependencies
- `src/api/Flagsweep.Infrastructure`: EF Core and migrations, the Azure provider behind `IFlagStoreProvider`, the sandbox fake
- `src/web`: Vite, TypeScript, Tailwind v4, shadcn/ui. Feature code is in `src/features`, vendored shadcn components in `src/components/ui`
- `tests/`: `UnitTests`, `FunctionalTests`, `IntegrationTests`
- `e2e/`: Playwright and Cucumber
- `docs/`: the documentation pages, in Markdown, with screenshots in `docs/assets/img`
- `website/`: the Docusaurus site that renders `docs/`, plus the landing page (`src/pages/index.tsx` with `src/css/landing.css`), contact page, changelog page and blog

## Checks

Run what CI runs for the area you touched. A change is not done until these pass.

API, from the repo root:

```bash
dotnet tool restore
dotnet csharpier check .     # "dotnet csharpier format ." fixes it
dotnet build -c Release
dotnet test
```

Web, from `src/web`:

```bash
npm run typecheck
npm run lint
npm test
npm run knip
```

Docs site, from `website`. Run this when you touch `docs/`, `website/` or `CHANGELOG.md`:

```bash
npm ci
npm run typecheck
npm run build    # fails on broken links, anchors and images
```

`npm start` serves it with live reload on http://localhost:3000/. Draft blog posts show there and nowhere else. Search only works in a build, because the local search plugin makes its index at build time: use `npm run build && npm run serve` to try it.

End to end, from `e2e`. Run this when you touch routing, auth, the SPA fallback or a UI flow:

```bash
npm run test:local    # builds the production image, serves it on :9090, runs Cucumber
```

Unused usings and unused private members are build errors in C# (`Directory.Build.props`, `.editorconfig`). Knip fails on unused exports and files in the web app. Delete dead code rather than suppressing the warning.

## Tests

- `UnitTests` are pure, with no I/O.
- `FunctionalTests` run the whole API in-process against a floci-az container started by Testcontainers, so they need Docker. There is one harness: `FunctionalTestFixture` on in-memory SQLite, with `FunctionalTestBase`. `ApiTestBase` only adds "start signed in". Do not add a second harness or an EF InMemory factory.
- `IntegrationTests` talk to a real Azure store and skip unless `AZURE_APPCONFIG_CONNECTION_STRING` is set.
- Web unit tests are Vitest in the node environment, as `*.test.ts` beside the module, with builders in `src/web/src/test/builders.ts`. They cover pure business-rule modules. There are no jsdom or component tests, because e2e covers the UI.
- E2E scenarios are independent. A `Before` hook resets the instance (`POST /api/sandbox/reset`, only mapped with `--sandbox --e2e` and a secret) and creates the admin, except for scenarios tagged `@fresh-install`. Everything else a scenario needs is stated in `Given` steps that seed through the API (`e2e/steps/seed.steps.ts`, `e2e/support/api.ts`). Order is random by default, so do not rely on an earlier scenario. `npx cucumber-js features/x.feature` or `--name "..."` runs just that.
- E2E feature files name a role (`I am signed in as an admin`), never an email and password. Accounts live in `e2e/support/accounts.ts`.
- The e2e suite does not cover the dashboard cards. Check those in a browser after changing `src/web/src/features/dashboard`.

## Code style

- Match the surrounding code. CSharpier and ESLint decide formatting.
- Comments are the exception. Write one only for a non-obvious reason: a constraint, a workaround, a framework behaviour that would surprise the next reader. No comments that restate a name, no XML doc summaries, no section banners.
- Prefer one implementation of a rule over a copy per entity or per layer.
- Commits follow Conventional Commits with a scope, and the subject says what changed in plain words: `refactor(domain): one name normaliser instead of a copy per entity`.
- User-visible changes go under `[Unreleased]` in `CHANGELOG.md`.

## Routing and auth

These cost debugging time before.

- The fallback authorization policy applies to unmatched routes too, so an anonymous request to an unknown URL gets 401, not 404. Probe with a bearer token to see the real status.
- `MapFallbackToFile` is GET and HEAD only, and the 405 is produced before route constraints run. Do not constrain the SPA fallback; see `src/api/Flagsweep.Api/SpaFallback.cs`.
- Do not add an `/api/{**path}` catch-all. It steals the 405 and 415 responses of real endpoints.
- Endpoint filters run after body binding, so a filter cannot hide a route from a malformed body. `Authentication/IdentityRouteAllowlist.cs` replaces the request delegate instead.
- The functional test host has no `wwwroot`. Only the Docker image and the e2e run prove that `index.html` is served.
- Auth is ASP.NET Identity bearer tokens, not JWTs. The first user created at `/setup` is the admin.

## Web

- Tailwind v4: the shadcn stylesheet overrides `--ring` from `@theme inline`, so focus ring colours are set on the component (`components/ui/input.tsx`).
- There is no dark theme. `@custom-variant dark` stays in `index.css` only so the `dark:` variants in vendored shadcn components stay inert.
- Vite HMR sometimes misses CSS variable changes. Restart the dev server before debugging a colour that did not change.

## Docs site

- `.md` files are parsed as CommonMark, not MDX (`markdown.format: 'detect'`), so `<store>` and `{id}` in prose are safe. A page that needs JSX, such as tabs, keeps its `.md` name and sets `mdx: {format: mdx}` in its front matter, so links to it still work on GitHub.
- `![alt](shot.png){ .screenshot screenshot--dialog }` works through `website/src/remark/imageClasses.ts`, which puts the classes on the paragraph. The styles are in `website/src/css/custom.css`.
- A React page that is linked by anchor (`/#features`) has to register it with `useBrokenLinks().collectAnchor`, or the build fails.
- The site URL, base URL and repo URL are constants at the top of `website/docusaurus.config.ts`. The Formspree form ID and the Umami website ID are read there from `FORMSPREE_FORM_ID` and `UMAMI_WEBSITE_ID`, which `docs.yml` sets from repository secrets. Unset, the contact form is disabled and no analytics script is loaded. Umami is cookieless, so the site has no consent banner; do not add an analytics tool that needs one.
- The blog is wired up but has only a draft post and no navbar link yet.
- `website/src/plugins/agentFiles.ts` writes `robots.txt`, `llms.txt`, `llms-full.txt` (the docs in sidebar order) and `pricing.md` into the build, with the site URL from the config. `npm start` does not serve them; only a build has them. Edit the text there, not in `static/`.
- The landing page's JSON-LD (`Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`, `HowTo`) is built from the same constants as the visible copy in `src/pages/index.tsx`, so the FAQ array is the single source for both.
- The social card is `static/img/social-card.png`, rendered from `website/scripts/social-card.html` at 1200×630 with headless Chrome. Regenerate it after changing the tagline. The hero screenshot is `static/img/flag-list.webp`, converted from `docs/assets/img/guides/flag-list.png` (sharp, quality 82); redo it when that screenshot is regenerated.

## Product constraints

- Scope is boolean flags: toggle, lock, environment protection, drift detection, an audit trail with the actor, retire-by dates and flag ownership. Variants, targeting rules and feature filters are out of scope; do not add them as a side effect of other work.
- Azure App Configuration is the only provider, authenticated with an access-key connection string. Other providers and Entra ID auth are planned, and `IFlagStoreProvider` is the seam for them.
- A connection is one store, and is called `Connection` in code, API (`/api/connections`), UI and docs.
- The UI says "Retire by". The wire field is still `expiresAt`.
- Flags are created disabled, in every selected environment at once.
- Connection strings are stored as plain text unless `DataProtection__SecretKey` is set, and with AES-GCM when it is.
- v0.1.0 is not released yet, so the schema lives in a single `InitialCreate` migration. For a schema change, delete the `Migrations` folder and regenerate it with `dotnet ef migrations add InitialCreate --project src/api/Flagsweep.Infrastructure --startup-project src/api/Flagsweep.Api`, and delete any local `data/*.db`. Once v0.1.0 is out, every schema change needs a migration that upgrades an existing install.
- The licence is Apache-2.0. Never write MIT or AGPL in docs or landing copy.

## Local machine

- An editor's Roslyn language server sometimes creates a directory literally named `bin\Debug` inside `src/api/Flagsweep.Api` on macOS. It breaks Docker builds with MSB3552. Fix: `rm -rf 'src/api/Flagsweep.Api/bin\Debug'`, then delete `bin` and `obj`.
- Rebuild the container after API or web changes before running e2e against it.
