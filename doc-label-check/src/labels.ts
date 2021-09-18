import { Label } from './types';

/**
 * Format a label into a string representation
 * @param label labels
 * @returns string representation of a given label
 */
export function formatLabel(label: Label): string {
  return `{ name: '${label.name}', checked: ${label.checked} }`;
}

/**
 * Extract labels from the description of an issue or a pull request
 * @param description string that contains labels
 * @param labelPattern regular expression to use to find labels
 * @returns labels (list of { name: string; checked: boolean; })
 *
 * @example
 * > const body = '- [ ] `a`\n- [x] `b`'
 * > const labelPattern = '- \\[([ xX]*)\\] ?`(.+?)`'
 * > extractLabels(body, labelPattern)
 * [ { name: 'a', checked: false }, { name: 'b', checked: true } ]
 */
export function extractLabels(
  description: string,
  labelPattern: string,
): Label[] {
  function helper(regex: RegExp, labels: Label[] = []): Label[] {
    const res = regex.exec(description);

    if (res) {
      const checked = res[1].trim().toLocaleLowerCase() === 'x';
      const name = res[2].trim();
      return helper(regex, [...labels, { name, checked }]);
    }
    return labels;
  }
  return helper(new RegExp(labelPattern, 'g'));
}

/**
 * Get `name` property from an object
 * @param obj object that has `name` property
 * @returns value of `name` property
 *
 * @example
 * > getName({ name: 'a' })
 * 'a'
 */
export function getName({ name }: { name: string }): string {
  return name;
}

/**
 * Get `checked` property from an object
 * @param obj object that has `checked` property
 * @returns value of `checked` property
 *
 * @example
 * > getChecked({ checked: true })
 * true
 */
export function getChecked({ checked }: { checked: boolean }): boolean {
  return checked;
}
