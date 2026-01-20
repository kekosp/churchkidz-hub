import { z } from "zod";

// Shared password validation - used for both signup and admin reset
export const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: passwordValidation,
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .max(20, "Phone number must be less than 20 characters")
    .optional()
    .or(z.literal("")),
});

// Children validation schema
export const childSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  date_of_birth: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      (date) => new Date(date) <= new Date(),
      "Date of birth cannot be in the future"
    ),
  parent_name: z
    .string()
    .min(2, "Parent name must be at least 2 characters")
    .max(100, "Parent name must be less than 100 characters")
    .trim(),
  parent_phone: z
    .string()
    .min(1, "Phone number is required")
    .max(20, "Phone number must be less than 20 characters"),
  address: z
    .string()
    .max(500, "Address must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  school_grade: z
    .string()
    .max(50, "School grade must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  attendance_status: z.string().optional().or(z.literal("")),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  servant_id: z.string().optional().or(z.literal("")),
});

// Attendance validation schema
export const attendanceSchema = z.object({
  service_date: z
    .string()
    .min(1, "Service date is required")
    .refine(
      (date) => new Date(date) <= new Date(),
      "Service date cannot be in the future"
    ),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});
