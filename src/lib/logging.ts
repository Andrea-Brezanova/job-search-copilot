export const isDev = process.env.NODE_ENV !== "production";

export function debugLog(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

export function debugJson(label: string, value: unknown) {
  if (isDev) {
    console.log(label, JSON.stringify(value, null, 2));
  }
}
