import fs from 'fs';

function extractFirstCapturingGroup(
  body: string,
  pattern: RegExp,
): never | string {
  const m = pattern.exec(body);

  if (m === null) {
    throw new Error('No match found');
  }

  return m[1];
}

describe('README.md', (): void => {
  it('inputs section on README.md should have the same content as action.yml', (): void => {
    const contentReadme = fs.readFileSync('README.md', 'utf-8');
    const contentActionYml = fs.readFileSync('action.yml', 'utf-8');

    const inputsReadme = extractFirstCapturingGroup(
      contentReadme,
      /## Inputs\s+```yml(.+?)```/s,
    ).trim();

    const inputsActionYml = extractFirstCapturingGroup(
      contentActionYml,
      /(inputs.+?)\s+runs/s,
    ).trim();

    expect(inputsReadme).toBe(inputsActionYml);
  });
});
