import { z } from "zod";

export const createTrashcanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  latitude: z
    .number({ message: "Latitude must be a number" })
    .optional(),
  longitude: z
    .number({ message: "Longitude must be a number" })
    .optional(),
  height: z
    .number({ message: "Height must be a number" })
    .int("Height must be an integer")
    .positive("Height must be a positive number")
    .default(100),
  binType: z
    .enum(["COMMON", "RECYCLE"], {
      errorMap: () => ({ message: 'Bin type must be either "COMMON" or "RECYCLE"' }),
    })
    .default("COMMON"),
});

export const updateTrashcanSchema = createTrashcanSchema.partial();

export type CreateTrashcanInput = z.infer<typeof createTrashcanSchema>;
export type UpdateTrashcanInput = z.infer<typeof updateTrashcanSchema>;