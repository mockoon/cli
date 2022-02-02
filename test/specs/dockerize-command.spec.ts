import { Environment } from '@mockoon/commons';
import { test } from '@oclif/test';
import { expect } from 'chai';
import { promises as fs } from 'fs';
import { readFile as readJSONFile } from 'jsonfile';
import { Config } from '../../src/config';

describe('Dockerize command', () => {
  test
    .stdout()
    .command([
      'dockerize',
      '--data',
      './test/data/envs/mock1.json',
      '--port',
      '3010',
      '--output',
      './tmp/Dockerfile'
    ])
    .it('should successfully run the command', (context) => {
      expect(context.stdout).to.contain(
        'Dockerfile was generated and saved to /home/runner/work/cli/cli/tmp/Dockerfile'
      );
      expect(context.stdout).to.contain('cd /home/runner/work/cli/cli/tmp');
      expect(context.stdout).to.contain('docker build -t mockoon-mock1 .');
      expect(context.stdout).to.contain(
        'docker run -d -p 3010:3010 mockoon-mock1'
      );
    });

  test.it(
    'should generate the Dockerfile with the correct content',
    async () => {
      const dockerfile = await fs.readFile('./tmp/Dockerfile');
      const dockerfileContent = dockerfile.toString();
      expect(dockerfileContent).to.contain(
        `RUN npm install -g @mockoon/cli@${Config.version}`
      );
      expect(dockerfileContent).to.contain('COPY mockoon-mock1.json ./data');
      expect(dockerfileContent).to.contain('EXPOSE 3010');
    }
  );

  test.it('should generate mock JSON file next to the Dockerfile', async () => {
    const mockFile: Environment = await readJSONFile(
      './tmp/mockoon-mock1.json',
      'utf-8'
    );
    expect(mockFile.name).to.equal('mockoon-mock1');
    expect(mockFile.port).to.equal(3010);
  });
});
