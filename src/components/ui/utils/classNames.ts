
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classNames(...classes);
}
