import { Command } from '@oclif/command';
import { ProcessDescription } from 'pm2';
import { format } from 'util';
import { commonFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { ProcessManager } from '../libs/process-manager';
import { logProcesses } from '../libs/utils';

export default class Info extends Command {
  public static description = 'Display information for a running mock API';

  public static examples = [
    '$ mockoon info 0',
    '$ mockoon info "Mock_environment"'
  ];

  public static args = [
    {
      name: 'id',
      description: 'Running API pid or name (default: 0)',
      default: 0,
      required: false
    }
  ];

  public static flags = {
    ...commonFlags
  };

  public async run(): Promise<void> {
    const { args } = this.parse(Info);

    await ProcessManager.connect();

    try {
      const processes: ProcessDescription[] = await ProcessManager.info(
        args.id
      );

      if (processes.length) {
        logProcesses(processes);
      } else {
        this.log(format(Messages.CLI.NO_RUNNING_PROCESS_FOUND, args.id));
      }
    } catch (error) {
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }
}
