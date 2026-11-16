import type en from '@/messages/en.json';

export type Messages = typeof en;

// All dot-separated paths that end in a string, e.g. "toilet.access.public"
type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function createTranslate(messages: Messages): Translate {
  return (key, vars) => {
    let value: unknown = messages;
    for (const part of key.split('.')) {
      value = (value as Record<string, unknown> | undefined)?.[part];
    }
    if (typeof value !== 'string') return key;
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}
