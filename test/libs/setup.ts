import { stopProcesses } from './helpers';

before('Setup: stop all running processes', () => {
  stopProcesses('all', 0);
});

after('Teardown: stop all running processes', () => {
  stopProcesses('all', 0);
});
