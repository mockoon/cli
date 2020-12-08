import { test } from '@oclif/test';
import { expect } from 'chai';

const sampleDataPath = './test/data/sample-data.json';

describe('Data loading', () => {
  test
    .stderr()
    .command(['start', '--data', './non-existing-file.json', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain(
        "ENOENT: no such file or directory, open './non-existing-file.json'"
      );
    })
    .it('should fail when data file cannot be found');

  test
    .stderr()
    .command(['start', '--data', './test/data/broken-data.json', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain(
        'Unexpected token : in JSON at position 61'
      );
    })
    .it('should fail when JSON data is invalid');

  test
    .stderr()
    .command(['start', '--data', sampleDataPath, '-i', '99'])
    .catch((context) => {
      expect(context.message).to.contain('Environment not found at index 99');
    })
    .it('should fail when there is no environment at index');

  test
    .stderr()
    .command([
      'start',
      '--data',
      sampleDataPath,
      '-n',
      'non-existing-environment-name'
    ])
    .catch((context) => {
      expect(context.message).to.contain(
        'Environment with name non-existing-environment-name cannot be found'
      );
    })
    .it('should fail when there is no environment with requested name');

  test
    .stderr()
    .command(['start', '--data', './test/data/old-format.json', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain(
        'This export file is too old and cannot be run with the CLI.'
      );
    })
    .it('should fail when data is in old format');

  //TODO test parse fail
});
