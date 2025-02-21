import { describe, expect, test } from "vitest";
import { reconcile } from "./reconcile";

describe("reconcile", function () {
  describe("errors", function () {
    test("should throw for when values are from incompatible type", function () {
      const errorMessage =
        "reconcile(): `current` or `next` must be of the same kind and fromthe same type. But got:";

      expect(() => reconcile({}, [])).toThrowError(errorMessage);
      expect(() => reconcile([], {} as [])).toThrowError(errorMessage);
      expect(() => reconcile(1, new Set() as any)).toThrowError(errorMessage);
      expect(() => reconcile(0, new Date(0) as any)).toThrowError(errorMessage);
    });

    test("should when value is a function", function () {
      interface T {
        a: (() => void) | null;
      }

      const errorMessage = `reconcile(): The key "a" is function which isn't supported`;

      expect(() => reconcile<T>({ a() {} }, { a() {} })).toThrowError(
        errorMessage,
      );
      expect(() => reconcile<T>({ a: null }, { a() {} })).toThrowError(
        errorMessage,
      );
      expect(() => reconcile<T>({ a() {} }, { a: null })).toThrowError(
        errorMessage,
      );
    });

    test("Cannot reconcile Set with referenable items (exclude Date)", function () {
      const errorMessage =
        "reconcile(): Using Set supported only values that have on references";

      expect(() => reconcile(new Set(), new Set([{}]))).toThrowError(
        errorMessage,
      );
      expect(() => reconcile(new Set(), new Set([[]]))).toThrowError(
        errorMessage,
      );
      expect(() => reconcile(new Set(), new Set([new Set()]))).toThrowError(
        errorMessage,
      );

      // Date is a special case
      expect(() =>
        reconcile(new Set(), new Set([new Date()])),
      ).not.toThrowError();
    });
  });

  describe("no change", function () {
    test("array", function () {
      const a = [1, 2, 3];
      const b = reconcile(a, [1, 2, 3]);
      expect(a).toBe(b);
    });

    test("object", function () {
      const create = () => ({ x: 1, y: 2 });
      const a = create();
      const b = reconcile(a, create());
      expect(a).toBe(b);
    });

    test("nested object", function () {
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

    test("Date in object", function () {
      const a = { d: new Date(1_000) };
      const b = reconcile(a, { d: new Date(1_000) });
      expect(a).toBe(b);
    });

    test("Set", function () {
      const a = new Set([1, 2]);
      const b = reconcile(a, new Set([2, 1]));
      expect(a).toBe(b);
    });
  });

  describe("change", function () {
    test("Date", function () {
      const a = new Date(1_000);
      const b = new Date(1_001);
      const r = reconcile(a, b);

      expect(a).not.toBe(r);
      expect(r).toBe(b);
    });

    describe("Set", function () {
      test("more items", function () {
        const a = new Set([1, 2]);
        const b = new Set([1, 2, 3]);
        const r = reconcile(a, b);
        expect(r).not.toBe(a);
        expect(r).not.toBe(b);
        expect(r).toStrictEqual(b);
      });

      test("less items", function () {
        const a = new Set([1, 2, 3]);
        const b = new Set([1, 2]);
        const r = reconcile(a, b);
        expect(r).not.toBe(a);
        expect(r).not.toBe(b);
        expect(r).toStrictEqual(b);
      });

      test("different items", function () {
        const a = new Set([1]);
        const b = new Set([2]);
        const r = reconcile(a, b);
        expect(r).not.toBe(a);
        expect(r).not.toBe(b);
        expect(r).toStrictEqual(b);
      });
    });

    test("Nested object", function () {
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
});
