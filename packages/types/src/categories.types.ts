import { z } from "zod";

export const CreateCategoryInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/)
      .max(80)
      .optional(),
    color: z.string().trim().max(32).optional(),
    icon: z.string().trim().max(64).optional(),
    sortOrder: z.number().int().min(0).default(0),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof CreateCategoryInputSchema>;

export const UpdateCategoryInputSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(80).optional(),
    color: z.string().trim().max(32).nullable().optional(),
    icon: z.string().trim().max(64).nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export type UpdateCategoryInput = z.infer<typeof UpdateCategoryInputSchema>;

export interface CategoryRecord {
  id: string;
  tenantId: string;
  appId: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}
