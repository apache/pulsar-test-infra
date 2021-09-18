import fs from 'fs';
import path from 'path';

function* getFiles(dir: string): Generator<string> {
  const ignores = ['node_modules', '.git'];

  for (const item of fs.readdirSync(dir)) {
    const entry = path.join(dir, item);
    const isDir = fs.lstatSync(entry).isDirectory();

    if (ignores.includes(item)) {
      continue;
    } else if (isDir) {
      yield* getFiles(entry);
    } else {
      yield entry;
    }
  }
}

function isYaml(path: string): boolean {
  return path.endsWith('.yaml');
}

describe('files', (): void => {
  it('make sure no ".yaml" exists (use ".yml" instead)', (): void => {
    const yamlFiles = Array.from(getFiles('.')).filter(isYaml);
    expect(yamlFiles.length).toBe(0);
  });
});
