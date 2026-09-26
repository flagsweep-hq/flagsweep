import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useState, type CSSProperties, type ReactNode} from 'react';
import {AwsIcon, AzureIcon, CopyIcon, GitHubIcon} from '../components/icons';

const TITLE = 'FeatureOps for Azure App Configuration';
const DESCRIPTION =
  'Self-hosted FeatureOps for Azure App Configuration and, soon, AWS AppConfig: an attributed audit trail, drift detection, locks, owners, and retire-by dates.';
const DEFINITION =
  "Flagsweep is a self-hosted FeatureOps layer on top of the feature flags in your cloud. Your flags stay in your cloud's store, Azure App Configuration today and AWS AppConfig soon, and Flagsweep adds what the console lacks: an attributed audit trail, drift detection, locks, protected environments, owners, and retire-by dates.";

const START_COMMAND = `docker run -d --name flagsweep \\
  -p 8080:8080 \\
  -v flagsweep-data:/app/data \\
  ghcr.io/flagsweep-hq/flagsweep:latest`;

const FEATURES = [
  {
    title: 'Audit trail',
    text: 'Every change shows who made it, when, and what it was before.',
    link: 'Audit trail',
    to: '/docs/guides/audit-trail/',
  },
  {
    title: 'Out of sync and drift',
    text: 'A flag changed outside Flagsweep is marked Out of sync. One switched differently from production is marked Drift.',
    link: 'Out of sync and drift',
    to: '/docs/guides/drift-detection/',
  },
  {
    title: 'Protection and locks',
    text: 'Protect production so only admins can change it. Lock a flag so nobody can.',
    link: 'Locks and protection',
    to: '/docs/guides/locks-and-protection/',
  },
  {
    title: 'Owners and expiry dates',
    text: 'Every flag has an owner and a retire-by date, so old flags get cleaned up.',
    link: 'Managing flags',
    to: '/docs/guides/managing-flags/',
  },
  {
    title: 'Every environment at a glance',
    text: "One row per flag shows where it is on, off, or not set yet. You can change any of them from the flag's own page.",
    link: 'Flags across environments',
    to: '/docs/guides/flags-across-environments/',
  },
  {
    title: 'Team access',
    text: 'Invite people with a link as admins or members. They do not need permissions in your cloud account.',
    link: 'Team and access',
    to: '/docs/guides/team-and-access/',
  },
];

const GOVERNANCE_FEATURES = [
  'Flag management',
  'Attributed audit trail',
  'Out-of-sync detection',
  'Drift between environments',
  'Protected environments',
  'Flag locks',
  'Flag ownership',
  'Retire-by dates',
  'Team and access',
];

const ENTERPRISE_FEATURES = [
  'Approval workflows',
  'Single sign-on (SSO)',
  'Drift alerts',
  'Azure DevOps integration',
  'GitHub integration',
  'CI gates',
];

