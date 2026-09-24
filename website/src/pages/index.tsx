import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import {useState, type CSSProperties, type ReactNode} from 'react';
import flagList from '../../../docs/assets/img/guides/flag-list.png';
import {AwsIcon, AzureIcon, CopyIcon, GitHubIcon} from '../components/icons';

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
    question: 'Does Flagsweep replace my feature flag SDK?',
    answer:
      "No. Your applications keep reading from the provider's store with the libraries they already use, at the same latency. Flagsweep only changes how people manage the flags.",
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
    question: 'What is the licence?',
    answer:
      'The open-source edition is licensed under the Apache License 2.0. You can run it, modify it, and use it inside closed-source and commercial products, as long as you keep the licence and notice files. The licence does not cover the Flagsweep name or logo. The planned Enterprise edition adds closed-source features and will be sold under a commercial licence.',
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
          src={flagList}
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
            Other ways to install, or try it with demo data →
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
        <h2>Temporary flags have a way of becoming permanent.</h2>
        <p className="fm-thesis__lede">
          Months after a flag ships, nobody remembers who added it, whether production still matches staging, or
          whether it is safe to delete. Removing it feels riskier than leaving it, so it stays.
        </p>
        <ul className="fm-thesis__list">
          <li>Each flag has an owner, the person who decides when it comes out.</li>
          <li>A retire-by date puts the removal on a schedule.</li>
          <li>The audit trail records who changed a flag, when, and what it was before.</li>
        </ul>
        <p className="fm-thesis__close">
          Your applications keep reading flags from your cloud provider, with the libraries they already use.
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
              Your flags and your audit history never leave your control. Your apps keep reading App Configuration
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
          <summary>Compare every feature, side by side</summary>
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

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const {repoUrl} = siteConfig.customFields as {repoUrl: string};

  return (
    <Layout
      title="FeatureOps for Azure App Configuration"
      description="Self-hosted FeatureOps for Azure App Configuration, with an attributed audit trail, drift detection, locks, protected environments, owners, and retire-by dates."
    >
      <div className="fm-landing">
        <Hero repoUrl={repoUrl} />
        <GettingStarted />
        <Thesis />
        <Features />
        <Providers />
        <Editions />
        <Faq />
      </div>
    </Layout>
  );
}
