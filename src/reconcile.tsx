/* eslint-disable @typescript-eslint/no-explicit-any --
   We check dynamic shapes, so it makes it easier */

import type { ReadonlyDeep, Primitive } from "type-fest";
import {
  getDisplayTypeOf,
  isDate,
  isPlainObject,
  isPrimitive,
  isSet,
  keys,
} from "./utils/type-utils";

//#region contents
const TYPE_UNSUPPORTED = 0;
const TYPE_NIL = 1;
const TYPE_OBJECT = 1 << 1;
const TYPE_ARRAY = 1 << 2;
const TYPE_PRIMITIVE = 1 << 3;
const TYPE_DATE = 1 << 4;
const TYPE_SET = 1 << 5;
//#endregion

//#region Utilties functions
function getCategory(value: unknown): number {
  if (value == null) return TYPE_NIL;
  if (isPlainObject(value)) return TYPE_OBJECT;
  if (Array.isArray(value)) return TYPE_ARRAY;
  if (isDate(value)) return TYPE_DATE;
  if (isSet(value)) return TYPE_SET;
  if (isPrimitive(value)) return TYPE_PRIMITIVE;

  return TYPE_UNSUPPORTED;
}

function assertSupportedType(value: unknown, key: PropertyKey | undefined) {
  if (getCategory(value) === TYPE_UNSUPPORTED) {
    if (key === undefined) {
      throw new TypeError(
        `reconcile(): get unsupported value ${getDisplayTypeOf(value)} which` +
          ` isn't supported`,
      );
    } else {
      throw new TypeError(
        `reconcile(): The key ${JSON.stringify(String(key))} is` +
          ` ${getDisplayTypeOf(value)} which isn't supported`,
      );
    }
  }
}
//#endregion

function reconcileValue<T>(
  current: NoInfer<T>,
  next: T,
  key: PropertyKey | undefined,
): T {
  if (Object.is(current, next)) {
    return current;
  }

  if (isPlainObject(current) && isPlainObject(next)) {
    return reconcileObject(current, next);
  }

  if (Array.isArray(current) && Array.isArray(next)) {
    return reconcileArray(current, next);
  }

  if (isDate(current) && isDate(next)) {
    if (current.getTime() === next.getTime()) {
      return current;
    }

    return next;
  }

  if (isSet(current) && isSet(next)) {
    return reconcileSet(current, next) satisfies ReadonlySet<any> as T;
  }

  assertSupportedType(current, key);
  assertSupportedType(next, key);

  return next;
}

function reconcileKey<T, K extends keyof T>(
  current: T,
  next: NoInfer<T>,
  key: K,
): T[K] {
  return reconcileValue(current[key], next[key], key);
}

function reconcileArray<const T extends any[]>(current: T, next: T): T {
  let nextCurrent;

  // Delete items from array if `next` is smaller
  if (current.length > next.length) {
    nextCurrent ??= current.slice(0, next.length);
    current.length = next.length;
  }

  for (let i = 0; i < next.length; i++) {
    // Override items is changed
    if (i < current.length) {
      const nextCurrentValue = reconcileKey(current, next, i);
      if (nextCurrentValue !== current[i]) {
        nextCurrent ??= current.concat();
        nextCurrent[i] = nextCurrentValue;
      }
    }
    // Add new items because `current` size is bigger
    else {
      nextCurrent ??= current.concat();
      nextCurrent.push(next[i]);
    }
  }

  return (nextCurrent satisfies any[] | undefined as T | undefined) ?? current;
}

