'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { authenticatedAction } from '@/lib/auth/require-role'
import { taskSchema, taskUpdateSchema, taskStatusSchema } from '@/lib/validations/index'
import type { Task, TaskStatus, TaskPriority, ActionResult } from '@/types'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// getProfile — fetch current user profile for client components
// ---------------------------------------------------------------------------

import type { AuthProfile } from '@/types'
import { AccessDeniedError } from '@/lib/auth/require-role'

export async function getProfile(): Promise<ActionResult<AuthProfile>> {
  try {
    const profile = await requireRole(['employee', 'admin', 'super_admin'])
    return { success: true, data: profile }
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { success: false, error: error.message, code: error.code }
    }
    console.error('[getProfile] Error:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}

// ---------------------------------------------------------------------------
// Types for queries
// ---------------------------------------------------------------------------

export interface TaskFilters {
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  assigned_to?: string
  search?: string
}

export interface TaskWithAssignee extends Task {
  assignee_name: string
  assigner_name: string
}

// ---------------------------------------------------------------------------
// getTasks — fetch tasks scoped to the user's role
// ---------------------------------------------------------------------------

export async function getTasks(
  filters: TaskFilters = {}
): Promise<ActionResult<TaskWithAssignee[]>> {
  try {
    const { user: currentUser } = await requireRole([
      'super_admin',
      'admin',
      'employee',
    ])

    const supabase = await createClient()

    let query = supabase
      .from('task')
      .select('*, assignee:assigned_to(name), assigner:assigned_by(name)')
      .order('created_at', { ascending: false })

    // Role-based scoping
    if (currentUser.role === 'employee') {
      // Employees only see their own tasks
      query = query.eq('assigned_to', currentUser.id)
    } else if (currentUser.role === 'admin') {
      // Admins see tasks for users in their department
      if (currentUser.department_id) {
        const { data: deptUsers } = await supabase
          .from('app_user')
          .select('id')
          .eq('department_id', currentUser.department_id)

        if (deptUsers && deptUsers.length > 0) {
          const userIds = deptUsers.map((u) => u.id)
          query = query.in('assigned_to', userIds)
        }
      }
    }
    // super_admin sees all — no extra filter

    // Apply optional filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }

    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to)
    }

    if (filters.search) {
      query = query.ilike('title', `%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getTasks] Supabase error:', error)
      return { success: false, error: 'Failed to fetch tasks' }
    }

    // Flatten the joined data
    const tasks: TaskWithAssignee[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      assigned_to: row.assigned_to,
      assigned_by: row.assigned_by,
      priority: row.priority,
      status: row.status,
      due_date: row.due_date,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      assignee_name: row.assignee?.name ?? 'Unknown',
      assigner_name: row.assigner?.name ?? 'Unknown',
    }))

    return { success: true, data: tasks }
  } catch (error) {
    console.error('[getTasks] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ---------------------------------------------------------------------------
// createTask — admin / super_admin only
// ---------------------------------------------------------------------------

export const createTask = authenticatedAction({
  schema: taskSchema,
  roles: ['admin', 'super_admin'],
  handler: async ({ input, profile }) => {
    const supabase = await createClient()

    const { error } = await supabase.from('task').insert({
      title: input.title,
      description: input.description ?? null,
      assigned_to: input.assigned_to,
      assigned_by: profile.user.id,
      priority: input.priority,
      status: input.status ?? 'todo',
      due_date: input.due_date ?? null,
    })

    if (error) {
      console.error('[createTask] Supabase error:', error)
      throw new Error('Failed to create task')
    }

    return { ok: true }
  },
})

// ---------------------------------------------------------------------------
// updateTaskStatus — assignee can update own tasks; admin/super_admin can
//                    update any task in their scope
// ---------------------------------------------------------------------------

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<ActionResult<{ ok: boolean }>> {
  try {
    const validated = taskStatusSchema.safeParse(status)
    if (!validated.success) {
      return {
        success: false,
        error: 'Invalid status',
        code: 'VALIDATION_ERROR',
      }
    }

    const { user: currentUser } = await requireRole([
      'super_admin',
      'admin',
      'employee',
    ])

    const supabase = await createClient()

    // Fetch the existing task
    const { data: task, error: fetchError } = await supabase
      .from('task')
      .select('*')
      .eq('id', id)
      .maybeSingle<Task>()

    if (fetchError || !task) {
      return { success: false, error: 'Task not found' }
    }

    // Permission check
    const isAssignee = task.assigned_to === currentUser.id
    const isAdmin = currentUser.role === 'admin'
    const isSuperAdmin = currentUser.role === 'super_admin'

    if (!isAssignee && !isAdmin && !isSuperAdmin) {
      return { success: false, error: 'Not authorized to update this task' }
    }

    // If admin (not super_admin), verify the task belongs to their department
    if (isAdmin && !isSuperAdmin && currentUser.department_id) {
      const { data: assignee } = await supabase
        .from('app_user')
        .select('department_id')
        .eq('id', task.assigned_to)
        .maybeSingle<{ department_id: string | null }>()

      if (
        !assignee ||
        assignee.department_id !== currentUser.department_id
      ) {
        return { success: false, error: 'Not authorized to update this task' }
      }
    }

    const updates: Partial<Task> = { status: validated.data }
    if (validated.data === 'done') {
      updates.completed_at = new Date().toISOString()
    } else {
      updates.completed_at = null
    }

    const { error: updateError } = await supabase
      .from('task')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('[updateTaskStatus] Supabase error:', updateError)
      return { success: false, error: 'Failed to update task status' }
    }

    return { success: true, data: { ok: true } }
  } catch (error) {
    console.error('[updateTaskStatus] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ---------------------------------------------------------------------------
// updateTask — admin / super_admin only (full update)
// ---------------------------------------------------------------------------

export const updateTask = authenticatedAction({
  schema: taskUpdateSchema,
  roles: ['admin', 'super_admin'],
  handler: async ({ input, profile }) => {
    const supabase = await createClient()

    // Build update payload from partial input
    const updates: Record<string, unknown> = {}
    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description
    if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to
    if (input.priority !== undefined) updates.priority = input.priority
    if (input.status !== undefined) {
      updates.status = input.status
      updates.completed_at =
        input.status === 'done' ? new Date().toISOString() : null
    }
    if (input.due_date !== undefined) updates.due_date = input.due_date

    const { error } = await supabase
      .from('task')
      .update(updates)
      .eq('id', (input as any).id)

    if (error) {
      console.error('[updateTask] Supabase error:', error)
      throw new Error('Failed to update task')
    }

    return { ok: true }
  },
})

// ---------------------------------------------------------------------------
// deleteTask — admin / super_admin only
// ---------------------------------------------------------------------------

const deleteTaskSchema = z.object({
  id: z.string().uuid('Invalid task ID'),
})

export const deleteTask = authenticatedAction({
  schema: deleteTaskSchema,
  roles: ['admin', 'super_admin'],
  handler: async ({ input }) => {
    const supabase = await createClient()

    const { error } = await supabase.from('task').delete().eq('id', input.id)

    if (error) {
      console.error('[deleteTask] Supabase error:', error)
      throw new Error('Failed to delete task')
    }

    return { ok: true }
  },
})
