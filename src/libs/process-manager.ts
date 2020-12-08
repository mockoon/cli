import {
  readFileSync as jsonReadFileSync,
  writeFile,
  writeFileSync as jsonWriteFileSync
} from 'jsonfile';
import { sync as mkdirpSync } from 'mkdirp';
import { join } from 'path';
import * as pm2 from 'pm2';
import { ProcessDescription } from 'pm2';
import { promisify } from 'util';
import { Config } from '../config';

export type ConfigProcess = {
  name?: string;
  pid: number;
  port: number;
};

const processFile: string = join(Config.configPath, 'processes.json');

export const ListManager = {
  addProcess: async (configProcess: ConfigProcess): Promise<void> => {
    mkdirpSync(Config.configPath);

    const configData: ConfigProcess[] = ListManager.getProcesses();

    if (
      !configData.find(
        (conf) =>
          conf.name === configProcess.name && conf.port === configProcess.port
      )
    ) {
      configData.push(configProcess);

      return await writeFile(processFile, configData, { spaces: 2 });
    }
  },
  getProcesses: (): ConfigProcess[] => {
    let configProcesses: ConfigProcess[] = [];

    try {
      configProcesses = jsonReadFileSync(processFile);
    } catch (error) {
      jsonWriteFileSync(processFile, configProcesses);
    }

    return configProcesses;
  },
  updateProcesses: async (
    processes: pm2.ProcessDescription[]
  ): Promise<void> => {
    const configProcesses: ConfigProcess[] =
      processes.length > 0 ? ListManager.getProcesses() : [];
    processes.forEach((process) => {
      configProcesses.filter((conf) => conf.name === process.name);
    });

    return await writeFile(processFile, configProcesses, { spaces: 2 });
  },
  deleteProcess: (name?: string): void => {
    let configProcesses: ConfigProcess[] = ListManager.getProcesses();

    configProcesses = configProcesses.filter((data) => data.name !== name);
    console.log(configProcesses);

    jsonWriteFileSync(processFile, configProcesses, { spaces: 2 });
  }
};

export const ProcessManager = {
  connect: promisify(pm2.connect.bind(pm2)),
  info: promisify(pm2.describe.bind(pm2)),
  list: async (): Promise<ProcessDescription[]> => {
    const processes = await promisify(pm2.list.bind(pm2))();
    await ListManager.updateProcesses(processes);

    return processes;
  },
  start: <(options: pm2.StartOptions) => Promise<pm2.Proc>>(
    promisify(pm2.start.bind(pm2))
  ),
  stop: promisify(pm2.stop.bind(pm2)),
  delete: promisify(pm2.delete.bind(pm2)),
  disconnect: pm2.disconnect.bind(pm2)
};
