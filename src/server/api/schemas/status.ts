import { z } from "zod";

export const createStatusSchema = z.object({
  trashcanId: z.string().min(1, "Trashcan ID is required"),
  capacityPct: z
    .number({ message: "Capacity percent must be a number" })
    .min(0, "Capacity percent must be at least 0")
    .max(100, "Capacity percent cannot exceed 100"),
  useCount: z
    .number({ message: "Use count must be a number" })
    .int("Use count must be an integer")
    .min(0, "Use count cannot be negative")
    .default(0),
  hour: z.coerce.date({ message: "Hour must be a valid date" }),
});

export const updateStatusSchema = createStatusSchema.partial();

export type CreateStatusInput = z.infer<typeof createStatusSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
