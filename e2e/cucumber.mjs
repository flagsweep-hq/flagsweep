export default {
  require: ['steps/**/*.ts', 'support/**/*.ts'],
  requireModule: ['tsx'],
  format: ['progress-bar', 'html:reports/report.html'],
  tags: 'not @manual',
  order: 'random',
}
