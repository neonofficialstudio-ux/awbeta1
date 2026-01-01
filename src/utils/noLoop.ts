const executed = new Set();

export function noLoop(id: string, fn: Function) {
  if (executed.has(id)) return;
  executed.add(id);
  fn();
}