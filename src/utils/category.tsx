import { isPlainObject, isDate, isSet, isPrimitive, isMap } from "./type-utils";

export enum CategoryType {
  UNSUPPORTED = 0,
  NIL = 1,
  OBJECT = 1 << 1,
  ARRAY = 1 << 2,
  PRIMITIVE = 1 << 3,
  DATE = 1 << 4,
  SET = 1 << 5,
  MAP = 1 << 6,
}

export function getCategory(value: unknown): CategoryType {
  if (value == null) return CategoryType.NIL;
  if (isPlainObject(value)) return CategoryType.OBJECT;
  if (Array.isArray(value)) return CategoryType.ARRAY;
  if (isDate(value)) return CategoryType.DATE;
  if (isSet(value)) return CategoryType.SET;
  if (isMap(value)) return CategoryType.MAP;
  if (isPrimitive(value)) return CategoryType.PRIMITIVE;

  return CategoryType.UNSUPPORTED;
}
