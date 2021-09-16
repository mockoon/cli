import { test } from '@oclif/test';
import axios from 'axios';
import { expect } from 'chai';
import { stopProcesses } from '../libs/helpers';

const sampleDataPath = './test/data/sample-data.json';
const sampleDataUrl =
  'https://raw.githubusercontent.com/mockoon/cli/main/test/data/sample-data.json';

describe('Run single mock', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0'])
    .it('should start mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mockoon-mock1)'
      );
    });

  test.it('should call GET /api/test endpoint and get a result', async () => {
    const result = await axios.get('http://localhost:3000/api/test');

    expect(result.data).to.contain('mock-content-1');
  });

  stopProcesses('all', ['mockoon-mock1']);
});

describe('Run single mock from URL', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataUrl, '-i', '0'])
    .it('should start mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mockoon-mock1)'
      );
    });

  test.it('should call GET /api/test endpoint and get a result', async () => {
    const result = await axios.get('http://localhost:3000/api/test');

    expect(result.data).to.contain('mock-content-1');
  });

  stopProcesses('all', ['mockoon-mock1']);
});

describe('Run a single mock and override the process name', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '0', '-N', 'process123'])
    .it('should start mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mockoon-process123)'
      );
    });

  stopProcesses('mockoon-process123', ['mockoon-process123']);
});

describe('Run an https mock and verify displayed information', () => {
  test
    .stdout()
    .command(['start', '--data', sampleDataPath, '-i', '3'])
    .it('should start mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at https://localhost:3000 (pid: 0, name: mockoon-mockhttps)'
      );
    });

  stopProcesses('mockoon-mockhttps', ['mockoon-mockhttps']);
});

describe('Run single mock from an environment file (not an export file), run the only available mock (no index to provide)', () => {
  test
    .stdout()
    .command(['start', '--data', './test/data/environment.json'])
    .it('should start mock on port 3000', (context) => {
      expect(context.stdout).to.contain(
        'Mock started at http://localhost:3000 (pid: 0, name: mockoon-environment-file)'
      );
    });

  stopProcesses('mockoon-environment-file');
});