function reconcileSet<T extends Primitive>(
  current: ReadonlySet<T>,
  next: ReadonlySet<T>,
): ReadonlySet<T> {
  let nextCurrent;

  // Delete items that aren't exist in `next`
  for (const item of current) {
    if (!isPrimitive(item) && !isDate(item)) {
      throw new TypeError(
        `reconcile(): Using Set supported only values that have on references`,
      );
    }
    if (!next.has(item)) {
      nextCurrent ??= new Set(current);
      nextCurrent.delete(item);
    }
  }

  // Add items from `next` that might not exist in `current`
  for (const item of next) {
    if (!isPrimitive(item) && !isDate(item)) {
      throw new TypeError(
        `reconcile(): Using Set supported only values that have on references`,
      );
    }

    if (!current.has(item)) {
      nextCurrent ??= new Set(current);
      nextCurrent.add(item);
    }
  }

  return nextCurrent ?? current;
}

function reconcileObject<T extends Record<PropertyKey, unknown>>(
  current: T,
  next: NoInfer<T>,
): T {
  const currentKeys = new Set(keys(next));
  const currentSymbols = new Set(Object.getOwnPropertySymbols(next));
  let nextCurrent;

  // Delete unexist keys in `current` from `draft`
  for (const key of keys(current)) {
    if (!currentKeys.has(key)) {
      nextCurrent ??= { ...current };
      delete nextCurrent[key];
    }
  }

  // Delete unexist symbols in `current` from `draft`
  for (const symbol of Object.getOwnPropertySymbols(current)) {
    if (!currentSymbols.has(symbol)) {
      nextCurrent ??= { ...current };
      delete nextCurrent[symbol as keyof T];
    }
  }

  // Replace every `current` property value, with `next` property value if
  // different
  for (const key of currentKeys) {
    // Key exist in current
    if (Reflect.has(current, key)) {
      const nextCurrentValue = reconcileKey(current, next, key);
      if (nextCurrentValue !== current[key]) {
        nextCurrent ??= { ...current };
        nextCurrent[key] = nextCurrentValue;
      }
    }
    // Key doesn't exist in `current`, so we assign the `next` value
    else {
      nextCurrent ??= { ...current };
      nextCurrent[key] = next[key] as any;
    }
  }

  // Replace every `current` own symbol value, with `next` symbol value if
  // different
  for (const symbol of currentSymbols) {
    // Symbol exist in `current`
    if (Reflect.has(current, symbol)) {
      const nextCurrentValue = reconcileKey(current, next, symbol);
      if (nextCurrentValue !== current[symbol as keyof T]) {
        nextCurrent ??= { ...current };
        nextCurrent[symbol as keyof T] = nextCurrentValue;
      }
    }
    // Symbol doesn't exist in `current`, so we assign the `next` value
    else {
      nextCurrent ??= { ...current };
      nextCurrent[symbol as keyof T] = next[symbol as keyof T] as any;
    }
  }

  return nextCurrent ?? current;
}

/**
 * @todo Support Map
 * @returns The value of current if all values are the same
 */
export function reconcile<T>(
  current: ReadonlyDeep<T>,
  next: ReadonlyDeep<NoInfer<T>>,
): ReadonlyDeep<T> {
  const currentCategory = getCategory(current);
  const nextCategory = getCategory(next);

  if (currentCategory === TYPE_UNSUPPORTED) {
    throw new TypeError(
      "reconcile(): `current` is of unsupported type" +
        `\n\type: ${getDisplayTypeOf(current)}`,
    );
  }

  if (nextCategory === TYPE_UNSUPPORTED) {
    throw new TypeError(
      "reconcile(): `next` is of unsupported type" +
        `\n\type: ${getDisplayTypeOf(next)}`,
    );
  }

  if (
    currentCategory === TYPE_NIL ||
    nextCategory === TYPE_NIL ||
    currentCategory === nextCategory
  ) {
    return reconcileValue(current, next, undefined);
  }

  throw new TypeError(
    "reconcile(): `current` or `next` must be of the same kind and from" +
      "the same type. But got:" +
      `\n\tcurrent: ${getDisplayTypeOf(current)}` +
      `\n\tnexts: ${getDisplayTypeOf(next)}`,
  );
}