const FAQ = [
  {
    question: 'Is Flagsweep free?',
    answer:
      'Yes. The open-source edition runs on your own infrastructure under the Apache-2.0 licence, with no limits and no per-seat pricing. The Enterprise edition is planned, with approval workflows, single sign-on, drift alerts and CI integrations, and will be sold under a commercial licence. There are no public prices yet.',
  },
  {
    question: 'How is Flagsweep different from the Azure portal?',
    answer:
      "The portal is for people with Azure access, and its revision history records values but no actor. Flagsweep records the signed-in user on every write, marks flags changed in Azure directly, protects environments so only admins can change them, and gives each flag an owner and a retire-by date. People without Azure access can see and change flags.",
  },
  {
    question: 'Does Flagsweep replace my feature flag SDK?',
    answer:
      "No. Your applications keep reading flags from your cloud's store with the SDKs they already use. Flagsweep writes to the same store, and leaves feature filters and variants set in the console as they are.",
  },
  {
    question: 'What do I need to connect a store?',
    answer:
      "A read-write connection string for the store, from Settings > Access keys in the Azure portal. Flagsweep checks that it can connect, reads the store's labels, and maps each environment to one label. The connection string is stored as plain text unless a DataProtection secret key is set, and encrypted when it is.",
  },
  {
    question: 'Do my flag values leave my cloud?',
    answer:
      "No. Flags live in your provider's store and Flagsweep writes to it directly. The self-hosted edition keeps its own database, with the audit trail and user accounts, on your infrastructure.",
  },
  {
    question: 'What happens to feature filters and variants I set in the console?',
    answer:
      'Flagsweep keeps them as they are on every write. It manages the boolean on/off state, ownership, and lifecycle, and never rewrites targeting rules.',
  },
  {
    question: 'Which providers are supported?',
    answer:
      'Azure App Configuration today. AWS AppConfig is next, with the same audit trail, out-of-sync detection, locks, and lifecycle. Mixed Azure and AWS connections will work in one Flagsweep.',
  },
  {
    question: 'Does Flagsweep work with AWS AppConfig?',
    answer:
      'Not yet. AWS AppConfig support is coming soon, with the same attributed audit trail, out-of-sync detection, locks, owners and retire-by dates as Azure App Configuration, and Azure and AWS connections will work side by side in one Flagsweep. Your applications will keep reading flags with the AWS AppConfig SDK they already use. If you want it sooner, tell us on the contact page.',
  },
  {
    question: 'What is the licence?',
    answer:
      'The open-source edition is licensed under the Apache License 2.0. You can run it, modify it, and use it inside closed-source and commercial products, as long as you keep the licence and notice files. The licence does not cover the Flagsweep name or logo. The planned Enterprise edition adds closed-source features and will be sold under a commercial licence.',
  },
  {
    question: 'Where do I ask a question or suggest something?',
    answer:
      'In the Discussions tab of the GitHub repository: Q&A for questions, Ideas for suggestions, and Show and tell for what you built. Bugs go in Issues. Every release is announced there with a thread for feedback, and the contact page reaches us directly for anything private.',
  },
];

const revealDelay = (step: number) => ({'--d': step}) as CSSProperties;

function Hero({repoUrl}: {repoUrl: string}): ReactNode {
  return (
    <section className="fm-hero">
      <div className="fm-hero__copy">
        <h1 className="fm-h1 fm-reveal" style={revealDelay(0)}>
          <em>FeatureOps</em> on top of the feature flags in your cloud.
        </h1>
        <div className="fm-cta fm-reveal" style={revealDelay(2)}>
          <Link className="fm-btn fm-btn--primary" to="/docs/guides/getting-started/">
            Get started
          </Link>
          <Link className="fm-btn fm-btn--ghost" href={repoUrl}>
            <GitHubIcon />
            View on GitHub
          </Link>
        </div>
      </div>

      <figure className="fm-shot fm-reveal" style={revealDelay(1)}>
        <img
          src={useBaseUrl('/img/flag-list.webp')}
          width={1680}
          height={700}
          alt="The Flagsweep flag list: every flag's rollout across Development, Staging and Production, with Drift, Out of sync, Overdue, Retiring soon and Locked badges, owners and retire-by dates"
          loading="eager"
          decoding="async"
        />
      </figure>
    </section>
  );
}

