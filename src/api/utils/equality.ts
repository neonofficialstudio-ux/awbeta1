
/**
 * Performs a fast deep equality check to avoid expensive JSON.stringify calls.
 * Optimized for the types of objects used in the application state.
 */
export function fastDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.constructor !== b.constructor) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!fastDeepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;

    for (let i = 0; i < keys.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
      if (!fastDeepEqual(a[keys[i]], b[keys[i]])) return false;
    }

    return true;
  }

  return a !== a && b !== b; // NaN check
}
