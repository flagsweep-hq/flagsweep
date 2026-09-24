import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  installation: [
    {
      type: 'category',
      label: 'Installation',
      link: {type: 'doc', id: 'installation/index'},
      collapsible: false,
      items: [
        'installation/registry',
        'installation/docker',
        'installation/dotnet',
        'installation/configuration',
        'installation/connection-string-encryption',
      ],
    },
  ],
  guides: [
    {
      type: 'category',
      label: 'Guides',
      link: {type: 'doc', id: 'guides/index'},
      collapsible: false,
      items: [
        'guides/getting-started',
        'guides/connect-azure-app-configuration',
        'guides/connections-and-environments',
        'guides/flags-across-environments',
        'guides/managing-flags',
        'guides/locks-and-protection',
        'guides/drift-detection',
        'guides/audit-trail',
        'guides/team-and-access',
      ],
    },
  ],
};

export default sidebars;
