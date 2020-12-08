import { Command } from '@oclif/command';
import { ProcessDescription } from 'pm2';
import { commonFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { ProcessManager } from '../libs/process-manager';
import { logProcesses } from '../libs/utils';

export default class List extends Command {
  public static description = 'List running mock APIs';

  public static examples = ['$ mockoon list'];
  public static flags = {
    ...commonFlags
  };

  public async run(): Promise<void> {
    await ProcessManager.connect();

    try {
      const processes: ProcessDescription[] = await ProcessManager.list();

      if (processes.length) {
        logProcesses(processes);
      } else {
        this.log(Messages.CLI.NO_RUNNING_PROCESS);
      }
    } catch (error) {
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }
}
