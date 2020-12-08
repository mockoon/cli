import { join } from 'path';
import { Config } from '../config';

export const Messages = {
  CLI: {
    RUNNING_PROCESSES: 'Running processes:',
    PROCESS_STOPPED: 'Process %d:%s stopped',
    PROCESS_STARTED: 'Mock started at http://localhost:%d (pid: %d, name: %s)',
    PROCESS_NAME_USED_ERROR:
      'A process with the name "%s" is already running. Change the environment\'s name in the data file or run start command with the "--pname" flag.',
    PROCESS_START_LOG_ERROR: `Cannot start %s due to errors (see errors in ${join(
      Config.logsPath,
      '%s-error.log'
    )})`,
    NO_RUNNING_PROCESS_FOUND: 'No process found with pid or name "%s"',
    NO_RUNNING_PROCESS: 'No process is running',
    MISSING_INDEX_OR_NAME_ERROR:
      '--index or --name is missing, you must provide one of them',
    DATA_FILE_TOO_OLD_ERROR:
      'This export file is too old and cannot be run with the CLI. Please re-export the data using a more recent version of the application',
    DATA_TOO_OLD_ERROR:
      "These environment's data are too old and cannot be run with the CLI. Please migrate them using a more recent version of the application",
    DATA_TOO_RECENT_ERROR:
      "These environment's data are too recent and cannot be run with the CLI. Please update the CLI with the following command 'npm install -g @mockoon/cli'",
    ENVIRONMENT_NOT_FOUND_INDEX_ERROR: 'Environment not found at index "%d"',
    ENVIRONMENT_NOT_FOUND_NAME_ERROR:
      'Environment with name "%s" cannot be found',
    PORT_ALREADY_USED: 'Port is already used',
    PORT_IS_NOT_VALID: 'Port is not valid'
  },
  SERVER: {
    STARTED: 'Server started on port %d',
    STOPPED: 'Server stopped',
    CREATING_PROXY: 'Creating proxy to %s'
  }
};
