/**
 * Based on ideas from TanStack's `replaceEqualDeep`
 * @see https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts#L251
 */

import type { Primitive } from "type-fest";
import { getDisplayTypeOf, isPrimitive, keys } from "./utils/type-utils";
import {
  CATEGORY_ARRAY,
  CATEGORY_DATE,
  CATEGORY_MAP,
  CATEGORY_NIL,
  CATEGORY_OBJECT,
  CATEGORY_PRIMITIVE,
  CATEGORY_SET,
  CATEGORY_UNSUPPORTED,
  getCategory,
} from "./utils/category";
import type { ReconcileResult } from "./utils/reconcile-result";

type ReadonlySetItem<T> = T extends ReadonlySet<infer V> ? V : never;
type ReadonlyMapItem<T> = T extends ReadonlyMap<unknown, infer V> ? V : never;

//#region Utilities
/** @inline */
function throwUnsupportedValue(value: unknown, key: Primitive): never {
  if (key === undefined) {
    throw new TypeError(
      `reconcile(): get unsupported value ${getDisplayTypeOf(value)} which` +
        ` isn't supported`,
    );
  }

  throw new TypeError(
    `reconcile(): The key ${JSON.stringify(String(key))} is` +
      ` ${getDisplayTypeOf(value)} which isn't supported`,
  );
}

/** @inline */
function castObject<T>(value: T): T & Record<PropertyKey, unknown> {
  return value as T & Record<PropertyKey, unknown>;
}

/** @inline */
function castArray<T>(value: T): T & unknown[] {
  return value as T & unknown[];
}
//#endregion

//#region reconcilers
function reconcileValue<T>(
  current: NoInfer<T>,
  next: T,
  displayKey: Primitive,
): T {
  // In dev we prefer to throw early, so we won't miss unsupported types. So
  // in production we bail early for same result, in development we first make
  // sure no error made
  if (!import.meta.env.DEV) {
    if (current === next) return current;
  }

  const currentCategory = getCategory(current);
  const nextCategory = getCategory(next);

  if (currentCategory === CATEGORY_UNSUPPORTED) {
    return throwUnsupportedValue(current, displayKey);
  }
  if (nextCategory === CATEGORY_UNSUPPORTED) {
    return throwUnsupportedValue(next, displayKey);
  }

  if (import.meta.env.DEV) {
    if (current === next) return current;
  }

  // If not the same category we already know they cannot be the same
  if (currentCategory !== nextCategory) return next;

  switch (currentCategory) {
    // For immutable values with no references, we can skip check
    case CATEGORY_NIL:
    case CATEGORY_PRIMITIVE:
      return next;

    case CATEGORY_OBJECT:
      return reconcileObject(castObject(current), castObject(next));
    case CATEGORY_ARRAY:
      return reconcileArray(castArray(current), castArray(next));
    case CATEGORY_SET:
      return reconcileSet(
        current as ReadonlySet<ReadonlySetItem<T> & Primitive>,
        next as ReadonlySet<ReadonlySetItem<T> & Primitive>,
      ) satisfies ReadonlySet<Primitive> as T;

    case CATEGORY_MAP:
      return reconcileMap(
        current as ReadonlyMap<Primitive, ReadonlyMapItem<T>>,
        next as ReadonlyMap<Primitive, ReadonlyMapItem<T>>,
      ) satisfies ReadonlyMap<Primitive, ReadonlyMapItem<T>> as T;

    // In Date we only care if the it's the same timestamp
    case CATEGORY_DATE:
      if ((current as Date).getTime() === (next as Date).getTime()) {
        return current;
      }
      return next;
  }
}

function reconcileArray<const T extends unknown[]>(current: T, next: T): T {
  const nextCurrent = next.concat();
  let equalProperties = 0;

  const length = Math.min(current.length, next.length);

  for (let i = 0; i < length; i++) {
    nextCurrent[i] = reconcileValue(current[i], next[i], i);
    if (Object.is(nextCurrent[i], current[i])) equalProperties++;
  }

  return next.length === current.length && current.length === equalProperties
    ? current
    : (nextCurrent as T);
}

function reconcileSet<T extends Primitive>(
  current: ReadonlySet<T>,
  next: ReadonlySet<T>,
): ReadonlySet<T> {
  const nextCurrent = new Set(next);
  let equalProperties = 0;

  for (const item of nextCurrent) {
    if (!isPrimitive(item)) {
      throw new TypeError(
        `reconcile(): Using Set is supported only with values that have no` +
          ` references`,
      );
    }

    if (current.has(item)) equalProperties++;
  }

  return current.size === next.size && current.size === equalProperties
    ? current
    : nextCurrent;
}

function reconcileMap<K extends Primitive, V>(
  current: ReadonlyMap<K, V>,
  next: ReadonlyMap<K, V>,
): ReadonlyMap<K, V> {
  const nextCurrent = new Map(next);
  let equalProperties = 0;

  for (const [key, value] of nextCurrent) {
    if (!isPrimitive(key)) {
      throw new TypeError(
        `reconcile(): Using Map is supported only with keys that have no` +
          ` references`,
      );
    }

    if (current.has(key)) {
      const currentValue = current.get(key)!;
      const nextValue = reconcileValue(currentValue, value, key);

      nextCurrent.set(key, nextValue);

      if (Object.is(nextValue, currentValue)) {
        equalProperties++;
      }
    }
  }

  return current.size === nextCurrent.size && current.size === equalProperties
    ? current
    : nextCurrent;
}

function reconcileObject<T extends Record<PropertyKey, unknown>>(
  current: T,
  next: NoInfer<T>,
): T {
  const currentKeys = new Set(keys(current));
  const currentSymbols = new Set(Object.getOwnPropertySymbols(current));
  const nextKeys = new Set(keys(next));
  const nextSymbols = new Set(Object.getOwnPropertySymbols(next));

  const nextCurrent = { ...next };
  let equalProperties = 0;

  for (const key of nextKeys) {
    if (currentKeys.has(key)) {
      nextCurrent[key] = reconcileValue(current[key], next[key], key);
      if (Object.is(nextCurrent[key], current[key])) equalProperties++;
    }
  }

  for (const symbol of nextSymbols) {
    if (currentSymbols.has(symbol)) {
      (nextCurrent as Record<PropertyKey, unknown>)[symbol] = reconcileValue(
        current[symbol],
        next[symbol],
        symbol,
      );
      if (Object.is(nextCurrent[symbol], current[symbol])) equalProperties++;
    }
  }

  return currentKeys.size === nextKeys.size &&
    currentSymbols.size === nextSymbols.size &&
    equalProperties === currentKeys.size + currentSymbols.size
    ? current
    : nextCurrent;
}
//#endregion

/**
 * @returns The value of current if all values are the same
 */
export function reconcile<T, U = T>(
  current: T,
  next: U,
): ReconcileResult<T, U> {
  const currentCategory = getCategory(current);
  const nextCategory = getCategory(next);

  // We guard at root for the same type to prevent silly mistakes
  if (
    currentCategory === CATEGORY_NIL ||
    nextCategory === CATEGORY_NIL ||
    currentCategory === nextCategory
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we fake types to provide better types
    return reconcileValue<any>(current, next, undefined);
  }

  throw new TypeError(
    "reconcile(): `current` or `next` must be of the same kind and from" +
      "the same type. But got:" +
      `\n\tcurrent: ${getDisplayTypeOf(current)}` +
      `\n\tnext: ${getDisplayTypeOf(next)}`,
  );
}
