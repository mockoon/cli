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
import { createServer } from '../libs/server';
import {
  getDirname,
  portInUse,
  portIsValid,
  promptEnvironmentChoice
} from '../libs/utils';

interface EnvironmentInfo {
  name: string;
  protocol: string;
  hostname: string;
  port: number;
  endpointPrefix: string;
  dataFile: string;
  initialDataDir?: string | null;
  logTransaction?: boolean;
}

export default class Start extends Command {
  public static description = 'Start a mock API';

  public static examples = [
    '$ mockoon-cli start --data ~/data.json',
    '$ mockoon-cli start --data https://file-server/data.json',
    '$ mockoon-cli start --data ~/data.json --pname "proc1"',
    '$ mockoon-cli start --data ~/data.json --daemon-off',
    '$ mockoon-cli start --data ~/data.json --log-transaction'
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
    'daemon-off': flags.boolean({
      char: 'D',
      description:
        'Keep the CLI in the foreground and do not manage the process with PM2',
      default: false,
      exclusive: ['all']
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

        await this.runEnvironment(environmentInfo, userFlags['daemon-off']);
      }
    } catch (error: any) {
      this.error(error.message);
    } finally {
      ProcessManager.disconnect();
    }
  }

  private async runEnvironment(
    environmentInfo: EnvironmentInfo,
    daemonOff = false
  ) {
    if (daemonOff) {
      this.startForegroundProcess(environmentInfo);
    } else {
      await this.startManagedProcess(environmentInfo);
    }
  }

  private async addProcessToProcessListManager(
    environmentInfo: EnvironmentInfo,
    process: Proc
  ): Promise<void> {
    await ProcessListManager.addProcess({
      name: environmentInfo.name,
      port: environmentInfo.port,
      hostname: environmentInfo.hostname,
      endpointPrefix: environmentInfo.endpointPrefix,
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

  /**
   * Start the mock server and run it in the same process in the foreground.
   * We don't use PM2 here to manage the process
   *
   * @param environmentInfo
   * @returns
   */
  private startForegroundProcess(environmentInfo: EnvironmentInfo): void {
    const parameters: Parameters<typeof createServer>[0] = {
      data: environmentInfo.dataFile,
      environmentDir: environmentInfo.initialDataDir
        ? environmentInfo.initialDataDir
        : '',
      logTransaction: environmentInfo.logTransaction,
      fileTransportsOptions: [
        { filename: join(Config.logsPath, `${environmentInfo.name}-out.log`) }
      ]
    };

    createServer(parameters);
  }

  /**
   * Start the mock server and manage the process with PM2
   *
   * @param environmentInfo
   * @returns
   */
  private async startManagedProcess(environmentInfo: EnvironmentInfo) {
    const args = ['--data', environmentInfo.dataFile];

    if (environmentInfo.initialDataDir) {
      args.push('--environmentDir', environmentInfo.initialDataDir);
    }
    if (environmentInfo.logTransaction) {
      args.push('--logTransaction');
    }

    const process = await ProcessManager.start({
      max_restarts: 1,
      wait_ready: true,
      min_uptime: 10000,
      kill_timeout: 2000,
      args,
      error: join(Config.logsPath, `${environmentInfo.name}-error.log`),
      output: join(Config.logsPath, `${environmentInfo.name}-out.log`),
      name: environmentInfo.name,
      script: resolve(__dirname, '../libs/server-start-script.js'),
      exec_mode: 'fork'
    });

    if (process[0].pm2_env.status === 'errored') {
      // if process is errored we want to delete it
      await this.handleProcessError(environmentInfo.name);
    }

    this.logStartedProcess(environmentInfo, process);

    await this.addProcessToProcessListManager(environmentInfo, process);
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

    if (environment.tlsOptions.enabled) {
      protocol = 'https';
    }

    return [
      {
        protocol,
        dataFile: userFlags.data,
        name: environment.name,
        hostname: environment.hostname,
        port: environment.port,
        endpointPrefix: environment.endpointPrefix,
        initialDataDir: null,
        logTransaction: userFlags['log-transaction']
      }
    ];
  }

  private async getEnvInfoListFromNonContainerFlag(
    userFlags
  ): Promise<EnvironmentInfo[]> {
    const environments = await parseDataFile(userFlags.data);

    if (userFlags.all) {
      return this.getEnvInfoFromEnvironments(userFlags, environments);
    }

    return this.getEnvInfoFromUserChoice(userFlags, environments);
  }

  private async getEnvInfoFromEnvironments(
    userFlags,
    environments: Environments
  ): Promise<EnvironmentInfo[]> {
    const environmentInfoList: EnvironmentInfo[] = [];

    for (let envIndex = 0; envIndex < environments.length; envIndex++) {
      try {
        const environmentInfo = await prepareData({
          environments,
          options: {
            index: envIndex,
            name: environments[envIndex].name,
            port: environments[envIndex].port,
            endpointPrefix: environments[envIndex].endpointPrefix
          },
          repair: userFlags.repair
        });

        environmentInfoList.push({
          ...environmentInfo,
          initialDataDir: getDirname(userFlags.data),
          logTransaction: userFlags['log-transaction']
        });
      } catch (error: any) {
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
      environmentInfo = await prepareData({
        environments,
        options: {
          index: userFlags.index,
          name: userFlags.name,
          port: userFlags.port,
          hostname: userFlags.hostname,
          endpointPrefix: userFlags.endpointPrefix,
          pname: userFlags.pname
        },
        repair: userFlags.repair
      });
    } catch (error: any) {
      this.error(error.message);
    }

    return [
      {
        ...environmentInfo,
        initialDataDir: getDirname(userFlags.data),
        logTransaction: userFlags['log-transaction']
      }
    ];
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
