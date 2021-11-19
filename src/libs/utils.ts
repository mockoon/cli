import { Environments } from '@mockoon/commons';
import { cli } from 'cli-ux';
import { prompt } from 'inquirer';
import * as isPortReachable from 'is-port-reachable';
import { dirname } from 'path';
import { ProcessDescription } from 'pm2';
import * as prettyBytes from 'pretty-bytes';
import { processPrefix } from '../constants/common.constants';
import { ConfigProcess, ProcessListManager } from './process-manager';

/**
 * Display a list of running processes information
 *
 * @param processes
 */
export const logProcesses = (processes: ProcessDescription[]): void => {
  const configProcesses: ConfigProcess[] = ProcessListManager.getProcesses();

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
      hostname: {
        minWidth: 15,
        get: (row) =>
          configProcesses.find((data) => data.name === row.name)?.hostname
      },
      port: {
        minWidth: 7,
        get: (row) =>
          configProcesses.find((data) => data.name === row.name)?.port
      },
      endpointPrefix: {
        minWidth: 25,
        header: 'API prefix',
        get: (row) =>
          configProcesses.find((data) => data.name === row.name)?.endpointPrefix
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
  `${processPrefix}${
    environmentName.trim().toLowerCase().replace(/ /g, '-') || 'mock'
  }`;

/**
 * Filter processes by name and keep only the one prefixed with 'mockoon-'
 * @param processes
 */
export const filterProcesses = (
  processes: ProcessDescription[]
): ProcessDescription[] =>
  processes.filter((process) => process.name?.includes(processPrefix));

/**
 * Check if a port is already in use
 * @param port
 */
export const portInUse = async (
  port: number,
  hostname: string
): Promise<boolean> => await isPortReachable(port, { host: hostname });

/**
 * Check if a port is valid
 *
 * @param port
 */
export const portIsValid = (port: number): boolean => port >= 0 && port < 65536;

/**
 * Check if --index or --name flag are provided and
 * prompt user to choose an environment if not.
 * If there is only one environment, launch it by default
 *
 * @param flags
 * @param environments
 */
export const promptEnvironmentChoice = async <
  T extends { index: number | undefined; name: string | undefined }
>(
  flags: T,
  environments: Environments
): Promise<T> => {
  if (flags.index === undefined && !flags.name) {
    if (environments.length === 1) {
      flags.index = 0;
    } else {
      const response: { environmentIndex: number } = await prompt([
        {
          name: 'environmentIndex',
          message: 'Please select an environment',
          type: 'list',
          choices: environments.map((environment, environmentIndex) => ({
            name: environment.name || environmentIndex,
            value: environmentIndex
          }))
        }
      ]);

      flags.index = response.environmentIndex;
    }
  }

  return flags;
};

/**
 * Get the path directory, except if it's a URL.
 *
 * @param path
 * @returns
 */
export const getDirname = (path: string): string | null => {
  if (!path.startsWith('http')) {
    return dirname(path);
  }

  return null;
};
