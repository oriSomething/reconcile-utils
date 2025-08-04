import type { Primitive } from "type-fest";

const PRIMITIVES = new Set([
  "boolean",
  "number",
  "bigint",
  "string",
  "symbol",
  "undefined",
]);

export function isPrimitive(
  value: unknown,
): value is boolean | number | bigint | string | symbol | null | undefined {
  return value == null || PRIMITIVES.has(typeof value);
}

/**
 * Like `Object.keys` but overrides type safety of TypeScript
 */
export const keys = Object.keys as <T extends object>(o: T) => Array<keyof T>;

export function getDisplayTypeOf(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  if (typeof value === "object") {
    const proto = Object.getPrototypeOf({});
    // Plain object
    if (proto === Object.prototype || proto === null) {
      return "object";
    }

    return getTagToString(value);
  }

  return typeof value;
}

export function getTagToString(value: object): string {
  return Object.prototype.toString.apply(value).slice(8, -1);
}

export function isPlainObject(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  if (value != null && typeof value === "object") {
    const proto = Object.getPrototypeOf(value);
    // We distinguish plain objects from class instances
    return proto === Object.prototype || proto === null;
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isSet(value: unknown): value is Set<any> {
  return (
    value != null && (value instanceof Set || getTagToString(value) === "Set")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isMap(value: unknown): value is Map<Primitive, any> {
  return (
    value != null && (value instanceof Map || getTagToString(value) === "Map")
  );
}

export function isDate(value: unknown): value is Date {
  return (
    value != null && (value instanceof Date || getTagToString(value) === "Date")
  );
}
