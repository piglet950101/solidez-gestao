import { z } from 'zod';

/** Coerce empty strings from FormData/HTML selects into `null`. */
export const emptyToNull = (v: unknown): unknown => {
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
};

/** Optional UUID where empty string is treated as null/absent. */
export const optionalUuid = z.preprocess(emptyToNull, z.string().uuid().nullable().optional());

/** Optional string where empty string is treated as null. */
export const optionalString = z.preprocess(emptyToNull, z.string().nullable().optional());

/** Optional date where empty string is treated as null. */
export const optionalDate = z.preprocess(
  emptyToNull,
  z
    .union([z.string(), z.date()])
    .nullable()
    .optional(),
);
