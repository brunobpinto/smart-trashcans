import { z } from "zod";

export const createCleanupSchema = z.object({
  trashcanId: z.string().min(1, "Trashcan ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const updateCleanupSchema = createCleanupSchema.partial();

export type CreateCleanupInput = z.infer<typeof createCleanupSchema>;
export type UpdateCleanupInput = z.infer<typeof updateCleanupSchema>;
