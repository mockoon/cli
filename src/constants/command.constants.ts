import { flags } from '@oclif/command';

export const commonFlags = {
  help: flags.help({ char: 'h' })
};

export const startFlags = {
  data: flags.string({
    char: 'd',
    description: 'Path or URL to your Mockoon data export file',
    required: true
  }),
  name: flags.string({
    char: 'n',
    description: 'Environment name in the data file',
    exclusive: ['index']
  }),
  index: flags.integer({
    char: 'i',
    description: "Environment's index in the data file",
    exclusive: ['name']
  }),
  hostname: flags.string({
    char: 'l',
    description: 'Listening hostname/address'
  }),
  port: flags.integer({
    char: 'p',
    description: "Override environment's port"
  }),
  all: flags.boolean({
    char: 'a',
    description: 'Run all environments',
    exclusive: ['name', 'index']
  })
};
