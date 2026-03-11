/**
 * validation.ts — Zod Validation Schemas
 * 
 * PURPOSE: Centralized input validation for all forms in the application.
 * Uses Zod for type-safe, composable validation with clear error messages.
 * 
 * SECURITY: Prevents injection attacks, enforces length limits, and ensures
 * data integrity before any database operations.
 */

import { z } from 'zod';

/** Login form validation */
export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Signup form validation */
export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name contains invalid characters'),
  email: z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
  department: z.string().trim().max(100, 'Department name is too long').optional().or(z.literal('')),
});
export type SignupInput = z.infer<typeof signupSchema>;

/** Create request form validation */
export const createRequestSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  vendorName: z.string().trim().max(200, 'Vendor name is too long').optional().or(z.literal('')),
  approverIds: z.array(z.string().uuid()).min(1, 'Select at least one approver'),
});
export type CreateRequestInput = z.infer<typeof createRequestSchema>;

/** Return/reject step validation */
export const returnStepSchema = z.object({
  message: z.string().trim().min(5, 'Please provide a reason (at least 5 characters)').max(1000, 'Message is too long'),
});
export type ReturnStepInput = z.infer<typeof returnStepSchema>;

/** Admin: Add user form validation */
export const addUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name contains invalid characters'),
  email: z.string().trim().email('Please enter a valid email address').max(255, 'Email is too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
  role: z.enum(['user', 'approver', 'admin'], { required_error: 'Please select a role' }),
  department: z.string().trim().max(100, 'Department name is too long').optional().or(z.literal('')),
});
export type AddUserInput = z.infer<typeof addUserSchema>;

/** Comment validation */
export const commentSchema = z.object({
  message: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment is too long'),
});
export type CommentInput = z.infer<typeof commentSchema>;
