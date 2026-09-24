---
mdx:
  format: mdx
---

# Connection string encryption

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A connection's Azure App Configuration connection string carries a read-write access key, and Flagsweep has to keep it to talk to the store. How it is kept depends on one decision: whether you give Flagsweep a secret key.

| | No secret key (default) | Secret key configured |
|---|---|---|
| Connection strings in the database | Plain text | Encrypted (AES-256-GCM) |
| Someone who copies the data volume or a backup | Can read every connection string | Gets ciphertext; useless without the key |
| Setup | None | Generate a key, set one variable |
| What you must not lose | The data directory | The data directory **and** the key |

Without a key Flagsweep does not pretend: it stores connection strings as entered and logs a warning at every start. Encrypting them with a key that sits in the clear next to the database would stop nobody who has the volume. That is fine for a trial or a locked-down host. For anything else, configure a key.

:::note[Upgrading from v0.1.0]

v0.1.0 always encrypted connection strings, but with a key stored in the clear beside the database. Nothing needs doing on upgrade: at the first start they are converted, to plain text or, if a secret key is configured, to encryption under that key. The log says how many were converted.

:::

## Set it up

### 1. Generate a key

Any string of at least 32 characters works; random is best.

```bash
openssl rand -base64 48
```

Store a copy somewhere safe and separate from your Flagsweep backups, such as a password manager or secrets vault. See [If you lose the key](#if-you-lose-the-key).

### 2. Give it to Flagsweep

Either as a file, which keeps it out of the environment and out of compose files, or as an environment variable, which is simpler and what most orchestrators inject secrets as.

<Tabs>
<TabItem value="Docker Compose, key file">

```bash
mkdir -p secrets && openssl rand -base64 48 > secrets/flagsweep-key.txt
chmod 400 secrets/flagsweep-key.txt
```

```yaml
services:
  flagsweep:
    volumes:
      - flagsweep-data:/app/data
    secrets:
      - flagsweep_key
    environment:
      - DataProtection__SecretKeyFile=/run/secrets/flagsweep_key

secrets:
  flagsweep_key:
    file: ./secrets/flagsweep-key.txt
```

A trailing newline in the file is ignored. Add `secrets/` to `.gitignore`.

</TabItem>
<TabItem value="Docker Compose, variable">

```yaml
services:
  flagsweep:
    volumes:
      - flagsweep-data:/app/data
    environment:
      - DataProtection__SecretKey=${FLAGSWEEP_SECRET_KEY}
```

Put `FLAGSWEEP_SECRET_KEY=...` in a `.env` file next to `docker-compose.yml`, and keep that file out of version control. Do not write the key into `docker-compose.yml` itself.

</TabItem>
<TabItem value="docker run">

```bash
docker run -d --name flagsweep -p 8080:8080 \
  -v flagsweep-data:/app/data \
  -e DataProtection__SecretKey="$(openssl rand -base64 48)" \
  ghcr.io/flagsweep-hq/flagsweep:latest
```

Save the generated key: `docker inspect flagsweep` shows it, but only while the container exists.

</TabItem>
<TabItem value=".NET">

```bash
export DataProtection__SecretKey='...'
dotnet run --project src/api/Flagsweep.Api
```

Or set `DataProtection:SecretKey` with `dotnet user-secrets` in development.

</TabItem>
</Tabs>

On Kubernetes, put the key in a `Secret` and either mount it as a file for `SecretKeyFile` or inject it with `secretKeyRef` for `SecretKey`.

### 3. Check the log

Restart Flagsweep. The log says which mode it is in:

```text
Connection strings are encrypted with secret key 7be9c89d.
```

The eight characters are a fingerprint of the key, so you can tell which key is in use without the log revealing it.

If you enabled the key on an installation that already had connections, their plain-text connection strings are encrypted during that start:

```text
Encrypted 3 connection string(s) with the current secret key.
```

Without a key you see this instead:

```text
Connection strings are stored in PLAIN TEXT: no secret key is configured.
```

## Settings

| Variable | Description |
|----------|-------------|
| `DataProtection__SecretKey` | The key, at least 32 characters. Setting this turns encryption on |
| `DataProtection__SecretKeyFile` | A file containing the key, as an alternative to `SecretKey`. Set only one of the two |
| `DataProtection__PreviousSecretKeys__0` | A retired key, kept so its connection strings can be read and re-encrypted. Add `__1__`, `__2__` for more. See [Rotate the key](#rotate-the-key) |
| `DataProtection__PreviousSecretKeyFiles__0` | The same, from files |
| `DataProtection__KeyRingPath` | Where the key ring for sign-in tokens is kept. Default `<data dir>/keys`. Unrelated to connection strings; leave it on the data volume |

## Startup validation

The configuration is checked before Flagsweep starts serving. If a check fails, the process exits with code 1 and one line that says why, for example:

```text
Flagsweep cannot start: DataProtection:SecretKey must be at least 32 characters. Generate one with: openssl rand -base64 48
```

Flagsweep refuses to start when:

- the key is shorter than 32 characters;
- the key file does not exist or is not readable by uid 1654, the user the container runs as;
- both `SecretKey` and `SecretKeyFile` are set, or previous keys are set without a current one;
- the key, and none of the previous keys, can decrypt a connection string already in the database. The message names the connection.

Failing early is deliberate. The alternative is an installation that starts, looks healthy, and fails the first time someone toggles a flag.

## Rotate the key

Rotate whenever the key may have been exposed, or on whatever schedule your policy sets.

1. Generate a new key.
2. Make it current and list the old one as previous:

    ```yaml
    environment:
      - DataProtection__SecretKey=${FLAGSWEEP_SECRET_KEY}
      - DataProtection__PreviousSecretKeys__0=${FLAGSWEEP_PREVIOUS_SECRET_KEY}
    ```

3. Restart. At that start every connection string that the old key encrypted is re-encrypted with the new one, and the log says how many.
4. Remove the previous key from the configuration. It is no longer needed.

If the old key was exposed, rotating it is not enough: whoever has it and a copy of your volume from before the rotation can still read what was stored then. Rotate the access keys of the affected stores in Azure and [enter the new connection strings](../guides/connect-azure-app-configuration.md).

## Backups

Back up the data directory as a unit: the database and `keys/` (sign-in tokens) go together. Back up the secret key **separately**. A backup that contains both is a backup of plain-text connection strings.

To restore, put back the data directory, configure the same key, and start. Startup validation confirms the two fit.

## If you lose the key

The connection strings stored with it cannot be recovered; that is what the encryption is for. Nothing else is affected, and your flags are safe in Azure.

With only a new key configured, Flagsweep refuses to start, because it cannot decrypt the existing connection strings. So:

1. Remove the `DataProtection__SecretKey*` variables and restart, so it runs without a key. The log names each connection whose connection string can no longer be read.
2. As an admin, open each of those connections' settings and [enter the connection string again](../guides/connect-azure-app-configuration.md).
3. Generate a new key, configure it, and restart. The re-entered connection strings are encrypted during that start.

## Turning encryption off

Removing the key does not decrypt anything. Flagsweep starts, but connections whose connection strings were encrypted stop working until you re-enter them, as above. There is no reason to do this other than a lost key.
