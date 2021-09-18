import { OffsetUnits } from './enums';
import { IssueEvent } from './types';

/**
 * Format a string array into a list
 * @param strArray string array
 * @returns string that represents a list
 *
 * @example
 * > toListStr(['a', 'b'])
 * - a
 * - b
 */
export function formatStrArray(strArray: (string | undefined)[]): string {
  if (strArray.length === 0) {
    return '';
  }
  return strArray.map(s => `- ${s}`).join('\n') + '\n';
}

/**
 * Validate an enum value
 * @param name name of the variable to check
 * @param val value to check
 * @param enumObj enum object
 *
 * @example
 * > enum CD {
 *   C = 'c',
 *   D = 'd',
 * }
 * > validateEnums('a', 'b', CD)
 * Uncaught Error: `a` must be one of ['c', 'd'], but got 'b'
 */
export function validateEnum<T>(
  name: T,
  val: T,
  enumObj: { [key: string]: T },
): never | void {
  const values = Object.values(enumObj);
  if (!values.includes(val)) {
    const wrap = (s: T): string => `'${s}'`;
    const joined = values.map(wrap).join(', ');
    throw new Error(
      `\`${name}\` must be one of [${joined}], but got ${wrap(val)}`,
    );
  }
}

/**
 * Parse a offset string
 * @param offset offset string (e.g. '1M')
 * @returns [value, unit]
 *
 * @example
 * > parseOffsetString('1M')
 * [ 1, 'M' ]
 */
export function parseOffsetString(offsetStr: string): [number, OffsetUnits] {
  const chars = Object.values(OffsetUnits).join('');
  const pattern = `^(\\d+)([${chars}])$`;
  const m = new RegExp(pattern).exec(offsetStr);

  if (m === null) {
    throw Error(`"${offsetStr}" doesn't match "${pattern}"`);
  }

  const value = parseInt(m[1] as string);
  const unit = m[2] as OffsetUnits;

  return [value, unit];
}

/**
 * Get a offset date
 * @param date base date
 * @param value time value
 * @param unit time unit (must be one of ['H', 'D', 'M'])
 * @returns offset date
 *
 * @example
 * > const d = new Date('2020-10-10T10:10:10.000Z')
 * > getOffsetDate(d, '1H').toISOString()
 * '2020-10-10T09:10:10.000Z'
 *
 * > getOffsetDate(d, '1D').toISOString()
 * '2020-10-09T10:10:10.000Z'
 *
 * > getOffsetDate(d, '1M').toISOString()
 * '2020-09-10T10:10:10.000Z'
 */
export function getOffsetDate(
  date: Date,
  value: number,
  unit: OffsetUnits,
): never | Date {
  const copied = new Date(date);

  switch (unit) {
    case OffsetUnits.HOUR: {
      copied.setHours(copied.getHours() - value);
      return copied;
    }

    case OffsetUnits.DAY: {
      copied.setDate(copied.getDate() - value);
      return copied;
    }

    case OffsetUnits.MONTH: {
      copied.setMonth(copied.getMonth() - value);
      return copied;
    }

    default: {
      throw Error('Should not reach here');
    }
  }
}

/**
 * Check if a given event is a label event
 * @param event issue event
 * @returns true if `event` is a label event otherwise false
 */
export function isLabelEvent(event: IssueEvent): boolean {
  return ['labeled', 'unlabeled'].includes(event.event);
}

/**
 * Check if a given event is created by a user
 * @param event issue event
 * @returns true if a given event is created by a user otherwise false
 */
export function isCreatedByUser(event: IssueEvent): boolean {
  return event.actor.login === 'pr-bot-test';
}

/**
 * Remove duplicates in an array
 * @param array array that may contain duplicates
 * @returns unique array
 */
export function removeDuplicates<T>(array: T[]): T[] {
  return [...new Set(array)];
}