function GettingStarted(): ReactNode {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(START_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="fm-start fm-band" id="start">
      <div className="fm-wrap">
        <div className="fm-section__head">
          <h2>Getting started</h2>
          <p className="fm-section__lede">
            Run the command below, then open <code>localhost:8080</code>, create the admin account and connect your
            store.
          </p>
        </div>
        <div className="fm-code fm-code--copy">
          <div className="fm-code__bar">
            <span />
            <span />
            <span />
            <button
              className={copied ? 'fm-copy fm-copy--done' : 'fm-copy'}
              type="button"
              onClick={copy}
              aria-label="Copy command"
            >
              <CopyIcon />
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre>{START_COMMAND}</pre>
        </div>
        <div className="fm-start__links">
          <Link className="fm-btn fm-btn--primary" to="/docs/guides/getting-started/">
            Read the getting started guide
          </Link>
          <Link className="fm-start__alt" to="/docs/installation/">
            <span className="fm-start__alt-long">Other ways to install, or try it with demo data →</span>
            <span className="fm-start__alt-short">Other ways to install →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Thesis(): ReactNode {
  return (
    <section className="fm-thesis" id="why">
      <div className="fm-thesis__inner">
        <h2 id="what-is-flagsweep">What is Flagsweep?</h2>
        <p className="fm-thesis__lede">{DEFINITION}</p>
        <p className="fm-thesis__close">
          Temporary flags have a way of becoming permanent. Flagsweep gives each one an owner and a retire-by date,
          and records who changed it, when, and what it was before.
        </p>
      </div>
    </section>
  );
}

function Features(): ReactNode {
  useBrokenLinks().collectAnchor('features');

  return (
    <section className="fm-features" id="features">
      <div className="fm-wrap">
        <div className="fm-section__head">
          <h2>Features</h2>
        </div>
        <ul className="fm-features__grid">
          {FEATURES.map((feature) => (
            <li className="fm-feature" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <Link to={feature.to}>{feature.link} →</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Providers(): ReactNode {
  useBrokenLinks().collectAnchor('providers');

  return (
    <section className="fm-providers fm-band" id="providers">
      <div className="fm-wrap">
        <div className="fm-section__head">
          <h2>Providers</h2>
        </div>
        <ul className="fm-logos">
          <li className="fm-logo">
            <span className="fm-logo__mark fm-logo__mark--azure">
              <AzureIcon />
            </span>
            <span className="fm-logo__name">Azure App Configuration</span>
            <span className="fm-chip fm-chip--live">Available now</span>
          </li>
          <li className="fm-logo fm-logo--soon">
            <span className="fm-logo__mark fm-logo__mark--aws">
              <AwsIcon />
            </span>
            <span className="fm-logo__name">AWS AppConfig</span>
            <span className="fm-chip fm-chip--soon">Coming soon</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

const Included = () => <span className="fm-ok" />;
const ComingSoon = () => <span className="fm-chip fm-chip--soon">Coming soon</span>;
const Planned = () => <span className="fm-chip fm-chip--plan">Planned</span>;

function CompareGroup({label}: {label: string}): ReactNode {
  return (
    <tr className="fm-compare__group">
      <th scope="rowgroup" colSpan={3}>
        {label}
      </th>
    </tr>
  );
}

function Editions(): ReactNode {
  useBrokenLinks().collectAnchor('editions');

  return (
    <section className="fm-editions fm-band--accent" id="editions">
      <div className="fm-wrap">
        <div className="fm-section__head">
          <h2>Editions</h2>
        </div>
        <div className="fm-editions__grid">
          <article className="fm-edition">
            <h2 className="fm-edition__name">
              Open source <span className="fm-chip fm-chip--live">Available now</span>
            </h2>
            <p className="fm-edition__tag">Free, and runs on your own infrastructure.</p>
            <p>
              Your flags and your audit history never leave your control. Your apps keep reading your cloud's store
              with the libraries and credentials they already use, so there is no Flagsweep SDK to install and no new
              keys to hand out.
            </p>
            <ul className="fm-checks">
              <li>No limits and no per-seat pricing</li>
              <li>One container to run, one folder to back up</li>
              <li>Apache-2.0 licence</li>
            </ul>
            <Link className="fm-btn fm-btn--ghost" to="/docs/installation/">
              Install it
            </Link>
          </article>
          <article className="fm-edition fm-edition--enterprise">
            <h2 className="fm-edition__name">Enterprise</h2>
            <p className="fm-edition__tag">For teams with governance and compliance needs.</p>
            <p className="fm-edition__plus">Everything in open source, plus</p>
            <ul className="fm-checks">
              <li>Approval workflows: an engineer requests a change, product approves it</li>
              <li>Single sign-on (SSO) with your identity provider</li>
              <li>Drift alerts</li>
              <li>Azure DevOps and GitHub integrations, with CI gates in your pipelines</li>
              <li>Feature requests welcome: tell us what your team needs</li>
            </ul>
            <Link className="fm-btn fm-btn--primary" to="/contact/">
              Contact us
            </Link>
          </article>
        </div>
        <details className="fm-compare">
          <summary>Compare all features</summary>
          <div className="fm-compare__scroll">
            <table className="fm-compare__table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="fm-sr">Feature</span>
                  </th>
                  <th scope="col">Open source (self-hosted)</th>
                  <th scope="col" className="fm-compare__enterprise">
                    Enterprise (self-hosted)
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompareGroup label="Governance" />
                {GOVERNANCE_FEATURES.map((feature) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    <td>
                      <Included />
                    </td>
                    <td>
                      <Included />
                    </td>
                  </tr>
                ))}
                <CompareGroup label="Providers" />
                <tr>
                  <th scope="row">Azure App Configuration</th>
                  <td>
                    <Included />
                  </td>
                  <td>
                    <Included />
                  </td>
                </tr>
                <tr>
                  <th scope="row">AWS AppConfig</th>
                  <td>
                    <ComingSoon />
                  </td>
                  <td>
                    <ComingSoon />
                  </td>
                </tr>
                <CompareGroup label="Enterprise" />
                {ENTERPRISE_FEATURES.map((feature) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    <td>
                      <span className="fm-no">—</span>
                    </td>
                    <td>
                      <Planned />
                    </td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Licence</th>
                  <td>Apache-2.0</td>
                  <td>
                    Commercial <Planned />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

function Faq(): ReactNode {
  useBrokenLinks().collectAnchor('faq');

  return (
    <section className="fm-faq" id="faq">
      <div className="fm-wrap">
        <div className="fm-section__head">
          <h2>FAQ</h2>
        </div>
        <div className="fm-faq__list">
          {FAQ.map(({question, answer}) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function structuredData(siteUrl: string, repoUrl: string) {
  const organization = `${siteUrl}#organization`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organization,
        name: 'Flagsweep',
        url: siteUrl,
        logo: `${siteUrl}img/logo.svg`,
        sameAs: [repoUrl.replace(/\/[^/]+$/, '')],
      },
      {'@type': 'WebSite', '@id': `${siteUrl}#website`, name: 'Flagsweep', url: siteUrl, publisher: {'@id': organization}},
      {
        '@type': 'SoftwareApplication',
        name: 'Flagsweep',
        url: siteUrl,
        description: DEFINITION,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Docker, Linux, macOS, Windows',
        license: 'https://www.apache.org/licenses/LICENSE-2.0',
        isAccessibleForFree: true,
        offers: {'@type': 'Offer', price: '0', priceCurrency: 'USD'},
        installUrl: `${siteUrl}docs/installation/`,
        softwareHelp: {'@type': 'CreativeWork', url: `${siteUrl}docs/guides/`},
        author: {'@id': organization},
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(({question, answer}) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: {'@type': 'Answer', text: answer},
        })),
      },
      {
        '@type': 'HowTo',
        name: 'Install Flagsweep with Docker',
        totalTime: 'PT5M',
        step: [
          {'@type': 'HowToStep', name: 'Run the container', text: START_COMMAND},
          {'@type': 'HowToStep', name: 'Create the admin account', text: 'Open http://localhost:8080 and create the first account. It is the admin.'},
          {
            '@type': 'HowToStep',
            name: 'Connect your store',
            text: 'Paste a read-write connection string for your store and choose its environments.',
            url: `${siteUrl}docs/guides/getting-started/`,
          },
        ],
      },
    ],
  };
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const {repoUrl} = siteConfig.customFields as {repoUrl: string};
  const siteUrl = `${siteConfig.url}${siteConfig.baseUrl}`;

  return (
    <Layout title={TITLE} description={DESCRIPTION}>
      <Head>
        <html data-landing="" />
        <script type="application/ld+json">{JSON.stringify(structuredData(siteUrl, repoUrl))}</script>
      </Head>
      <main className="fm-landing">
        <Hero repoUrl={repoUrl} />
        <Thesis />
        <GettingStarted />
        <Features />
        <Providers />
        <Editions />
        <Faq />
      </main>
    </Layout>
  );
}
