import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["CLIENT", "FREELANCER"], {
    errorMap: () => ({ message: "Role must be either CLIENT or FREELANCER" }),
  }),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
