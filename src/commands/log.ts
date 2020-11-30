import { Command } from '@oclif/command';
import { disconnect, list } from 'pm2';
import * as tail from 'tail';

export default class Log extends Command {
  public static description = 'show log app';

  public static args = [{ name: 'app', required: true }];

  public async run(): Promise<void> {
    const { args } = this.parse(Log);
    // console.log(args.app);
    // flush(args.app, (error, result) => {
    //   // const qwe = test.find((ee) => ee.pid === args.app);
    //   // console.log(result);
    // });
    // reloadLogs((test) => console.log(test));
    list((err, processes) => {
      if (err) {
        this.log(err.message);
      }

      processes.forEach((process) => {
        if (args.app) {
          if (
            process.name === args.app ||
            process.pm_id === (args.app as number)
          ) {
            this.log(process.pm2_env?.pm_err_log_path);
            const file = new tail.Tail(
              process.pm2_env?.pm_err_log_path as string
            );
            file.watch();
            // flush(process.pm2_env., aaa => {

            // })
            // this.log(logProcess(process));
          } else {
            this.log(`NO PROCESS WITH id|name = ${args.app}`);
          }
        } else {
          this.error('NO PROCESS');
          // this.log(logProcess(process));
        }
      });
      disconnect();
    });
  }
}
