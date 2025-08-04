import { isPlainObject, isDate, isSet, isPrimitive, isMap } from "./type-utils";

type CategoryType = 0 | 1 | 2 | 4 | 8 | 16 | 32 | 64;

export const CATEGORY_UNSUPPORTED = 0;
export const CATEGORY_NIL = 1;
export const CATEGORY_OBJECT = (1 << 1) as 2;
export const CATEGORY_ARRAY = (1 << 2) as 4;
export const CATEGORY_PRIMITIVE = (1 << 3) as 8;
export const CATEGORY_DATE = (1 << 4) as 16;
export const CATEGORY_SET = (1 << 5) as 32;
export const CATEGORY_MAP = (1 << 6) as 64;

export function getCategory(value: unknown): CategoryType {
  if (value == null) return CATEGORY_NIL;
  if (isPlainObject(value)) return CATEGORY_OBJECT;
  if (Array.isArray(value)) return CATEGORY_ARRAY;
  if (isDate(value)) return CATEGORY_DATE;
  if (isSet(value)) return CATEGORY_SET;
  if (isMap(value)) return CATEGORY_MAP;
  if (isPrimitive(value)) return CATEGORY_PRIMITIVE;

  return CATEGORY_UNSUPPORTED;
}
