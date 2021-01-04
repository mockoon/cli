import { Command, flags } from '@oclif/command';
import { format } from 'util';
import * as mustache from 'mustache';
import { promises as fs } from 'fs';
import { commonFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { prepareData } from '../libs/data';
import { portIsValid } from '../libs/utils';
import { DOCKER_TEMPLATE } from '../libs/docker';

export default class Dockerize extends Command {
  public static description = 'Create a Dockerfile for a mock API';

  public static examples = [
    '$ mockoon dockerize --data ~/export-data.json --index 0',
    '$ mockoon dockerize --data ~/export-data.json --name "Mock environment"',
  ];

  public static flags = {
    ...commonFlags,
    data: flags.string({
      char: 'd',
      description: 'Path to your Mockoon data export file',
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
    port: flags.integer({
      char: 'p',
      description: "Override environment's port"
    }),
    output: flags.string({
      char: 'o',
      description: 'Output file path',
      required: true
    }),
  };

  public async run(): Promise<void> {
    const { flags: userFlags } = this.parse(Dockerize);

    let environmentInfo: { name: any; port: any; dataFile: string };

    if (userFlags.index === undefined && !userFlags.name) {
      this.error(Messages.CLI.MISSING_INDEX_OR_NAME_ERROR);
    }

    try {
      environmentInfo = await prepareData(userFlags.data, {
        index: userFlags.index,
        name: userFlags.name,
        port: userFlags.port
      });
    } catch (error) {
      this.error(error.message);
    }

    if (!portIsValid(environmentInfo.port)) {
      this.error(format(Messages.CLI.PORT_IS_NOT_VALID, environmentInfo.port));
    }

    try {
      const attributes: string[] = [];
      attributes.push(!userFlags.name ? `-i ${userFlags.index}` : `-n ${userFlags.name}`);
      if (userFlags.port !== undefined) {
        attributes.push(`-p ${userFlags.port}`);
      }

      const dockerFile = mustache.render(DOCKER_TEMPLATE, { port: environmentInfo.port, filePath: userFlags.data, attributes: attributes.join(' ') });

      await fs.writeFile(userFlags.output, dockerFile);
    } catch (error) {
      this.error(error.message);
    }
  }
}
