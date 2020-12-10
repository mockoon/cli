import { Command } from '@oclif/command';
import { unlink } from 'fs';
import { join } from 'path';
import { ProcessDescription } from 'pm2';
import { Config } from '../config';
import { commonFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { ListManager, ProcessManager } from '../libs/process-manager';
import { ProcessListManager, ProcessManager } from '../libs/process-manager';
import { logProcesses } from '../libs/utils';

export default class Stop extends Command {
  public static description = 'Stop a mock API';
  public static examples = [
    '$ mockoon stop 0',
    '$ mockoon stop "name"',
    '$ mockoon stop "all"'
  ];

  public static flags = {
    ...commonFlags
  };

  public static args = [
    {
      name: 'id',
      description: "Running API pid or name (default: 'all')",
      default: 'all',
      required: false
    }
  ];

  public async run(): Promise<void> {
    const { args } = this.parse(Stop);

    await ProcessManager.connect();

    try {
      // typing is wrong, delete() returns an array
      const stoppedProcesses: ProcessDescription[] = (await ProcessManager.delete(
        args.id
      )) as ProcessDescription[];

      // verify that something has been stopped
      stoppedProcesses.forEach((stoppedProcess) => {
        if (stoppedProcess !== undefined) {
          unlink(
            join(Config.dataPath, `${stoppedProcess.name}.json`),
            () => {}
          );

          this.log(
            Messages.CLI.PROCESS_STOPPED,
            stoppedProcess.pm_id,
            stoppedProcess.name
          );

          ProcessListManager.deleteProcess(stoppedProcess.name);
        }
      });

      ProcessManager.disconnect();

      return;
    } catch (error) {
      if (error.message === 'process name not found' && args.id === 'all') {
        // if 'all' was specified and no process was stopped, do not list and immediately exit
        this.log(Messages.CLI.NO_RUNNING_PROCESS);

        ProcessManager.disconnect();

        return;
      } else {
        // do not exit as we want to list processes again
        this.error(error.message, { exit: false });
      }
    }

    try {
      const processes: ProcessDescription[] = await ProcessManager.list();
      this.log(Messages.CLI.RUNNING_PROCESSES);
      logProcesses(processes);
    } catch (error) {
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }
}
