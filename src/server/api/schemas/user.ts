import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format").optional(),
  rfidTag: z.string().min(1, "RFID tag cannot be empty").optional(),
  role: z.enum(["WORKER", "ADMIN"], {
    errorMap: () => ({ message: 'Role must be either "WORKER" or "ADMIN"' }),
  }).default("WORKER"),
  active: z.boolean({ message: "Active must be true or false" }).default(true),
  image: z.string().url("Invalid image URL").optional(),
});

export const updateUserSchema = createUserSchema
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
  })
  .partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;