
export function validateInput(obj: any, schema: Record<string, string>): boolean {
  if (!obj) return false;
  for (const key in schema) {
    if (obj[key] === undefined) return false;
    if (typeof obj[key] !== schema[key]) return false;
  }
  return true;
}
