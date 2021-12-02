import { Environment, ServerErrorCodes, Transaction } from '@mockoon/commons';
import { MockoonServer } from '@mockoon/commons-server';
import { readFileSync as readJSONFileSync } from 'jsonfile';
import * as minimist from 'minimist';
import { format } from 'util';
import {
  createLogger,
  format as logFormat,
  transports as logsTransports
} from 'winston';
import { Messages } from '../constants/messages.constants';

const logger = createLogger({
  level: 'info',
  format: logFormat.combine(logFormat.timestamp(), logFormat.json()),
  transports: [new logsTransports.Console()]
});

const argv = minimist<{ data: string; environmentDir: string }>(
  process.argv.slice(2)
);

const addEventListeners = function (
  server: MockoonServer,
  environment: Environment
) {
  server.on('started', () => {
    logger.info(format(Messages.SERVER.STARTED, environment.port));

    if (!!process.send) {
      process.send('ready');
    }
  });

  server.on('error', (errorCode, error) => {
    // throw blocking errors
    if (
      errorCode === ServerErrorCodes.PORT_ALREADY_USED ||
      errorCode === ServerErrorCodes.PORT_INVALID ||
      errorCode === ServerErrorCodes.UNKNOWN_SERVER_ERROR
    ) {
      throw new Error(error?.message);
    }

    // report non blocking errors
    if (
      [
        ServerErrorCodes.REQUEST_BODY_PARSE,
        ServerErrorCodes.ROUTE_FILE_SERVING_ERROR,
        ServerErrorCodes.ROUTE_SERVING_ERROR,
        ServerErrorCodes.ROUTE_CREATION_ERROR,
        ServerErrorCodes.ROUTE_CREATION_ERROR_REGEX,
        ServerErrorCodes.PROXY_ERROR
      ].indexOf(errorCode) > -1
    ) {
      logger.error(error?.message);
    }
  });

  server.on('creating-proxy', () => {
    logger.info(format(Messages.SERVER.CREATING_PROXY, environment.proxyHost));
  });

  server.on('transaction-complete', (transaction: Transaction) => {
    logger.info(
      `${transaction.request.method} ${transaction.request.urlPath} | ${
        transaction.response.statusCode
      }${transaction.proxied ? ' | proxied' : ''}`,
      { transaction }
    );
  });

  server.on('stopped', () => {
    logger.info(Messages.SERVER.STOPPED);
  });

  process.on('SIGINT', () => {
    server.stop();
  });
};

if (argv.data) {
  try {
    const environment: Environment = readJSONFileSync(argv.data);

    const server = new MockoonServer(environment, {
      logProvider: () => ({
        log: logger.log.bind(logger),
        debug: logger.debug.bind(logger),
        info: logger.info.bind(logger),
        warn: logger.warn.bind(logger),
        error: logger.error.bind(logger)
      }),
      environmentDirectory: argv.environmentDir
    });

    addEventListeners(server, environment);

    server.start();
  } catch (error: any) {
    throw new Error(error.message);
  }
}
