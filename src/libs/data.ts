import {
  Environment,
  Environments,
  EnvironmentSchema,
  Export,
  HighestMigrationId,
  Migrations
} from '@mockoon/commons';
import axios from 'axios';
import { promises as fs } from 'fs';
import { prompt } from 'inquirer';
import { readFile as readJSONFile } from 'jsonfile';
import * as mkdirp from 'mkdirp';
import { join } from 'path';
import { ProcessDescription } from 'pm2';
import { format } from 'util';
import { Config } from '../config';
import { Messages } from '../constants/messages.constants';
import { transformEnvironmentName } from './utils';

/**
 * Load and parse a JSON data file.
 * Supports both export files (with one or multiple envs) or new environment files.
 *
 * @param filePath
 */
export const parseDataFile = async (
  filePath: string
): Promise<Environments> => {
  let loadedData: Export | Environment;

  if (filePath.indexOf('http') !== 0) {
    loadedData = await readJSONFile(filePath, 'utf-8');
  } else {
    const { data: responseData } = await axios.get(filePath, {
      timeout: 10000
    });

    loadedData =
      typeof responseData === 'string'
        ? JSON.parse(responseData)
        : responseData;
  }
  const environments: Environments = [];

  // we have an export file
  if ('source' in loadedData && 'data' in loadedData) {
    // Extract all environments, eventually filter items of type 'route'
    loadedData.data.forEach((dataItem) => {
      if (dataItem.type === 'environment') {
        environments.push(dataItem.item);
      }
    });
  } else if (typeof loadedData === 'object') {
    environments.push(loadedData);
  }

  if (environments.length === 0) {
    throw new Error(Messages.CLI.ENVIRONMENT_NOT_AVAILABLE_ERROR);
  }

  return environments;
};

/**
 * Check if an environment can be run by the CLI and
 * migrate it if needed.
 * Validate the environment schema (will automatically repair)
 *
 * @param environment
 */
const migrateAndValidateEnvironment = async (
  environment: Environment,
  environmentName: string | undefined,
  forceRepair?: boolean
) => {
  // environment data are too old: lastMigration is not present
  if (environment.lastMigration === undefined && !forceRepair) {
    const promptResponse: { repair: string } = await prompt([
      {
        name: 'repair',
        message: `${
          environmentName ? '"' + environmentName + '"' : 'This environment'
        } does not seem to be a valid Mockoon environment or is too old. Let Mockoon attempt to repair it?`,
        type: 'confirm',
        default: true
      }
    ]);

    if (!promptResponse.repair) {
      throw new Error(Messages.CLI.DATA_TOO_OLD_ERROR);
    }
  }

  // environment data migrated with a more recent version (if installed CLI version does not include @mockoon/commons with required migrations)
  if (environment.lastMigration > HighestMigrationId) {
    throw new Error(Messages.CLI.DATA_TOO_RECENT_ERROR);
  }

  try {
    // apply migrations
    Migrations.forEach((migration) => {
      if (migration.id > environment.lastMigration) {
        migration.migrationFunction(environment);
      }
    });
  } catch (error) {
    environment.lastMigration = HighestMigrationId;
  }

  const validatedEnvironment = EnvironmentSchema.validate(environment).value;

  return validatedEnvironment;
};

/**
 * Check if data file is in the new format (with data and source)
 * and return the environment by index or name
 *
 * @param data
 * @param options
 */
const getEnvironment = (
  environments: Environments,
  options: { name?: string; index?: number }
): Environment => {
  let findError: string;

  // find environment by index
  if (options.index !== undefined && environments[options.index]) {
    return environments[options.index];
  } else {
    findError = format(
      Messages.CLI.ENVIRONMENT_NOT_FOUND_INDEX_ERROR,
      options.index
    );
  }

  // find by name
  if (options.name) {
    const foundEnvironment = environments.find(
      (environment) => environment.name === options.name
    );

    if (foundEnvironment) {
      return foundEnvironment;
    } else {
      findError = format(
        Messages.CLI.ENVIRONMENT_NOT_FOUND_NAME_ERROR,
        options.name
      );
    }
  }

  throw new Error(findError);
};

/**
 * Load the data file, find and migrate the environment
 * copy the environment to a new temporary file.
 *
 * @param environments - path to the data file or export data
 * @param options
 */
export const prepareData = async (parameters: {
  environments: Environments;
  options: {
    name?: string;
    index?: number;
    port?: number;
    pname?: string;
    hostname?: string;
    endpointPrefix?: string;
  };
  dockerfileDir?: string;
  repair?: boolean;
}): Promise<{
  name: string;
  protocol: string;
  hostname: string;
  endpointPrefix: string;
  port: number;
  dataFile: string;
}> => {
  let environment: Environment = getEnvironment(
    parameters.environments,
    parameters.options
  );

  environment = await migrateAndValidateEnvironment(
    environment,
    parameters.options.name,
    parameters.repair
  );

  // transform the provided name or env's name to be used as process name
  environment.name = transformEnvironmentName(
    parameters.options.pname || environment.name
  );

  if (parameters.options.port !== undefined) {
    environment.port = parameters.options.port;
  }

  if (parameters.options.hostname !== undefined) {
    environment.hostname = parameters.options.hostname;
  }

  if (parameters.options.endpointPrefix !== undefined) {
    environment.endpointPrefix = parameters.options.endpointPrefix;
  }

  let dataFile: string = join(Config.dataPath, `${environment.name}.json`);

  // if we are building a Dockerfile, we want the data in the same folder
  if (parameters.dockerfileDir) {
    await mkdirp(parameters.dockerfileDir);
    dataFile = `${parameters.dockerfileDir}/${environment.name}.json`;
  }

  // save environment to data path
  await fs.writeFile(dataFile, JSON.stringify(environment));

  return {
    name: environment.name,
    protocol: environment.tlsOptions.enabled ? 'https' : 'http',
    hostname: environment.hostname,
    port: environment.port,
    endpointPrefix: environment.endpointPrefix,
    dataFile
  };
};

/**
 * Clean the temporary data files by deleting the ones with no
 * matching running process
 *
 * @param processes
 */
export const cleanDataFiles = async (
  processes: ProcessDescription[]
): Promise<void> => {
  const files = await fs.readdir(Config.dataPath);

  files.forEach(async (file) => {
    if (
      processes.findIndex((process) => `${process.name}.json` === file) === -1
    ) {
      await fs.unlink(join(Config.dataPath, file));
    }
  });
};
