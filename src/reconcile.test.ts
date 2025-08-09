import { describe, expect, test } from "vitest";
import { reconcile } from "./reconcile";

describe("reconcile", function () {
  describe("errors", function () {
    test("should when value is a function", function () {
      const errorMessage = `reconcile(): The key "a" is function which isn't supported`;

      expect(() => reconcile({ a() {} }, { a() {} })).toThrowError(
        errorMessage,
      );
      expect(() => reconcile({ a: null }, { a() {} })).toThrowError(
        errorMessage,
      );
      expect(() => reconcile({ a() {} }, { a: null })).toThrowError(
        errorMessage,
      );
    });

    test("Cannot reconcile Set with referenable items", function () {
      const errorMessage =
        "reconcile(): Using Set is supported only with values that have no references";

      expect(() => reconcile(new Set(), new Set([{}]))).toThrowError(
        errorMessage,
      );

      expect(() => reconcile(new Set(), new Set([[]]))).toThrowError(
        errorMessage,
      );
      expect(() => reconcile(new Set(), new Set([new Set()]))).toThrowError(
        errorMessage,
      );
    });

    test("Cannot reconcile Map with referenable items", function () {
      const errorMessage =
        "reconcile(): Using Map is supported only with keys that have no references";

      expect(() => reconcile(new Map(), new Map([[{}, 1]]))).toThrowError(
        errorMessage,
      );
      expect(() => reconcile(new Map(), new Map([[[], 1]]))).toThrowError(
        errorMessage,
      );
      expect(() =>
        reconcile(new Map(), new Map([[new Map(), 1]])),
      ).toThrowError(errorMessage);
    });

    describe("should throw for when values are from incompatible type in top level", function () {
      const errorMessage =
        "reconcile(): `current` or `next` must be of the same kind and fromthe same type. But got:";

      describe.each(
        // All primitive treated as the same type, so no point to add string / boolean / biging
        [{}, [], 1, new Date(1), new Set()].map((value, __, values) => [
          value,
          values.filter((v) => v !== value),
        ]),
      )("%p", function (value, otherValues) {
        test.each(otherValues)("%p", function (otherValue) {
          expect(() => {
            reconcile(value, otherValue);
          }).toThrowError(errorMessage);
        });
      });
    });
  });

  describe("no change", function () {
    test("Array", function () {
      const a = [1, 2, 3];
      const b = reconcile(a, [1, 2, 3]);
      expect(a).toBe(b);
    });

    test("Object", function () {
      const symbol = Symbol();
      const a = { x: 1, y: 2, [symbol]: 3 };
      const b = { x: 1, y: 2, [symbol]: 3 };
      const r = reconcile(a, b);
      expect(a).toBe(r);
    });

    test("nested Object", function () {
      const y = { aaa: 2 };
      const z = { bbb: 3 };
      const arrayIndex1 = { ccc: 4 };
      const array = ["a", arrayIndex1];

      const a = {
        x: 1,
        y,
        z,
        array,
      };

      const b = reconcile(a, structuredClone(a));
      expect(a).toBe(b);
    });

    test("Date", function () {
      const a = new Date(1_000);
      const b = reconcile(a, new Date(1_000));
      expect(a).toBe(b);
    });

    test("Date in Object", function () {
      const a = { d: new Date(1_000) };
      const b = reconcile(a, { d: new Date(1_000) });
      expect(a).toBe(b);
    });

    test("Set", function () {
      const a = new Set([1, 2]);
      const b = reconcile(a, new Set([2, 1]));
      expect(a).toBe(b);
    });

    test("Map", function () {
      const symbol = Symbol();
      const a = new Map<string | symbol, number>([
        ["x", 1],
        ["y", 2],
        [symbol, 3],
      ]);
      const b = new Map<string | symbol, number>([
        ["y", 2],
        ["x", 1],
        [symbol, 3],
      ]);

      const r = reconcile(a, b);
      expect(a).toBe(r);
    });

    test("nested Map", function () {
      const y = new Map([["aaa", 2]]);
      const z = new Map([["bbb", 3]]);
      const arrayIndex1 = new Map([["ccc", 4]]);
      const array = ["a", arrayIndex1];

      const a = new Map<string, any>([
        ["x", 1],
        ["y", y],
        ["z", z],
        ["array", array],
      ]);

      const b = reconcile(a, structuredClone(a));
      expect(a).toBe(b);
    });
  });

  describe("change", function () {
    test.each([null, undefined])(
      "Convert any value to %s at root",
      function (value) {
        expect(reconcile({}, value)).toBe(value);
        expect(reconcile([], value)).toBe(value);
        expect(reconcile(new Date(), value)).toBe(value);
        expect(reconcile(new Set(), value)).toBe(value);
        expect(reconcile(new Map(), value)).toBe(value);
        expect(reconcile(1, value)).toBe(value);
        expect(reconcile("1", value)).toBe(value);
        expect(reconcile(true, value)).toBe(value);
        expect(reconcile(1n, value)).toBe(value);
        expect(reconcile(NaN, value)).toBe(value);
        expect(reconcile(undefined, value)).toBe(value);
        expect(reconcile(null, value)).toBe(value);
      },
    );

    test("Date", function () {
      const a = new Date(1_000);
      const b = new Date(1_001);
      const r = reconcile(a, b);

      expect(a).not.toBe(r);
      expect(r).toBe(b);
    });

    describe("Object", function () {
      test("different symbols", function () {
        const a = { x: 1, [Symbol("a")]: 2 };
        const b = { x: 1, [Symbol("b")]: 2 };
        const r = reconcile(a, b);

        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("more items", function () {
        const a = { x: 1 };
        const b = { x: 1, y: 2 };
        const r = reconcile(a, b);
        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("less items", function () {
        const a = { x: 1, y: 2 };
        const b = { x: 1 };
        const r = reconcile(a, b);
        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("different values", function () {
        const a = { x: 1, y: 1 };
        const b = { x: 1, y: null };
        const r = reconcile(a, b);
        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("Nested", function () {
        const x = {};
        const yb = {};
        const y = { ya: 1, yb };
        const z = [1];

        const a = {
          x,
          y,
          z,
        };

        const b = structuredClone(a);
        b.y.ya = 2;

        const r = reconcile(a, b);
        expect(a).not.toBe(r);
        expect(r).toStrictEqual(b);
        expect(r.x).toBe(x);
        expect(r.z).toBe(z);
        expect(r.y.yb).toBe(yb);
        expect(r.y.ya).toBe(2);
        expect(r.y).not.toBe(y);
      });
    });

    describe("Array", function () {
      test("Reference isn't save if index change for same value", function () {
        const obj = {};
        const a = [1, 2, obj];
        const r = reconcile(a, [1, {}]);

        expect(r).not.toBe(a);
        expect(r).toStrictEqual([1, {}]);
        expect(r.at(-1)).not.toBe(obj);
      });

      const t = <T>(id: [title: string, a: T[], b: T[], c: T[], d: T[]]) => id;
      describe.each([
        t(["number", [1, 2], [1, 2, 3], [1], [2]]),
        t(["bigint", [1n, 2n], [1n, 2n, 3n], [1n], [2n]]),
        t(["string", ["1", "2"], ["1", "2", "3"], ["1"], ["2"]]),
        t([
          "symbol",
          [Symbol.for("1"), Symbol.for("2")],
          [Symbol.for("1"), Symbol.for("2"), Symbol.for("3")],
          [Symbol.for("1")],
          [Symbol.for("2")],
        ]),
        t([
          "date",
          [new Date(1), new Date(2)],
          [new Date(1), new Date(2), new Date(3)],
          [new Date(1)],
          [new Date(2)],
        ]),
        t(["null undefined", [null], [null, undefined], [null], [undefined]]),
        t(["boolean", [false], [false, true], [false], [true]]),
      ])("%s", function (__, a, b, z1, z2) {
        test("more items", function () {
          const r = reconcile(a, b);
          expect(r).not.toBe(a);
          expect(r).not.toBe(b);
          expect(r).toStrictEqual(b);
        });

        test("less items", function () {
          const r = reconcile(a, b);
          expect(r).not.toBe(a);
          expect(r).not.toBe(b);
          expect(r).toStrictEqual(b);
        });

        test("different items", function () {
          const a = z1;
          const b = z2;
          const r = reconcile(a, b);
          expect(r).not.toBe(a);
          expect(r).not.toBe(b);
          expect(r).toStrictEqual(b);
        });
      });
    });

    describe("Set", function () {
      const t = <T>(
        title: string,
        a: Set<T>,
        b: Set<T>,
        z1: Set<T>,
        z2: Set<T>,
      ) => [title, a, b, z1, z2] as const;

      describe.each([
        t(
          "number",
          new Set([1, 2]),
          new Set([1, 2, 3]),
          new Set([1]),
          new Set([2]),
        ),
        t(
          "bigint",
          new Set([1n, 2n]),
          new Set([1n, 2n, 3n]),
          new Set([1n]),
          new Set([2n]),
        ),
        t(
          "string",
          new Set(["1", "2"]),
          new Set(["1", "2", "3"]),
          new Set(["1"]),
          new Set(["2"]),
        ),
        t(
          "symbol",
          new Set([Symbol.for("1"), Symbol.for("2")]),
          new Set([Symbol.for("1"), Symbol.for("2"), Symbol.for("3")]),
          new Set([Symbol.for("1")]),
          new Set([Symbol.for("2")]),
        ),
        t(
          "null undefined",
          new Set([null]),
          new Set([null, undefined]),
          new Set([null]),
          new Set([undefined]),
        ),
        t(
          "boolean",
          new Set([false]),
          new Set([false, true]),
          new Set([false]),
          new Set([true]),
        ),
      ])("%s", function (__, a, b, z1, z2) {
        test("more items", function () {
          const r = reconcile(a, b);
          expect(r).not.toBe(a);
          expect(r).not.toBe(b);
          expect(r).toStrictEqual(b);
        });

        test("less items", function () {
          const r = reconcile(a, b);
          expect(r).not.toBe(a);
          expect(r).not.toBe(b);
          expect(r).toStrictEqual(b);
        });

        test("different items", function () {
          const r = reconcile(z1, z2);
          expect(r).not.toBe(z1);
          expect(r).not.toBe(z2);
          expect(r).toStrictEqual(z2);
        });
      });
    });

    describe("Map", function () {
      test("different symbols", function () {
        const a = new Map<any, any>([
          ["x", 1],
          [Symbol("a"), 2],
        ]);
        const b = new Map<any, any>([
          ["x", 1],
          [Symbol("b"), 2],
        ]);
        const r = reconcile(a, b);

        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("more items", function () {
        const a = new Map([["x", 1]]);
        const b = new Map([
          ["x", 1],
          ["y", 2],
        ]);
        const r = reconcile(a, b);
        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("less items", function () {
        const a = new Map([
          ["x", 1],
          ["y", 2],
        ]);
        const b = new Map([["x", 1]]);
        const r = reconcile(a, b);
        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("different values", function () {
        const a = new Map([
          ["x", 1],
          ["y", 1],
        ]);
        const b = new Map([
          ["x", 1],
          ["y", null],
        ]);
        const r = reconcile(a, b);
        expect(r).not.toStrictEqual(a);
        expect(r).toStrictEqual(b);
      });

      test("Nested", function () {
        const x = new Map<any, any>();
        const yb = new Map<any, any>();
        const y = new Map<any, any>([
          ["ya", 1],
          ["yb", yb],
        ]);
        const z = [1];

        const a = new Map<any, any>([
          ["x", x],
          ["y", y],
          ["z", z],
        ]);

        const b = structuredClone(a);
        b.get("y")!.set("ya", 2);

        const r = reconcile(a, b);
        expect(a).not.toBe(r);
        expect(r).toStrictEqual(b);
        expect(r.get("x")).toBe(x);
        expect(r.get("z")).toBe(z);

        expect(r.get("y")!.get("yb")).toBe(yb);
        expect(r.get("y")!.get("ya")).toBe(2);
        expect(r.get("y")).not.toBe(y);
      });
    });
  });

  describe("froze", function () {
    test("Object.freeze()", function () {
      const a = {
        a: [{ x: 1 }],
        b: {},
      };

      const b = structuredClone(a);
      b.a[0].x = 2;

      // Freezing
      Object.freeze(b);
      Object.freeze(b.a);
      Object.freeze(b.a[0]);
      Object.freeze(a);
      Object.freeze(a.a);
      Object.freeze(a.a[0]);

      // b -> a
      const result = reconcile(a, b);
      expect(result).not.toBe(a);
      expect(result).not.toBe(b);
      expect(result.a[0].x).toBe(2);
      expect(result.b).toBe(a.b);

      // a -> b
      const result2 = reconcile(b, a);
      expect(result2).not.toBe(a);
      expect(result2).not.toBe(b);
      expect(result2.a[0].x).toBe(1);
      expect(result2.b).toBe(b.b);
    });
  });

  test("docs test", function () {
    const current = { x: {} };
    const next = { x: {}, y: {} };

    const result = reconcile(current, next);

    expect(result.x).toBe(current.x);
  });
});
