import { test } from '@oclif/test';
import { expect } from 'chai';

export const stopProcesses = function (
  flag: string,
  expectedNumber: number,
  expectedProcesses?: string[]
): void {
  const params = ['stop'];

  if (flag != null) {
    params.push(flag);
  }

  test
    .stdout()
    .command(params)
    .it(`should stop '${flag}'`, (context) => {
      for (let index = 0; index < expectedNumber; index++) {
        expect(context.stdout).to.contain(
          `Process ${index}:${expectedProcesses[index]} stopped`
        );
      }
    });
};
