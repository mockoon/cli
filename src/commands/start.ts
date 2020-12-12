import { Export } from '@mockoon/commons';
import { Command, flags } from '@oclif/command';
import * as inquirer from 'inquirer';
import { join, resolve } from 'path';
import { Proc, ProcessDescription } from 'pm2';
import { format } from 'util';
import { Config } from '../config';
import { commonFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { listEnvironments, parseDataFile, prepareData } from '../libs/data';
import {
  ConfigProcess,
  ProcessListManager,
  ProcessManager
} from '../libs/process-manager';
import { portInUse, portIsValid } from '../libs/utils';

export default class Start extends Command {
  public static description = 'Start a mock API';

  public static examples = [
    '$ mockoon start --data ~/export-data.json --index 0',
    '$ mockoon start --data https://file-server/export-data.json --index 0',
    '$ mockoon start --data ~/export-data.json --name "Mock environment"',
    '$ mockoon start --data ~/export-data.json --name "Mock environment" --pname "proc1"'
  ];

  public static flags = {
    ...commonFlags,
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
    port: flags.integer({
      char: 'p',
      description: "Override environment's port"
    }),
    pname: flags.string({
      char: 'N',
      description: 'Override the process name'
    })
  };

  public async run(): Promise<void> {
    const { flags: userFlags } = this.parse(Start);

    let environmentInfo: { name: any; port: any; dataFile: string };

    if (userFlags.index === undefined && !userFlags.name) {
      // Prompt for environment
      const environments = await parseDataFile<Export>(userFlags.data).then(data => listEnvironments(data));

      if(environments.length === 0) {
        this.error(Messages.CLI.ENVIRONMENT_NOT_AVAILABLE_ERROR);
      }

      const response: { environment: string} = await inquirer.prompt([{
        name: 'environment',
        message: 'select an environment',
        type: 'list',
        choices: environments.map(e => ({ name: e.name }))
      }]);
      userFlags.name = response.environment;
    }

    try {
      environmentInfo = await prepareData(userFlags.data, {
        index: userFlags.index,
        name: userFlags.name,
        port: userFlags.port,
        pname: userFlags.pname
      });
    } catch (error) {
      this.error(error.message);
    }

    if (!portIsValid(environmentInfo.port)) {
      this.error(format(Messages.CLI.PORT_IS_NOT_VALID, environmentInfo.port));
    }

    if (await portInUse(environmentInfo.port)) {
      this.error(format(Messages.CLI.PORT_ALREADY_USED, environmentInfo.port));
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
