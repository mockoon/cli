import { Command, flags } from '@oclif/command';
import { promises as fs } from 'fs';
import * as mkdirp from 'mkdirp';
import { render as mustacheRender } from 'mustache';
import { parse as pathParse, ParsedPath } from 'path';
import { format } from 'util';
import { Config } from '../config';
import { commonFlags, startFlags } from '../constants/command.constants';
import { DOCKER_TEMPLATE } from '../constants/docker.constants';
import { Messages } from '../constants/messages.constants';
import { parseDataFile, prepareData } from '../libs/data';
import { portIsValid, promptEnvironmentChoice } from '../libs/utils';

export default class Dockerize extends Command {
  public static description =
    'Create a Dockerfile to build a self-contained image of a mock API';

  public static examples = [
    '$ mockoon-cli dockerize --data ~/data.json --output ./Dockerfile',
    '$ mockoon-cli dockerize --data ~/data.json --index 0 --output ./Dockerfile',
    '$ mockoon-cli dockerize --data https://file-server/data.json --index 0 --output ./Dockerfile',
    '$ mockoon-cli dockerize --data ~/data.json --name "Mock environment" --output ./Dockerfile'
  ];

  public static flags = {
    ...commonFlags,
    ...startFlags,
    output: flags.string({
      char: 'o',
      description: 'Generated Dockerfile path and name (e.g. `./Dockerfile`)',
      required: true
    })
  };

  public async run(): Promise<void> {
    let { flags: userFlags } = this.parse(Dockerize);
    const dockerfilePath: ParsedPath = pathParse(userFlags.output);

    let environmentInfo: { name: any; port: any; dataFile: string };

    const environments = await parseDataFile(userFlags.data);

    userFlags = await promptEnvironmentChoice(userFlags, environments);

    try {
      environmentInfo = await prepareData(
        environments,
        {
          index: userFlags.index,
          name: userFlags.name,
          port: userFlags.port
        },
        dockerfilePath.dir
      );
    } catch (error: any) {
      this.error(error.message);
    }
    if (!portIsValid(environmentInfo.port)) {
      this.error(format(Messages.CLI.PORT_IS_NOT_VALID, environmentInfo.port));
    }

    try {
      const dockerFile = mustacheRender(DOCKER_TEMPLATE, {
        port: environmentInfo.port,
        filePath: pathParse(environmentInfo.dataFile).base,
        version: Config.version
      });

      await mkdirp(dockerfilePath.dir);

      await fs.writeFile(userFlags.output, dockerFile);

      this.log(Messages.CLI.DOCKERIZE_SUCCESS, userFlags.output);
      this.log(
        Messages.CLI.DOCKERIZE_BUILD_COMMAND,
        dockerfilePath.dir,
        environmentInfo.name,
        environmentInfo.port,
        environmentInfo.port,
        environmentInfo.name
      );
    } catch (error: any) {
      this.error(error.message);
    }
  }
}
