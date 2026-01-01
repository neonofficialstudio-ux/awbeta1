
// api/utils/dateSafe.ts

export function safeDate(input: any): Date | null {
  if (!input) return null;
  if (input instanceof Date && !isNaN(input.getTime())) return input;

  try {
    const iso = new Date(input);
    if (!isNaN(iso.getTime())) return iso;
  } catch (e) {}

  return null;
}
