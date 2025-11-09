import { z } from "zod";

export const createTrashcanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  height: z.number().int().positive().default(100),
  binType: z.enum(["COMMON", "RECYCLE"]).default("COMMON"),
});

export const updateTrashcanSchema = createTrashcanSchema.partial();

export type CreateTrashcanInput = z.infer<typeof createTrashcanSchema>;
export type UpdateTrashcanInput = z.infer<typeof updateTrashcanSchema>;