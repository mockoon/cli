import { Command, flags } from '@oclif/command';
import { promises as fs } from 'fs';
import * as mkdirp from 'mkdirp';
import { render as mustacheRender } from 'mustache';
import { parse as pathParse, ParsedPath, resolve as pathResolve } from 'path';
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
    '$ mockoon-cli dockerize --data https://file-server/data.json --output ./Dockerfile'
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
    const resolvedDockerfilePath = pathResolve(userFlags.output);
    const dockerfilePath: ParsedPath = pathParse(resolvedDockerfilePath);

    let environmentInfo: { name: any; port: any; dataFile: string };

    const environments = await parseDataFile(userFlags.data);

    userFlags = await promptEnvironmentChoice(userFlags, environments);

    try {
      environmentInfo = await prepareData({
        environments,
        options: {
          index: userFlags.index,
          name: userFlags.name,
          port: userFlags.port
        },
        dockerfileDir: dockerfilePath.dir,
        repair: userFlags.repair
      });
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
        version: Config.version,
        // passing more args to the dockerfile template, only make sense for log transaction yet as other flags are immediately used during the file creation and data preparation
        args: userFlags['log-transaction'] ? ', "--log-transaction"' : ''
      });

      await mkdirp(dockerfilePath.dir);

      await fs.writeFile(resolvedDockerfilePath, dockerFile);

      this.log(Messages.CLI.DOCKERIZE_SUCCESS, resolvedDockerfilePath);
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
