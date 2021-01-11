import { test } from '@oclif/test';
import axios from 'axios';
import { expect } from 'chai';
import { stopProcesses } from '../libs/helpers';

const sampleDataPath = './test/data/sample-data.json';

describe('Run two mocks on the same port', () => {
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
    .command(['start', '--data', sampleDataPath, '-i', '1'])
    .catch((context) => {
      expect(context.message).to.contain('Port "3000" is already in use');
    })
    .it('should fail starting second mock on same port');

  stopProcesses('all', ['mock1']);
});

describe('Run two mocks on different port', () => {
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

  test.it('should call GET /api/test endpoint and get a result', async () => {
    const call1 = await axios.get('http://localhost:3000/api/test');
    const call2 = await axios.get('http://localhost:3001/api/test');

    expect(call1.data).to.contain('mock-content-1');
    expect(call2.data).to.contain('mock-content-2');
  });

  stopProcesses('all', ['mock1', 'mock2']);
});

describe('Run two mocks with same name', () => {
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
    .command(['start', '--data', sampleDataPath, '-i', '2', '--port', '3001'])
    .catch((context) => {
      expect(context.message).to.contain(
        'A process with the name "mock1" is already running'
      );
    })
    .it('should fail starting second mock on port 3001 due to name error');

  test.it(
    'should call GET /api/test endpoint and still get "mock1" result',
    async () => {
      const call = await axios.get('http://localhost:3000/api/test');

      expect(call.data).to.contain('mock-content-1');
    }
  );

  test.it(
    'should not get a result when calling GET /api/test endpoint on port 3001',
    async () => {
      try {
        await axios.get('http://localhost:3001/api/test');
      } catch (error) {
        expect(error.message).to.equal('connect ECONNREFUSED 127.0.0.1:3001');
      }
    }
  );

  stopProcesses('all', ['mock1']);
});
