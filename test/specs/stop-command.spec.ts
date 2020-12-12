import { test } from '@oclif/test';
import { expect } from 'chai';
import { stopProcesses } from '../libs/helpers';

const sampleDataPath = './test/data/sample-data.json';

describe('Stop running mock by pid', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start first mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mock1)'
      );
    });

  stopProcesses('0', 1, ['mock1']);
});

describe('Stop running mock by name', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start first mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mock1)'
      );
    });

  stopProcesses('mock1', 1, ['mock1']);
});

describe('Stop all running mocks', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start first mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mock1)'
      );
    });

  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '1', '--port', '3001'])
    .it('should start second mock on port 3001', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3001 (pid: 1, name: mock2)'
      );
    });

  stopProcesses('all', 2, ['mock1', 'mock2']);
});

describe('Stop all running mocks by default', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start first mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mock1)'
      );
    });

  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '1', '--port', '3001'])
    .it('should start second mock on port 3001', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3001 (pid: 1, name: mock2)'
      );
    });

  stopProcesses('all', 2, ['mock1', 'mock2']);
});

describe('Stop when no mock is running and no arg', () => {
  test
    .stdout()
    .command(['stop'])
    .it('should return "no process running" message', (context) => {
      expect(context.stdout).to.contain('No process is running');
    });
});

describe('Stop when no mock is running and pid arg', () => {
  test
    .stderr()
    .stdout()
    .command(['stop', '0'])
    .it('should return error and "no process running" message', (context) => {
      expect(context.stderr).to.contain('Process 0 not found');
      expect(context.stdout).to.contain('No process is running');
    });
});

describe('Stop when no mock is running and name arg', () => {
  test
    .stderr()
    .stdout()
    .command(['stop', 'test'])
    .it('should return error and "no process running" message', (context) => {
      expect(context.stderr).to.contain('process or namespace not found');
      expect(context.stdout).to.contain('No process is running');
    });
});

describe('Stop with wrong arg and list', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start first mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mock1)'
      );
    });

  test
    .stderr()
    .stdout()
    .command(['stop', '99'])
    .it('should return error and "no process running" message', (context) => {
      expect(context.stderr).to.contain('Process 99 not found');
      expect(context.stdout).to.contain(
        'Running processes:\nName      Id   Status    Cpu    Memory    Port   \nmock1'
      );
    });

  stopProcesses('0', 1, ['mock1']);
});
