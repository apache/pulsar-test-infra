import { BACKTICK, COLON, ASTERISK, DOUBLE_ASTERISK } from '../src/patterns';

function testPatterns(
  pattern: string,
  testCases: { [key: string]: string[] },
): void {
  for (const [label, [state, name]] of Object.entries(testCases)) {
    const regexp = new RegExp(pattern, 'g');
    const m = regexp.exec(label);

    if (m === null) {
      throw new Error('No match found');
    }

    expect(m[1]).toBe(state);
    expect(m[2]).toBe(name);
  }
}

describe('patterns', (): void => {
  it('backtick', (): void => {
    const testCases = {
      '- [] `abc`': ['', 'abc'],
      '- [ ] `abc`': [' ', 'abc'],
      '- [  ] `abc`': ['  ', 'abc'],
      '- [x] `abc`': ['x', 'abc'],
      '- [ x] `abc`': [' x', 'abc'],
      '- [x ] `abc`': ['x ', 'abc'],
      '- [ x ] `abc`': [' x ', 'abc'],
    };

    testPatterns(BACKTICK, testCases);
  });

  it('colon', (): void => {
    const testCases = {
      '- [] abc:': ['', 'abc'],
      '- [ ] abc:': [' ', 'abc'],
      '- [  ] abc:': ['  ', 'abc'],
      '- [x] abc:': ['x', 'abc'],
      '- [ x] abc:': [' x', 'abc'],
      '- [x ] abc:': ['x ', 'abc'],
      '- [ x ] abc:': [' x ', 'abc'],
    };

    testPatterns(COLON, testCases);
  });

  it('asterisk', (): void => {
    const testCases = {
      '- [] *abc*': ['', 'abc'],
      '- [ ] *abc*': [' ', 'abc'],
      '- [  ] *abc*': ['  ', 'abc'],
      '- [x] *abc*': ['x', 'abc'],
      '- [ x] *abc*': [' x', 'abc'],
      '- [x ] *abc*': ['x ', 'abc'],
      '- [ x ] *abc*': [' x ', 'abc'],
    };

    testPatterns(ASTERISK, testCases);
  });

  it('double asterisk', (): void => {
    const testCases = {
      '- [] **abc**': ['', 'abc'],
      '- [ ] **abc**': [' ', 'abc'],
      '- [  ] **abc**': ['  ', 'abc'],
      '- [x] **abc**': ['x', 'abc'],
      '- [ x] **abc**': [' x', 'abc'],
      '- [x ] **abc**': ['x ', 'abc'],
      '- [ x ] **abc**': [' x ', 'abc'],
    };

    testPatterns(DOUBLE_ASTERISK, testCases);
  });
});
