
export function safeUserId(id: any): string {
  if (!id || typeof id !== "string") return "";
  return id.trim();
}
