# Flagsweep how-to guides

These guides are for people using a running Flagsweep instance. For installation, configuration, and local development, see [Installation](../installation/index.md).

Flagsweep is a self-hosted FeatureOps layer on top of the feature flags in your cloud. Your flags stay in your cloud's store, Azure App Configuration today and AWS AppConfig soon, and Flagsweep adds what the console lacks: an attributed audit trail, drift detection, locks, protected environments, owners, and retire-by dates. Every flag write goes straight through to the store.

## Guides

| Guide | What it covers |
|-------|----------------|
| [Getting started](getting-started.md) | First admin account, first connection: the path from empty instance to a working flag list |
| [Connect Azure App Configuration](connect-azure-app-configuration.md) | Connecting a store with its access keys, one connection per store, testing the connection and rotating keys |
| [Connections and environments](connections-and-environments.md) | How environments map onto your store, adding, renaming, reordering, and deleting environments |
| [Flags across environments](flags-across-environments.md) | The flag-first views: one row per flag with its rollout strip, and a flag's own page for changing any environment |
| [Managing flags](managing-flags.md) | Create, toggle, edit, and delete boolean flags; owners; retire-by dates and permanent flags; search and filters |
| [Locks and protected environments](locks-and-protection.md) | Locking a flag in the store, protecting an environment so only admins can change it |
| [Out of sync and drift](drift-detection.md) | What the Out of sync badge means, how it is computed, and how it clears; and why drift between environments is a different thing |
| [Audit trail](audit-trail.md) | What is recorded, what is not, how to read an entry, filtering and paging |
| [Team and access](team-and-access.md) | Inviting users, admin vs member, changing roles, removing and restoring users, password resets |

## Roles at a glance

| Capability | Member | Admin |
|---|---|---|
| View dashboard, flags, audit | yes | yes |
| Create, toggle, edit, delete flags in an unprotected environment | yes | yes |
| Same, in a protected environment | no | yes |
| Assign a flag owner | yes | yes |
| Create a connection (connect a store) | no | yes |
| Connection settings (store, environments, protection) | no | yes |
| Lock or unlock a flag in the store | only flags they own | yes |
| Invite, change roles, remove, restore users; issue password reset links | no | yes |
