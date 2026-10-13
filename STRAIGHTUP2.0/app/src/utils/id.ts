let counter = 0;

/** Simple unique-enough id for locally stored records (no backend, no UUID lib needed). */
export function generateId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
