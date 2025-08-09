/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Merge, Primitive, ReadonlyDeep } from "type-fest";

type ReconcileSetResult<T, U> =
  T extends ReadonlySet<infer TK>
    ? U extends ReadonlySet<infer UK>
      ? ReadonlySet<ReconcileResult<TK, UK>>
      : ReadonlySet<TK> | ReadonlyDeep<U>
    : U extends ReadonlySet<infer UK>
      ? ReadonlyDeep<T> | ReadonlySet<UK>
      : ReadonlyDeep<T | U>;

type ReconcileMapResult<T, U> =
  T extends ReadonlyMap<infer TK, infer TV>
    ? U extends ReadonlyMap<infer UK, infer UV>
      ? ReadonlyMap<TK | UK, ReconcileResult<TV, UV>>
      : ReadonlyMap<TK, TV> | U
    : U extends ReadonlyMap<infer UK, infer UV>
      ? ReadonlyDeep<T> | ReadonlyMap<UK, UV>
      : ReadonlyDeep<T | U>;

type ReconcileArrayResult<T, U> =
  T extends ReadonlyArray<infer TV>
    ? U extends ReadonlyArray<infer UV>
      ? TV extends Primitive
        ? UV extends Primitive
          ? ReadonlyArray<TV | UV>
          : ReadonlyArray<ReadonlyDeep<UV>>
        : ReadonlyArray<ReconcileResult<TV, UV>>
      : ReadonlyDeep<U>
    : U extends ReadonlyArray<infer UV>
      ? ReadonlyArray<UV>
      : never;

export type ReconcileObjectResult<T> = {
  readonly [K in keyof T]: T[K] extends Primitive
    ? T[K]
    : ReconcileResult<T[K], T[K]>;
};

export type ReconcileResult<T, U> =
  // Set
  T extends ReadonlySet<any>
    ? ReconcileSetResult<T, U>
    : U extends ReadonlySet<any>
      ? ReconcileSetResult<T, U>
      : // Map
        U extends ReadonlyMap<any, any>
        ? ReconcileMapResult<T, U>
        : // Array
          T extends readonly any[]
          ? ReconcileArrayResult<T, U>
          : U extends readonly any[]
            ? ReconcileArrayResult<T, U>
            : // Primitive
              T extends Primitive
              ? U extends Primitive
                ? T | U
                : ReadonlyDeep<U>
              : U extends Primitive
                ? U
                : // Objects
                  ReconcileObjectResult<Merge<T, U>>;
