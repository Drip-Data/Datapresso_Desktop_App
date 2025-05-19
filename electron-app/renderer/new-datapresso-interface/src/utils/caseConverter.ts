/**
 * Converts a string from camelCase to snake_case.
 * @param {string} str The camelCase string.
 * @returns {string} The snake_case string.
 */
export function camelToSnake(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converts a string from snake_case to camelCase.
 * @param {string} str The snake_case string.
 * @returns {string} The camelCase string.
 */
export function snakeToCamel(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Recursively converts object keys from one case to another.
 * @param {any} data The data to convert (object, array, or primitive).
 * @param {function} converter The case conversion function (e.g., camelToSnake or snakeToCamel).
 * @returns {any} The data with converted keys.
 */
export function convertKeys(data: any, converter: (key: string) => string): any {
  if (Array.isArray(data)) {
    return data.map(item => convertKeys(item, converter));
  } else if (data !== null && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File)) {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[converter(key)] = convertKeys(data[key], converter);
      }
    }
    return newObj;
  }
  return data;
}

/**
 * Converts all keys of an object (and its nested objects/arrays) from camelCase to snake_case.
 * @param {any} data The data to convert.
 * @returns {any} Data with snake_case keys.
 */
export function keysToSnake(data: any): any {
  return convertKeys(data, camelToSnake);
}

/**
 * Converts all keys of an object (and its nested objects/arrays) from snake_case to camelCase.
 * @param {any} data The data to convert.
 * @returns {any} Data with camelCase keys.
 */
export function keysToCamel(data: any): any {
  return convertKeys(data, snakeToCamel);
}