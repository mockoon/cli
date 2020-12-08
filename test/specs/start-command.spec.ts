import { test } from '@oclif/test';
import { expect } from 'chai';

const sampleDataPath = './test/data/sample-data.json';

describe('Start command', () => {
  test
    .stderr()
    .command(['start'])
    .catch((context) => {
      expect(context.message).to.contain('Missing required flag:');
      expect(context.message).to.contain('-d, --data DATA');
    })
    .it('should fail when data flag is missing');

  test
    .stderr()
    .command(['start', '--data', sampleDataPath])
    .catch((context) => {
      expect(context.message).to.contain(
        '--index or --name is missing, you must provide one of them'
      );
    })
    .it('should fail when index or name is not provided');

  test
    .stderr()
    .command(['start', '--data', sampleDataPath, '-i', '0', '--port', '999999'])
    .catch((context) => {
      expect(context.message).to.contain('Port is not valid');
    })
    .it('should fail when a port is invalid');
});
