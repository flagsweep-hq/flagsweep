import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import {useState, type FormEvent, type ReactNode} from 'react';

type Status = 'idle' | 'sending' | 'sent' | 'failed';

export default function Contact(): ReactNode {
  const {repoUrl, contactFormAction} = useDocusaurusContext().siteConfig.customFields as {
    repoUrl: string;
    contactFormAction: string;
  };
  const [status, setStatus] = useState<Status>('idle');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('sending');
    try {
      const response = await fetch(contactFormAction, {
        method: 'POST',
        body: new FormData(form),
        headers: {Accept: 'application/json'},
      });
      if (!response.ok) throw new Error(response.statusText);
      form.reset();
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <Layout title="Contact" description="Questions about Flagsweep, or interested in the planned Enterprise edition?">
      <main className="fm-landing">
        <section className="fm-signup fm-contact" id="contact">
          <div className="fm-signup__inner">
            <h1>Contact us</h1>
            <p>
              Questions about Flagsweep, or interested in the planned Enterprise edition? Tell us what you need and we
              will reply by email.
            </p>
            {status === 'sent' ? (
              <p className="fm-signup__sub" role="status">
                Thanks, your message is on its way. We will reply by email.
              </p>
            ) : (
              <form
                className="fm-form fm-form--stacked"
                action={contactFormAction || undefined}
                method="post"
                onSubmit={contactFormAction ? submit : undefined}
              >
                <label className="fm-sr" htmlFor="fm-email">
                  Email
                </label>
                <input
                  id="fm-email"
                  className="fm-form__input"
                  type="email"
                  name="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
                <label className="fm-sr" htmlFor="fm-message">
                  Message
                </label>
                <textarea
                  id="fm-message"
                  className="fm-form__input fm-form__area"
                  name="message"
                  rows={4}
                  placeholder="What can we help with?"
                  required
                />
                {/* Formspree drops any submission that fills this in; bots do, people never see it. */}
                <input type="text" name="_gotcha" className="fm-sr" tabIndex={-1} autoComplete="off" aria-hidden />
                <input type="hidden" name="_subject" value="Flagsweep contact form" />
                <button
                  className="fm-btn fm-btn--primary"
                  type="submit"
                  disabled={!contactFormAction || status === 'sending'}
                >
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
            {!contactFormAction && <p className="fm-signup__fine">This form is not connected yet.</p>}
            {status === 'failed' && (
              <p className="fm-signup__fine" role="alert">
                Sending failed. Please try again, or <Link href={`${repoUrl}/issues`}>open an issue on GitHub</Link>.
              </p>
            )}
            <p className="fm-signup__fine">
              Found a bug? <Link href={`${repoUrl}/issues`}>Open an issue on GitHub</Link>.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
