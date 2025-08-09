import { describe, expectTypeOf, test } from "vitest";
import { reconcile } from "./reconcile";

describe("reconcile", function () {
  test("Object", function () {
    expectTypeOf(reconcile({ x: 1 }, { x: 1, y: 2 })).toEqualTypeOf<{
      readonly x: number;
      readonly y: number;
    }>();

    expectTypeOf(reconcile({ x: 1, y: 2 }, { x: 1 })).toEqualTypeOf<{
      readonly x: number;
      readonly y: number;
    }>();

    expectTypeOf(reconcile({ x: 1 }, 1)).toEqualTypeOf<number>();

    expectTypeOf(reconcile(1, { x: 1 })).toEqualTypeOf<{
      readonly x: number;
    }>();

    expectTypeOf(reconcile({ x: 1, y: 1 }, { x: { z: 1 } })).toEqualTypeOf<{
      readonly x: { readonly z: number };
      readonly y: number;
    }>();

    expectTypeOf(reconcile({ x: [1] }, { x: ["1"] })).toEqualTypeOf<{
      readonly x: readonly string[];
    }>();

    expectTypeOf(
      reconcile(
        { x: new Set<{ z: number }>() },
        { x: new Set<{ z: number }>() },
      ),
    ).toEqualTypeOf<{
      readonly x: ReadonlySet<{
        readonly z: number;
      }>;
    }>();
  });

  test("Array", function () {
    expectTypeOf(reconcile([1], [2])).toEqualTypeOf<readonly number[]>();
    expectTypeOf(reconcile([1], ["2"])).toEqualTypeOf<
      readonly (number | string)[]
    >();
    expectTypeOf(reconcile(["1"], [2])).toEqualTypeOf<
      readonly (number | string)[]
    >();

    expectTypeOf(reconcile([1], { x: 1 })).toEqualTypeOf<{
      readonly x: number;
    }>();

    expectTypeOf(reconcile({ x: 1 }, [1])).toEqualTypeOf<readonly number[]>();

    expectTypeOf(reconcile([{ x: 1 }], [{ y: 1 }])).toEqualTypeOf<
      ReadonlyArray<{
        readonly x: number;
        readonly y: number;
      }>
    >();

    expectTypeOf(reconcile([1], [{ y: 1 }])).toEqualTypeOf<
      ReadonlyArray<{
        readonly y: number;
      }>
    >();
  });

  test("Set", function () {
    expectTypeOf(reconcile(new Set([1]), new Set(["2"]))).toEqualTypeOf<
      ReadonlySet<number | string>
    >();

    expectTypeOf(
      reconcile(new Set<number>(), new Set<Set<unknown>>()),
    ).toEqualTypeOf<ReadonlySet<number | ReadonlySet<unknown>>>();

    expectTypeOf(
      reconcile(new Set<Set<unknown>>(), new Set<number>()),
    ).toEqualTypeOf<ReadonlySet<number | ReadonlySet<unknown>>>();

    expectTypeOf(reconcile(new Set<string>(), 0)).toEqualTypeOf<
      number | ReadonlySet<string>
    >();

    reconcile(1, new Set<string>());

    expectTypeOf(reconcile(1, new Set<string>())).toEqualTypeOf<
      number | ReadonlySet<string>
    >();
  });

  test("Map", function () {
    expectTypeOf(
      reconcile(new Map([[1, "2"]]), new Map([["2", 3]])),
    ).toEqualTypeOf<ReadonlyMap<number | string, number | string>>();

    expectTypeOf(
      reconcile(new Map<number, string>(), new Map<number, Set<unknown>>()),
    ).toEqualTypeOf<ReadonlyMap<number, string | ReadonlySet<unknown>>>();

    expectTypeOf(
      reconcile(new Map<number, Set<unknown>>(), new Map<number, number>()),
    ).toEqualTypeOf<ReadonlyMap<number, number | ReadonlySet<unknown>>>();
  });
});
