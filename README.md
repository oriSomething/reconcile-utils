# Reconcile Utils

A library that contains a single utility (in the future maybe more) called `reconcile` which merges two data structures,
by returning a new data structure that reflects the changes from the new object while preserving references to unchanged parts of the first object.

## Usage

```ts
const current = { x: {} };
const next = { x: {}, y: {} };

const result = reconcile(current, next);

result.x === current.x; // -> true
```

## Supported data structures

- Primitives - `boolean`, `number`, `bigint`, `string`, `symbol`, `null`, and `undefined`
- Plain objects
- `Date`
- `Set` - supporting only values of type primitives
- `Map` - supporting only keys of type primitives

## Installing

```sh
pnpm install @orisomething/reconcile-utils
```
