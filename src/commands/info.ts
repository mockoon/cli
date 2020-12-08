import { Command } from '@oclif/command';
import { ProcessDescription } from 'pm2';
import { commonFlags } from '../constants/command.constants';
import { ProcessManager } from '../libs/process-manager';
import { logProcesses } from '../libs/utils';

export default class Info extends Command {
  public static description = 'Return info for a specific mock API';

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
      logProcesses(processes);
    } catch (error) {
      // TODO returns no error if pid does not exists
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }
}
