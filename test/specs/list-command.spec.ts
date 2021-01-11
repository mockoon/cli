import { test } from '@oclif/test';
import { expect } from 'chai';
import { stopProcesses } from '../libs/helpers';

const sampleDataPath = './test/data/sample-data.json';

describe('List one process', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0', '-p', '5001'])
    .it('should start process on port 5001', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:5001 (pid: 0, name: mock1)'
      );
    });

  test
    .stdout()
    .command(['list'])
    .it('should list process', (context) => {
      expect(context.stdout).to.contain('mock1');
      expect(context.stdout).to.contain('5001');
    });

  stopProcesses('0', ['mock1']);
});

describe('List two processes', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0', '-p', '5001'])
    .it('should start process on port 5001', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:5001 (pid: 0, name: mock1)'
      );
    });

  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '1', '-p', '5002'])
    .command(['list'])
    .it('should start process on port 5002', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:5002 (pid: 1, name: mock2)'
      );
    });

  test
    .stdout()
    .command(['list'])
    .it('should list multiple processes', (context) => {
      expect(context.stdout).to.contain('mock1');
      expect(context.stdout).to.contain('mock2');
      expect(context.stdout).to.contain('5001');
      expect(context.stdout).to.contain('5002');
    });

  stopProcesses('all', ['mock1', 'mock2']);
});
