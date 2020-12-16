import { test } from '@oclif/test';
import { expect } from 'chai';

const sampleDataPath = './test/data/sample-data.json';

describe('Data loading', () => {
  test
    .stderr()
    .command(['start', '--data', './non-existing-file.json', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain('ENOENT: no such file or directory');
    })
    .it('should fail when data file cannot be found');

  test
    .stderr()
    .command(['start', '--data', 'https://example.org', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain(
        'Unexpected token < in JSON at position'
      );
    })
    .it('should fail when the response is no valid JSON');

  test
    .stderr()
    .command(['start', '--data', 'https://malformed url', '-i', '0'])
    .catch((context) => {
      const contains =
        context.message.indexOf('getaddrinfo ENOTFOUND') >= 0 ||
        context.message.indexOf('getaddrinfo EAI_AGAIN') >= 0;
      expect(contains).to.eql(true);
    })
    .it('should fail when the URL is invalid');

  test
    .stderr()
    .command(['start', '--data', 'https://not-existing-url', '-i', '0'])
    .catch((context) => {
      const contains =
        context.message.indexOf('getaddrinfo ENOTFOUND') >= 0 ||
        context.message.indexOf('getaddrinfo EAI_AGAIN') >= 0;
      expect(contains).to.eql(true);
    })
    .it('should fail when the address cannot be found');

  test
    .stderr()
    .command(['start', '--data', 'https://www.google.com:81', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain('timeout');
    })
    .it('should fail when there is no response');

  test
    .stderr()
    .command(['start', '--data', './test/data/broken-data.json', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain(
        'Unexpected token D in JSON at position'
      );
    })
    .it('should fail when JSON data is invalid');

  test
    .stderr()
    .command(['start', '--data', './test/data/empty-data.json', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain(
        'No environments exist in specified file'
      );
    })
    .it('should fail when file contains no environment');

  test
    .stderr()
    .command(['start', '--data', sampleDataPath, '-i', '99'])
    .catch((context) => {
      expect(context.message).to.contain('Environment not found at index "99"');
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
        'Environment with name "non-existing-environment-name" cannot be found'
      );
    })
    .it('should fail when there is no environment with requested name');

  test
    .stderr()
    .command(['start', '--data', './test/data/old-format.json', '-i', '0'])
    .catch((context) => {
      expect(context.message).to.contain(
        'This export file is too old and cannot be run with the CLI'
      );
    })
    .it('should fail when data is in old format');
});
