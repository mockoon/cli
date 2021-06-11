import { Environment, Environments } from '@mockoon/commons';
import { Command, flags } from '@oclif/command';
import { readFile as readJSONFile } from 'jsonfile';
import { join, resolve } from 'path';
import { Proc, ProcessDescription } from 'pm2';
import { format } from 'util';
import { Config } from '../config';
import { commonFlags, startFlags } from '../constants/command.constants';
import { Messages } from '../constants/messages.constants';
import { parseDataFile, prepareData } from '../libs/data';
import { ProcessListManager, ProcessManager } from '../libs/process-manager';
import { portInUse, portIsValid, promptEnvironmentChoice } from '../libs/utils';

interface EnvironmentInfo {
  name: string;
  protocol: string;
  hostname: string;
  port: number;
  dataFile: string;
}

export default class Start extends Command {
  public static description = 'Start a mock API';

  public static examples = [
    '$ mockoon-cli start --data ~/export-data.json',
    '$ mockoon-cli start --data ~/export-data.json --index 0',
    '$ mockoon-cli start --data https://file-server/export-data.json --index 0',
    '$ mockoon-cli start --data ~/export-data.json --name "Mock environment"',
    '$ mockoon-cli start --data ~/export-data.json --name "Mock environment" --pname "proc1"',
    '$ mockoon-cli start --data ~/export-data.json --all'
  ];

  public static flags = {
    ...commonFlags,
    ...startFlags,
    pname: flags.string({
      char: 'N',
      description: 'Override the process name'
    }),
    hostname: flags.string({
      char: 'l',
      description: 'Listening hostname/address'
    }),
    /**
     * /!\ Undocumented flag.
     * Mostly for internal use when `start `command is called during
     * a Docker image build.
     *
     * When using the `dockerize` command, file loading, validity checks,
     * migrations, etc. are all performed, and the single environment is
     * extracted in a separated file next to the generated Dockerfile.
     * It's easier to directly provide this file to the `start` command run
     * from the Dockerfile when building the Docker image rather than
     * having the image build failing due to a failure in the `start` command.
     */
    container: flags.boolean({
      char: 'c',
      hidden: true
    })
  };

  public async run(): Promise<void> {
    const { flags: userFlags } = this.parse(Start);

    const environmentInfoList = await this.getEnvironmentInfoList(userFlags);

    try {
      for (const environmentInfo of environmentInfoList) {
        await this.validatePort(environmentInfo.port, environmentInfo.hostname);
        await this.validateName(environmentInfo.name);

        await this.runEnvironment(environmentInfo);
      }
    } catch (error) {
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }

  private async runEnvironment(environmentInfo: EnvironmentInfo) {
    const process: Proc = await this.startProcess(environmentInfo);

    if (process[0].pm2_env.status === 'errored') {
      // if process is errored we want to delete it
      await this.handleProcessError(environmentInfo.name);
    }

    this.logStartedProcess(environmentInfo, process);

    await this.addProcessToProcessListManager(environmentInfo, process);
  }

  private async addProcessToProcessListManager(
    environmentInfo: EnvironmentInfo,
    process: Proc
  ): Promise<void> {
    await ProcessListManager.addProcess({
      name: environmentInfo.name,
      port: environmentInfo.port,
      hostname: environmentInfo.hostname,
      pid: process[0].pm2_env.pm_id
    });
  }

  private logStartedProcess(environmentInfo: EnvironmentInfo, process: Proc) {
    const hostname =
      environmentInfo.hostname === '0.0.0.0'
        ? 'localhost'
        : environmentInfo.hostname;

    this.log(
      Messages.CLI.PROCESS_STARTED,
      environmentInfo.protocol,
      hostname,
      environmentInfo.port,
      process[0].pm2_env.pm_id,
      process[0].pm2_env.name
    );
  }

  private async startProcess(environmentInfo: EnvironmentInfo): Promise<Proc> {
    return ProcessManager.start({
      max_restarts: 1,
      wait_ready: true,
      min_uptime: 10000,
      kill_timeout: 2000,
      args: ['--data', environmentInfo.dataFile],
      error: join(Config.logsPath, `${environmentInfo.name}-error.log`),
      output: join(Config.logsPath, `${environmentInfo.name}-out.log`),
      name: environmentInfo.name,
      script: resolve(__dirname, '../libs/server.js'),
      exec_mode: 'fork'
    });
  }

  private async handleProcessError(name: string) {
    // if process is errored we want to delete it
    await ProcessManager.delete(name);

    this.error(format(Messages.CLI.PROCESS_START_LOG_ERROR, name, name));
  }

  private async getEnvironmentInfoList(userFlags): Promise<EnvironmentInfo[]> {
    // We are in a container, env file is ready and relative to the Dockerfile
    if (userFlags.container) {
      return this.getEnvInfoListFromContainerFlag(userFlags);
    }

    return this.getEnvInfoListFromNonContainerFlag(userFlags);
  }

  private async getEnvInfoListFromContainerFlag(
    userFlags
  ): Promise<EnvironmentInfo[]> {
    const environment: Environment = await readJSONFile(
      userFlags.data,
      'utf-8'
    );
    let protocol = 'http';
    if (environment.https) {
      protocol = 'https';
    }

    return [
      {
        protocol,
        dataFile: userFlags.data,
        name: environment.name,
        hostname: environment.hostname,
        port: environment.port
      }
    ];
  }

  private async getEnvInfoListFromNonContainerFlag(
    userFlags
  ): Promise<EnvironmentInfo[]> {
    const environments = await parseDataFile(userFlags.data);
    if (userFlags.all) {
      return this.getEnvInfoFromEnvironments(environments);
    }

    return this.getEnvInfoFromUserChoice(userFlags, environments);
  }

  private async getEnvInfoFromEnvironments(
    environments: Environments
  ): Promise<EnvironmentInfo[]> {
    const environmentInfoList: EnvironmentInfo[] = [];
    for (let envIndex = 0; envIndex < environments.length; envIndex++) {
      try {
        const environmentInfo = await prepareData(environments, {
          index: envIndex,
          name: environments[envIndex].name,
          port: environments[envIndex].port
        });
        environmentInfoList.push(environmentInfo);
      } catch (error) {
        this.error(error.message);
      }
    }

    return environmentInfoList;
  }

  private async getEnvInfoFromUserChoice(
    userFlags,
    environments: Environments
  ): Promise<EnvironmentInfo[]> {
    userFlags = await promptEnvironmentChoice(userFlags, environments);
    let environmentInfo: EnvironmentInfo;
    try {
      environmentInfo = await prepareData(environments, {
        index: userFlags.index,
        name: userFlags.name,
        port: userFlags.port,
        hostname: userFlags.hostname,
        pname: userFlags.pname
      });
    } catch (error) {
      this.error(error.message);
    }

    return [environmentInfo];
  }

  private async validateName(name: string) {
    const runningProcesses: ProcessDescription[] = await ProcessManager.list();
    const processNamesList = runningProcesses.map((process) => process.name);
    if (processNamesList.includes(name)) {
      this.error(format(Messages.CLI.PROCESS_NAME_USED_ERROR, name));
    }
  }

  private async validatePort(port: number, hostname: string) {
    if (!portIsValid(port)) {
      this.error(format(Messages.CLI.PORT_IS_NOT_VALID, port));
    }
    if (await portInUse(port, hostname)) {
      this.error(format(Messages.CLI.PORT_ALREADY_USED, port));
    }
  }
}
