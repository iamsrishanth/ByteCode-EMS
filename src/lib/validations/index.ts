import { z } from 'zod'

// ===========================================================================
// Auth schemas
// ===========================================================================

export const loginSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const setupPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type SetupPasswordInput = z.infer<typeof setupPasswordSchema>

// ===========================================================================
// Attendance schemas
// ===========================================================================

export const checkInSchema = z.object({
  note: z.string().optional(),
})
export type CheckInInput = z.infer<typeof checkInSchema>

export const checkOutSchema = z.object({
  note: z.string().optional(),
})
export type CheckOutInput = z.infer<typeof checkOutSchema>

// ===========================================================================
// EOD Report schema
// ===========================================================================

export const eodReportSchema = z.object({
  summary: z
    .string()
    .min(10, 'Summary must be at least 10 characters'),
  hours_worked: z.number().positive('Hours worked must be a positive number'),
  date: z.string().optional(), // defaults to today on server
})
export type EODReportInput = z.infer<typeof eodReportSchema>

// ===========================================================================
// Task schema
// ===========================================================================

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'blocked', 'done'])

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().uuid('Invalid user ID'),
  priority: taskPrioritySchema,
  due_date: z.string().optional(),     // ISO date string
  status: taskStatusSchema.optional(), // only for updates
})
export type TaskInput = z.infer<typeof taskSchema>

export const taskUpdateSchema = taskSchema.partial()
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>

// ===========================================================================
// User management schemas
// ===========================================================================

export const userRoleSchema = z.enum(['super_admin', 'admin', 'employee'])

export const userCreateSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  name: z.string().min(1, 'Name is required'),
  department_id: z.string().uuid('Invalid department ID').optional().nullable(),
  role: userRoleSchema,
})
export type UserCreateInput = z.infer<typeof userCreateSchema>

export const userUpdateSchema = userCreateSchema.partial()
export type UserUpdateInput = z.infer<typeof userUpdateSchema>

// ===========================================================================
// Daily Metrics schema
// ===========================================================================

export const dailyMetricsSchema = z.object({
  date: z.string().optional(), // defaults to today
  leads: z.int().nonnegative('Leads must be zero or greater'),
  calls: z.int().nonnegative('Calls must be zero or greater'),
  meetings: z.int().nonnegative('Meetings must be zero or greater').optional(),
  proposals: z.int().nonnegative('Proposals must be zero or greater').optional(),
  closed_deals: z
    .int()
    .nonnegative('Closed deals must be zero or greater')
    .optional(),
  revenue: z.number().nonnegative('Revenue must be zero or greater').optional(),
})
export type DailyMetricsInput = z.infer<typeof dailyMetricsSchema>

// ===========================================================================
// Weekly Report schema
// ===========================================================================

export const weeklyReportSchema = z.object({
  week_start: z.string().min(1, 'Week start date is required'),
  week_end: z.string().min(1, 'Week end date is required'),
  employee_note: z.string().optional(),
  leads_total: z.int().nonnegative().optional(),
  calls_total: z.int().nonnegative().optional(),
  tasks_completed: z.int().nonnegative().optional(),
  eod_submitted: z.int().nonnegative().optional(),
  days_present: z.int().nonnegative().optional(),
})
export type WeeklyReportInput = z.infer<typeof weeklyReportSchema>

// ===========================================================================
// Shared / utility schemas
// ===========================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})
export type PaginationInput = z.infer<typeof paginationSchema>
