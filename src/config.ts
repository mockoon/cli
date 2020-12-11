import { homedir } from 'os';
import { join } from 'path';

const dirName = '.mockoon-cli';

export const Config = {
  dataPath: join(homedir(), `/${dirName}/data/`),
  logsPath: join(homedir(), `/${dirName}/logs/`),
  configPath: join(homedir(), `/${dirName}/`),
  get processesFilePath(): string {
    return join(this.configPath, 'processes.json');
  }
};
