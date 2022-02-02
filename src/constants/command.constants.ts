import { flags } from '@oclif/command';

export const commonFlags = {
  help: flags.help({ char: 'h' })
};

export const startFlags = {
  data: flags.string({
    char: 'd',
    description: 'Path or URL to your Mockoon data file',
    required: true
  }),

  port: flags.integer({
    char: 'p',
    description: "Override environment's port"
  }),
  'log-transaction': flags.boolean({
    char: 't',
    description: 'Log the full HTTP transaction (request and response)',
    default: false
  }),
  repair: flags.boolean({
    char: 'r',
    description:
      'If the data file seems too old, or an invalid Mockoon file, migrate/repair without prompting',
    default: false
  }),
  name: flags.string({
    char: 'n',
    description:
      '[deprecated] Select by environment name in the legacy export file',
    exclusive: ['index']
  }),
  index: flags.integer({
    char: 'i',
    description:
      "[deprecated] Select by environment's index in the legacy export file",
    exclusive: ['name']
  }),
  all: flags.boolean({
    char: 'a',
    description: '[deprecated] Run all environments in the legacy export file',
    exclusive: ['name', 'index']
  })
};
