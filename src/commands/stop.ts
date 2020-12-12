import * as inquirer from 'inquirer';
import { Command } from '@oclif/command';
import { ProcessDescription } from 'pm2';
import { commonFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { cleanDataFiles } from '../libs/data';
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
      description: 'Running API pid or name',
      required: false
    }
  ];

  public async run(): Promise<void> {
    const { args } = this.parse(Stop);
    let relistProcesses = false;

    if(args.id === undefined) {
      // Prompt for process
      const processes: ProcessDescription[] = await ProcessManager.list();

      if(processes.length === 0) {
        this.log(Messages.CLI.NO_RUNNING_PROCESS);
        return;
      }

      const response: { process: string} = await inquirer.prompt([{
        name: 'process',
        message: 'select a process',
        type: 'list',
        choices: processes.map(e => ({ name: e.name || e.pid }))
      }]);
      args.id = response.process;
    }

    try {
      // typing is wrong, delete() returns an array
      const stoppedProcesses: ProcessDescription[] = (await ProcessManager.delete(
        args.id
      )) as ProcessDescription[];

      // verify that something has been stopped
      stoppedProcesses.forEach((stoppedProcess) => {
        if (stoppedProcess !== undefined) {
          this.log(
            Messages.CLI.PROCESS_STOPPED,
            stoppedProcess.pm_id,
            stoppedProcess.name
          );

          ProcessListManager.deleteProcess(stoppedProcess.name);
        }
      });
    } catch (error) {
      if (error.message === 'process name not found' && args.id === 'all') {
        // if 'all' was specified and no process was stopped, do not list and immediately exit
        this.log(Messages.CLI.NO_RUNNING_PROCESS);
      } else {
        this.error(error.message, { exit: false });
        relistProcesses = true;
      }
    }

    try {
      const processes: ProcessDescription[] = await ProcessManager.list();

      if (relistProcesses) {
        if (processes.length) {
          this.log(Messages.CLI.RUNNING_PROCESSES);
          logProcesses(processes);
        } else {
          this.log(Messages.CLI.NO_RUNNING_PROCESS);
        }
      }

      // always clean data files after a stop
      await cleanDataFiles(processes);
    } catch (error) {
      this.error(error.message, { exit: false });
    }

    ProcessManager.disconnect();
  }
}
