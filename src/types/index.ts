// ============================================================
// ByteCode EMS v3 — Type Definitions
// ============================================================

// ---- Enums ----

export type UserRole = 'super_admin' | 'admin' | 'employee'

export type UserStatus = 'active' | 'inactive'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent'

export type EODStatus = 'submitted' | 'missed' | 'late'

// ---- Database Row Types ----

/** Corresponds to `app_user` table (Supabase Auth + custom profile). */
export interface AppUser {
  id: string // UUID, matches auth.users.id
  email: string
  name: string
  role: UserRole
  status: UserStatus
  department_id: string | null // FK → departments
  phone: string | null
  avatar_url: string | null
  created_at: string // ISO 8601 timestamp
  updated_at: string
}

/** Corresponds to `departments` table. */
export interface Department {
  id: string // UUID
  name: string
  description: string | null
  created_at: string
}

/** Corresponds to `tasks` table. */
export interface Task {
  id: string // UUID
  title: string
  description: string | null
  assigned_to: string // FK → app_user.id
  assigned_by: string // FK → app_user.id
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null // ISO 8601 date
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** Corresponds to `attendance` table. */
export interface Attendance {
  id: string // UUID
  user_id: string // FK → app_user.id
  date: string // ISO 8601 date (YYYY-MM-DD)
  check_in: string | null // ISO 8601 time
  check_out: string | null // ISO 8601 time
  status: AttendanceStatus
  note: string | null
  created_at: string
  updated_at: string
}

/** Corresponds to `eod_reports` table. */
export interface EODReport {
  id: string // UUID
  user_id: string // FK → app_user.id
  date: string // ISO 8601 date
  summary: string
  hours_worked: number
  status: EODStatus
  submitted_at: string
  created_at: string
}

/** Corresponds to `weekly_reports` table. */
export interface WeeklyReport {
  id: string // UUID
  user_id: string // FK → app_user.id
  week_start: string // Monday date ISO
  week_end: string // Sunday date ISO
  summary: string
  tasks_completed: number
  hours_total: number
  created_at: string
}

/** Corresponds to `daily_metrics` table. */
export interface DailyMetrics {
  id: string // UUID
  user_id: string // FK → app_user.id
  date: string // ISO 8601 date
  leads: number
  calls: number
  meetings: number
  proposals: number
  closed_deals: number
  revenue: number
  created_at: string
  updated_at: string
}

/** Corresponds to `audit_logs` table. */
export interface AuditLog {
  id: string // UUID
  user_id: string // FK → app_user.id
  action: string
  entity: string
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ---- Dashboard Aggregates ----

export interface DashboardStats {
  total_employees: number
  present_today: number
  tasks_due_today: number
  eod_pending: number
  leads_today: number
  calls_today: number
  revenue_this_month: number
}

export interface MissedEOD {
  user_id: string
  user_name: string
  user_email: string
  department_name: string | null
  date: string
}

// ---- Auth / Session Types ----

export interface AuthProfile {
  user: AppUser
  department: Department | null
}

// ---- Server Action Response Wrapper ----

export type ActionSuccess<T = void> = {
  success: true
  data: T
}

export type ActionError = {
  success: false
  error: string
  code?: string
  issues?: Array<{
    path: (string | number)[]
    message: string
  }>
}

export type ActionResult<T = void> = ActionSuccess<T> | ActionError

// ---- Pagination ----

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}
