import { Environment } from '@mockoon/commons';
import { Command, flags } from '@oclif/command';
import { readFile as readJSONFile } from 'jsonfile';
import * as mkdirp from 'mkdirp';
import { join, resolve } from 'path';
import { Proc, ProcessDescription } from 'pm2';
import { format } from 'util';
import { Config } from '../config';
import { commonFlags, startFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { parseDataFile, prepareData } from '../libs/data';
import {
  ConfigProcess,
  ProcessListManager,
  ProcessManager
} from '../libs/process-manager';
import { portInUse, portIsValid, promptEnvironmentChoice } from '../libs/utils';

export default class Start extends Command {
  public static description = 'Start a mock API';

  public static examples = [
    '$ mockoon-cli start --data ~/export-data.json',
    '$ mockoon-cli start --data ~/export-data.json --index 0',
    '$ mockoon-cli start --data https://file-server/export-data.json --index 0',
    '$ mockoon-cli start --data ~/export-data.json --name "Mock environment"',
    '$ mockoon-cli start --data ~/export-data.json --name "Mock environment" --pname "proc1"'
  ];

  public static flags = {
    ...commonFlags,
    ...startFlags,
    pname: flags.string({
      char: 'N',
      description: 'Override the process name'
    }),
    /**
     * /!\ Undocumented flag.
     * Mostly for internal use when `start `command is called during
     * a Docker image build.
     *
     * When using the `dockerize` command, file loading, validity checks,
     * migrations, etc. are all performed, and the single environment is
     * extracted in a separated file next to the generated Dockerfile.
     * It's easier to directly provide this file to the `start` command run
     * from the Dockerfile when building the Docker image rather than
     * having the image build failing due to a failure in the `start` command.
     */
    container: flags.boolean({
      char: 'c',
      hidden: true
    })
  };

  public async run(): Promise<void> {
    let { flags: userFlags } = this.parse(Start);

    let environmentInfo: { name: any; port: any; dataFile: string };

    // We are in a container, env file is ready and relative to the Dockerfile
    if (userFlags.container) {
      const environment: Environment = await readJSONFile(
        userFlags.data,
        'utf-8'
      );

      environmentInfo = {
        dataFile: userFlags.data,
        name: environment.name,
        port: environment.port
      };

      await mkdirp(Config.dataPath);
    } else {
      const environments = await parseDataFile(userFlags.data);

      userFlags = await promptEnvironmentChoice(userFlags, environments);

      try {
        environmentInfo = await prepareData(environments, {
          index: userFlags.index,
          name: userFlags.name,
          port: userFlags.port,
          pname: userFlags.pname
        });
      } catch (error) {
        this.error(error.message);
      }

      if (!portIsValid(environmentInfo.port)) {
        this.error(
          format(Messages.CLI.PORT_IS_NOT_VALID, environmentInfo.port)
        );
      }

      if (await portInUse(environmentInfo.port)) {
        this.error(
          format(Messages.CLI.PORT_ALREADY_USED, environmentInfo.port)
        );
      }
    }

    try {
      const runningProcesses: ProcessDescription[] = await ProcessManager.list();

      if (
        runningProcesses
          .map((process) => process.name)
          .includes(environmentInfo.name)
      ) {
        this.error(
          format(Messages.CLI.PROCESS_NAME_USED_ERROR, environmentInfo.name)
        );
      }

      const process: Proc = await ProcessManager.start({
        max_restarts: 1,
        wait_ready: true,
        min_uptime: 10000,
        kill_timeout: 2000,
        args: ['--data', environmentInfo.dataFile],
        error: join(Config.logsPath, `${environmentInfo.name}-error.log`),
        output: join(Config.logsPath, `${environmentInfo.name}-out.log`),
        name: environmentInfo.name,
        script: resolve(__dirname, '../libs/server.js'),
        exec_mode: 'fork'
      });

      if (process[0].pm2_env.status === 'errored') {
        // if process is errored we want to delete it
        await ProcessManager.delete(environmentInfo.name);

        this.error(
          format(
            Messages.CLI.PROCESS_START_LOG_ERROR,
            environmentInfo.name,
            environmentInfo.name
          )
        );
      }

      this.log(
        Messages.CLI.PROCESS_STARTED,
        environmentInfo.port,
        process[0].pm2_env.pm_id,
        process[0].pm2_env.name
      );

      const configProcess: ConfigProcess = {
        name: environmentInfo.name,
        port: environmentInfo.port,
        pid: process[0].pm2_env.pm_id
      };

      await ProcessListManager.addProcess(configProcess);
    } catch (error) {
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }
}
