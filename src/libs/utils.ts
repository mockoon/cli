import { cli } from 'cli-ux';
import * as isPortReachable from 'is-port-reachable';
import { ProcessDescription } from 'pm2';
import * as prettyBytes from 'pretty-bytes';
import { ConfigProcess, ListManager } from './process-manager';

export const logProcesses = (processes: ProcessDescription[]): void => {
  const configProcesses: ConfigProcess[] = ListManager.getProcesses();

  cli.table(
    processes,
    {
      name: {
        minWidth: 10
      },
      id: {
        minWidth: 5,
        get: (row) => row.pm_id
      },
      status: {
        minWidth: 10,
        get: (row) => row.pm2_env?.status
      },
      cpu: {
        minWidth: 7,
        get: (row) => row.monit?.cpu
      },
      memory: {
        minWidth: 10,
        get: (row) => (row.monit?.memory ? prettyBytes(row.monit.memory) : 0)
      },
      port: {
        minWidth: 7,
        get: (row) =>
          configProcesses.find((data) => data.name === row.name)?.port
      }
    },
    {
      printLine: console.log
    }
  );
};

/**
 * Transform an environment name to be used as a process name
 *
 * @param environmentName
 */
export const transformEnvironmentName = (environmentName: string): string =>
  environmentName.trim().toLowerCase().replace(/ /g, '-') || 'mock';

export const portInUse = async (port: number): Promise<boolean> =>
  await isPortReachable(port);

export const portIsValid = (port: number): boolean => port >= 0 && port < 65536;
