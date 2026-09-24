import type * as Preset from '@docusaurus/preset-classic';
import type {Config} from '@docusaurus/types';
import {themes as prismThemes} from 'prism-react-renderer';
import imageClasses from './src/remark/imageClasses';

const siteUrl = 'https://flagsweep-hq.github.io';
const baseUrl = '/flagsweep/';
const repoUrl = 'https://github.com/flagsweep-hq/flagsweep';

const formspreeFormId = process.env.FORMSPREE_FORM_ID ?? '';
const contactFormAction = formspreeFormId && `https://formspree.io/f/${formspreeFormId}`;
const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID ?? '';

const config: Config = {
  title: 'Flagsweep',
  tagline: 'FeatureOps on top of the feature flags in your cloud.',
  favicon: 'img/logo.svg',

  url: siteUrl,
  baseUrl,
  trailingSlash: true,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  future: {v4: true},

  i18n: {defaultLocale: 'en', locales: ['en']},

  // CommonMark for .md, so `<store>` and `{id}` in guides and in CHANGELOG.md are text, not JSX.
  markdown: {
    format: 'detect',
    hooks: {onBrokenMarkdownLinks: 'throw', onBrokenMarkdownImages: 'throw'},
  },

  customFields: {repoUrl, contactFormAction},

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          exclude: ['assets/**'],
          editUrl: ({docPath}) => `${repoUrl}/edit/master/docs/${docPath}`,
          beforeDefaultRemarkPlugins: [imageClasses],
        },
        blog: {
          showReadingTime: true,
          feedOptions: {type: ['rss', 'atom'], xslt: true},
          onInlineTags: 'throw',
          onInlineAuthors: 'throw',
          onUntruncatedBlogPosts: 'throw',
        },
        theme: {customCss: ['./src/css/custom.css', './src/css/landing.css']},
        ...(googleAnalyticsId ? {gtag: {trackingID: googleAnalyticsId, anonymizeIP: true}} : {}),
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        // The MkDocs site served the docs from the root: /guides/..., /installation/...
        createRedirects: (path: string) =>
          /^\/docs\/(guides|installation)\//.test(path) ? [path.replace(/^\/docs/, '')] : undefined,
      },
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {hashed: 'filename', docsDir: '../docs', docsRouteBasePath: 'docs', highlightSearchTermsOnTargetPage: true},
    ],
  ],

  themeConfig: {
    colorMode: {defaultMode: 'light', disableSwitch: true, respectPrefersColorScheme: false},
    navbar: {
      title: 'Flagsweep',
      logo: {alt: '', src: 'img/logo.svg'},
      style: 'dark',
      items: [
        {type: 'docSidebar', sidebarId: 'installation', label: 'Installation', position: 'left'},
        {type: 'docSidebar', sidebarId: 'guides', label: 'Guides', position: 'left'},
        {to: '/changelog/', label: 'Changelog', position: 'left'},
        {to: '/contact/', label: 'Contact', position: 'left'},
        {href: repoUrl, position: 'right', className: 'navbar__github', 'aria-label': 'GitHub repository'},
      ],
    },
    footer: {
      links: [
        {
          title: 'Product',
          items: [
            {label: 'Features', to: '/#features'},
            {label: 'Editions', to: '/#editions'},
            {label: 'Providers', to: '/#providers'},
            {label: 'Contact us', to: '/contact/'},
          ],
        },
        {
          title: 'Docs',
          items: [
            {label: 'Installation', to: '/docs/installation/'},
            {label: 'Getting started', to: '/docs/guides/getting-started/'},
            {label: 'All guides', to: '/docs/guides/'},
            {label: 'FAQ', to: '/#faq'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: repoUrl},
            {label: 'Issues', href: `${repoUrl}/issues`},
            {label: 'Licence', href: `${repoUrl}/blob/master/LICENSE`},
            {label: 'FeatureOps manifesto', href: 'https://featureops.io/'},
          ],
        },
      ],
      copyright: '© Flagsweep · Apache-2.0',
    },
    prism: {theme: prismThemes.github, additionalLanguages: ['bash', 'yaml']},
  } satisfies Preset.ThemeConfig,
};

export default config;
