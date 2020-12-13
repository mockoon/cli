import {
  Environment,
  Environments,
  Export,
  HighestMigrationId,
  Migrations
} from '@mockoon/commons';
import { promises as fs } from 'fs';
import { readFile as readJSONFile } from 'jsonfile';
import * as mkdirp from 'mkdirp';
import { join } from 'path';
import { ProcessDescription } from 'pm2';
import axios from 'axios';
import { format } from 'util';
import { Config } from '../config';
import { Messages } from '../constants/messages.constants';
import { transformEnvironmentName } from './utils';

/**
 * Load and parse a JSON data file
 *
 * @param filePath
 */
export const parseDataFile = async <T>(filePath: string): Promise<T> => {
  if(filePath.indexOf('http') !== 0) {
    return readJSONFile(filePath, 'utf-8');
  }

  let { data } = await axios.get(filePath, { timeout: 5000 });
  data = (typeof data === 'string') ? JSON.parse(data) : data;

  return data;
};

/**
 * Check if an environment can be run by the CLI and
 * migrate it if needed
 *
 * @param environment
 */
const migrateEnvironment = (environment: Environment) => {
  // environment data are too old: lastMigration is not present
  if (environment.lastMigration === undefined) {
    throw new Error(Messages.CLI.DATA_TOO_OLD_ERROR);
  }

  // environment data migrated with a more recent version (CLI does not include @mockoon/commons with required migrations)
  if (environment.lastMigration > HighestMigrationId) {
    throw new Error(Messages.CLI.DATA_TOO_RECENT_ERROR);
  }

  // apply migrations
  Migrations.forEach((migration) => {
    if (migration.id > environment.lastMigration) {
      migration.migrationFunction(environment);
    }
  });

  return environment;
};

/**
 * Check if data file is in the new format (with data and source)
 * and return the environment by index or name
 *
 * @param data
 * @param options
 */
const getEnvironment = (
  data: Export,
  options: { name?: string; index?: number }
): Environment => {
  // verify export file new format
  if (!data.source || !data.data) {
    throw new Error(Messages.CLI.DATA_FILE_TOO_OLD_ERROR);
  }

  // extract all environments, eventually filter items of type 'route'
  const environments: Environments = data.data.reduce<Environments>(
    (newEnvironments, dataItem) => {
      if (dataItem.type === 'environment') {
        newEnvironments.push(dataItem.item);
      }

      return newEnvironments;
    },
    []
  );

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
 * @param filePath - path to the data file
 * @param options
 */
export const prepareData = async (
  filePath: string,
  options: { name?: string; index?: number; port?: number; pname?: string }
): Promise<{ name: string; port: number; dataFile: string }> => {
  let environment: Environment = getEnvironment(
    await parseDataFile<Export>(filePath),
    options
  );

  environment = migrateEnvironment(environment);

  // transform the provided name or env's name to be used as process name
  environment.name = transformEnvironmentName(
    options.pname || environment.name
  );

  if (options.port !== undefined) {
    environment.port = options.port;
  }

  await mkdirp(Config.dataPath);

  const dataFile: string = join(Config.dataPath, `${environment.name}.json`);

  // save environment to data path
  await fs.writeFile(dataFile, JSON.stringify(environment));

  return {
    name: environment.name,
    port: environment.port,
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
