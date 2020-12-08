import { Command, flags } from '@oclif/command';
import { join } from 'path';
import { Proc, ProcessDescription } from 'pm2';
import { format } from 'util';
import { Config } from '../config';
import { commonFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { prepareData } from '../libs/data-loader';
import {
  ConfigProcess,
  ListManager,
  ProcessManager
} from '../libs/process-manager';
import { portInUse, portIsValid } from '../libs/utils';

export default class Start extends Command {
  public static description = 'Start a mock API';

  public static examples = [
    '$ mockoon start --data ~/export-data.json --index 0',
    '$ mockoon start --data ~/export-data.json --name "Mock environment"',
    '$ mockoon start --data ~/export-data.json --name "Mock environment" --pname "proc1"'
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
    pname: flags.string({
      char: 'N',
      description: 'Override the process name'
    })
  };

  public async run(): Promise<void> {
    const { flags: userFlags } = this.parse(Start);

    let environmentInfo: { name: any; port: any; dataFile: string };

    if (userFlags.index === undefined && !userFlags.name) {
      this.error(Messages.CLI.MISSING_INDEX_OR_NAME_ERROR);
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
      this.error(Messages.CLI.PORT_IS_NOT_VALID);
    }

    if (await portInUse(environmentInfo.port)) {
      this.error(Messages.CLI.PORT_ALREADY_USED);
    }

    await ProcessManager.connect();

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
        script: 'dist/libs/server.js',
        exec_mode: 'fork'
      });

      if (process[0].pm2_env.status === 'errored') {
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
      await ListManager.addProcess(configProcess);
    } catch (error) {
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }
}
