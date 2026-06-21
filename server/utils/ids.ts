// server/utils/ids.ts
export function generateId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${randomPart}`;
}
