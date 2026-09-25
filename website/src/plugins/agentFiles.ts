import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import type {LoadContext, Plugin} from '@docusaurus/types';
import {readFile, writeFile} from 'fs/promises';
import path from 'path';
import sidebars from '../../sidebars';

type SidebarItems = Extract<SidebarsConfig[string], unknown[]>;

const docIdsOf = (items: SidebarItems): string[] =>
  items.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (item.type === 'doc') return [item.id];
    if (item.type === 'category')
      return [
        ...(item.link?.type === 'doc' ? [item.link.id] : []),
        ...(Array.isArray(item.items) ? docIdsOf(item.items) : []),
      ];
    return [];
  });

// robots.txt, llms.txt, llms-full.txt and pricing.md are written at build time so the site URL
// comes from docusaurus.config.ts, and llms-full.txt is the docs in sidebar order.
const agentFiles = (context: LoadContext): Plugin => {
  const {url, baseUrl} = context.siteConfig;
  const siteUrl = `${url}${baseUrl}`;
  const docsDir = path.resolve(context.siteDir, '../docs');

  const docUrl = (id: string) => `${siteUrl}docs/${id.replace(/\/index$/, '')}/`;

  const robots = `User-agent: *
Allow: /

# AI search and assistant crawlers are welcome: being read by them is how Flagsweep gets cited.
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: OAI-SearchBot
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: Bingbot
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`;

  const llms = `# Flagsweep

> Flagsweep is a self-hosted FeatureOps layer on top of the feature flags in your cloud. Your flags stay in your cloud's store, Azure App Configuration today and AWS AppConfig soon, and Flagsweep adds what the console lacks: an attributed audit trail, drift detection, locks, protected environments, owners, and retire-by dates.

Your applications keep reading flags from your cloud's store with the SDKs they already use. Flagsweep writes to the same store, and leaves feature filters and variants set in the console as they are. It manages boolean flags only. People without access to the cloud account can see and change flags, with admin and member roles and link-based invitations.

The docs are under ${siteUrl}docs/, all of them in one file at ${siteUrl}llms-full.txt, and the source is at https://github.com/flagsweep-hq/flagsweep.

## Installation

- [Installation](${docUrl('installation/index')}): the three ways to run it, and the quick start with the published image
- [Pull from the registry](${docUrl('installation/registry')}): running the image from ghcr.io, Compose, upgrades
- [Build with Docker](${docUrl('installation/docker')}): building the image from the current source or a fork
- [Build from source](${docUrl('installation/dotnet')}): running it without Docker, sandbox mode, the test suites
- [Configuration](${docUrl('installation/configuration')}): environment variables, password policy, sandbox mode, data and backups, the health endpoint
- [Connection string encryption](${docUrl('installation/connection-string-encryption')}): plain text unless DataProtection__SecretKey is set, key rotation

## Guides

- [Getting started](${docUrl('guides/getting-started')}): first admin account, first connection: the path from empty instance to a working flag list
- [Connect Azure App Configuration](${docUrl('guides/connect-azure-app-configuration')}): connecting a store with its access keys, one connection per store, testing the connection and rotating keys
- [Connections and environments](${docUrl('guides/connections-and-environments')}): how environments map onto your store, adding, renaming, reordering, and deleting environments
- [Flags across environments](${docUrl('guides/flags-across-environments')}): one row per flag with its rollout strip, and a flag's own page for changing any environment
- [Managing flags](${docUrl('guides/managing-flags')}): create, toggle, edit, and delete boolean flags; owners; retire-by dates and permanent flags; search and filters
- [Locks and protected environments](${docUrl('guides/locks-and-protection')}): locking a flag in the store, protecting an environment so only admins can change it
- [Out of sync and drift](${docUrl('guides/drift-detection')}): what the Out of sync badge means, how it is computed, and how it clears; and why drift between environments is a different thing
- [Audit trail](${docUrl('guides/audit-trail')}): what is recorded, what is not, how to read an entry, filtering and paging
- [Team and access](${docUrl('guides/team-and-access')}): inviting users, admin vs member, changing roles, removing and restoring users, password resets

## Editions

- [Pricing](${siteUrl}pricing.md): the open-source edition is free with no limits; the Enterprise edition is planned
- [Editions](${siteUrl}#editions): what each edition includes
- [Contact](${siteUrl}contact/): questions, and interest in the Enterprise edition

## Optional

- [Changelog](${siteUrl}changelog/)
- [FeatureOps manifesto](https://featureops.io/): the vendor-neutral discipline Flagsweep follows
`;

  const pricing = `# Pricing: Flagsweep

## Open source (self-hosted)

- Price: free
- Licence: Apache-2.0
- Limits: none. No per-seat pricing; unlimited flags, connections, environments and users.
- Includes: flag management, attributed audit trail, out-of-sync detection, drift between environments, protected environments, flag locks, flag ownership, retire-by dates, team and access
- Providers: Azure App Configuration today. AWS AppConfig is coming soon.
- Install: ${docUrl('installation/index')}

## Enterprise (self-hosted)

- Status: planned, not yet available
- Price: commercial licence; there are no public prices yet
- Everything in open source, plus: approval workflows, single sign-on (SSO), drift alerts, Azure DevOps and GitHub integrations, CI gates
- Contact: ${siteUrl}contact/

Last updated: 2026-09-25
`;

  const docIds = Object.values(sidebars).flatMap((sidebar) => (Array.isArray(sidebar) ? docIdsOf(sidebar) : []));

  return {
    name: 'agent-files',
    async postBuild({outDir}) {
      const sections = await Promise.all(
        docIds.map(async (id) => {
          const source = await readFile(path.join(docsDir, `${id}.md`), 'utf8');
          const body = source
            .split('\n')
            .filter((line) => !line.startsWith('!['))
            .join('\n')
            .replace(/^# (.*)$/m, `# $1\n\nSource: ${docUrl(id)}`);
          return body.trim();
        }),
      );
      const llmsFull = `# Flagsweep documentation\n\n${llms.split('\n')[2]}\n\n---\n\n${sections.join('\n\n---\n\n')}\n`;

      await Promise.all([
        writeFile(path.join(outDir, 'robots.txt'), robots),
        writeFile(path.join(outDir, 'llms.txt'), llms),
        writeFile(path.join(outDir, 'llms-full.txt'), llmsFull),
        writeFile(path.join(outDir, 'pricing.md'), pricing),
      ]);
    },
  };
};

export default agentFiles;
