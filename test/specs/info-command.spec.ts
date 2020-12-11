import { test } from '@oclif/test';
import { expect } from 'chai';
import { stopProcesses } from '../libs/helpers';

const sampleDataPath = './test/data/sample-data.json';

describe('Get process info', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start process on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mock1)'
      );
    });

  test
    .stdout()
    .command(['info', '0'])
    .it('should get process info', (context) => {
      expect(context.stdout).to.contain('mock1');
      expect(context.stdout).to.contain('online');
      expect(context.stdout).to.contain('3000');
    });

  stopProcesses('0', 1, ['mock1']);
});

describe('Get first process info by default', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start process on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mock1)'
      );
    });

  test
    .stdout()
    .command(['info'])
    .it('should get process info', (context) => {
      expect(context.stdout).to.contain('mock1');
      expect(context.stdout).to.contain('online');
      expect(context.stdout).to.contain('3000');
    });

  stopProcesses('0', 1, ['mock1']);
});

describe('Get message if no process found', () => {
  test
    .stdout()
    .command(['info', '99'])
    .it('should get process info', (context) => {
      expect(context.stdout).to.contain(
        'No process found with pid or name "99"'
      );
    });
});
