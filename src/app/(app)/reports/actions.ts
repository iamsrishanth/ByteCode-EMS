'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { authenticatedAction } from '@/lib/auth/require-role'
import { eodReportSchema } from '@/lib/validations/index'
import type { EODReport, EODStatus, ActionResult, WeeklyReport } from '@/types'
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
// Extended types
// ---------------------------------------------------------------------------

export interface EODReportWithUser extends EODReport {
  user_name: string
  user_email: string
  department_name: string | null
}

export interface EODComplianceRow {
  user_id: string
  user_name: string
  user_email: string
  department_name: string | null
  status: EODStatus | 'not_submitted'
  submitted_at: string | null
}

// ---------------------------------------------------------------------------
// submitEOD — creates or updates today's EOD report
// ---------------------------------------------------------------------------

const submitEODSchema = eodReportSchema.extend({
  task_ids: z.array(z.string().uuid()).optional(),
  leads: z.number().int().nonnegative().optional(),
  calls: z.number().int().nonnegative().optional(),
})

export const submitEOD = authenticatedAction({
  schema: submitEODSchema,
  roles: ['super_admin', 'admin', 'employee'],
  handler: async ({ input, profile }) => {
    const supabase = await createClient()
    const today = input.date ?? new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // Determine status: late if submitted after 6 PM
    const currentHour = new Date().getHours()
    const status: EODStatus = currentHour >= 18 ? 'late' : 'submitted'

    // Upsert EOD report (one per user per day)
    const { data: existing, error: fetchError } = await supabase
      .from('eod_report')
      .select('id')
      .eq('user_id', profile.user.id)
      .eq('report_date', today)
      .maybeSingle<{ id: string }>()

    if (existing) {
      // Update
      const { error } = await supabase
        .from('eod_report')
        .update({
          summary: input.summary,
          hours_worked: input.hours_worked,
          status,
          submitted_at: now,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('[submitEOD] Update error:', error)
        throw new Error('Failed to update EOD report')
      }
    } else {
      // Insert
      const { error } = await supabase.from('eod_report').insert({
        user_id: profile.user.id,
        date: today,
        summary: input.summary,
        hours_worked: input.hours_worked,
        status,
        submitted_at: now,
      })

      if (error) {
        console.error('[submitEOD] Insert error:', error)
        throw new Error('Failed to submit EOD report')
      }
    }

    // If sales department metrics were provided, update daily_metrics
    if (
      profile.department?.name?.toLowerCase().includes('sales') &&
      (input.leads !== undefined || input.calls !== undefined)
    ) {
      const metricsUpdate: Record<string, unknown> = { updated_at: now }
      if (input.leads !== undefined) metricsUpdate.leads = input.leads
      if (input.calls !== undefined) metricsUpdate.calls = input.calls

      const { data: existingMetrics } = await supabase
        .from('daily_metrics')
        .select('id')
        .eq('user_id', profile.user.id)
        .eq('entry_date', today)
        .maybeSingle<{ id: string }>()

      if (existingMetrics) {
        await supabase
          .from('daily_metrics')
          .update(metricsUpdate)
          .eq('id', existingMetrics.id)
      } else {
        await supabase.from('daily_metrics').insert({
          user_id: profile.user.id,
          date: today,
          leads: input.leads ?? 0,
          calls: input.calls ?? 0,
          meetings: 0,
          proposals: 0,
          closed_deals: 0,
          revenue: 0,
        })
      }
    }

    return { ok: true, status }
  },
})

// ---------------------------------------------------------------------------
// getTodayEOD — fetch the current user's EOD report for today
// ---------------------------------------------------------------------------

export async function getTodayEOD(): Promise<
  ActionResult<EODReport | null>
> {
  try {
    const { user: currentUser } = await requireRole([
      'super_admin',
      'admin',
      'employee',
    ])

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('eod_report')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('report_date', today)
      .maybeSingle<EODReport>()

    if (error) {
      console.error('[getTodayEOD] Supabase error:', error)
      return { success: false, error: 'Failed to fetch EOD report' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('[getTodayEOD] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ---------------------------------------------------------------------------
// getEODHistory — fetch EOD report history, scoped by role
// ---------------------------------------------------------------------------

export async function getEODHistory(params: {
  userId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}): Promise<ActionResult<EODReportWithUser[]>> {
  try {
    const { user: currentUser } = await requireRole([
      'super_admin',
      'admin',
      'employee',
    ])

    const supabase = await createClient()

    let query = supabase
      .from('eod_report')
      .select(
        '*, user:user_id(name, email, department_id), department:user_id(department_id(name))'
      )
      .order('date', { ascending: false })
      .limit(params.limit ?? 50)

    // Scope to user
    if (currentUser.role === 'employee') {
      query = query.eq('user_id', currentUser.id)
    } else if (params.userId) {
      query = query.eq('user_id', params.userId)
    } else if (currentUser.role === 'admin' && currentUser.department_id) {
      // Admins see their department
      const { data: deptUsers } = await supabase
        .from('app_user')
        .select('id')
        .eq('department_id', currentUser.department_id)

      if (deptUsers && deptUsers.length > 0) {
        query = query.in(
          'user_id',
          deptUsers.map((u) => u.id)
        )
      }
    }

    if (params.dateFrom) {
      query = query.gte('date', params.dateFrom)
    }
    if (params.dateTo) {
      query = query.lte('date', params.dateTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getEODHistory] Supabase error:', error)
      return { success: false, error: 'Failed to fetch EOD history' }
    }

    const reports: EODReportWithUser[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      report_date: row.report_date,
      summary: row.summary,
      tasks_completed: row.tasks_completed,
      hours_worked: row.hours_worked,
      status: row.status,
      submitted_at: row.submitted_at,
      created_at: row.created_at,
      user_name: row.user?.name ?? 'Unknown',
      user_email: row.user?.email ?? '',
      department_name: row.department?.name ?? null,
    }))

    return { success: true, data: reports }
  } catch (error) {
    console.error('[getEODHistory] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ---------------------------------------------------------------------------
// getEODCompliance — admin/super_admin: get today's compliance for team
// ---------------------------------------------------------------------------

export async function getEODCompliance(
  date?: string
): Promise<ActionResult<EODComplianceRow[]>> {
  try {
    const { user: currentUser } = await requireRole(['admin', 'super_admin'])

    const supabase = await createClient()
    const targetDate = date ?? new Date().toISOString().split('T')[0]

    // Get all active users
    let userQuery = supabase
      .from('app_user')
      .select('id, name, email, department_id, department:department_id(name)')
      .eq('status', 'active')

    if (currentUser.role === 'admin' && currentUser.department_id) {
      userQuery = userQuery.eq('department_id', currentUser.department_id)
    }

    const { data: users, error: userError } = await userQuery

    if (userError) {
      console.error('[getEODCompliance] User fetch error:', userError)
      return { success: false, error: 'Failed to fetch users' }
    }

    // Get EOD reports for today
    const userIds = (users || []).map((u) => u.id)
    const { data: reports, error: reportError } = await supabase
      .from('eod_report')
      .select('user_id, status, submitted_at')
      .eq('report_date', targetDate)
      .in('user_id', userIds)

    if (reportError) {
      console.error('[getEODCompliance] Report fetch error:', reportError)
      return { success: false, error: 'Failed to fetch EOD reports' }
    }

    const reportMap = new Map(
      (reports || []).map((r) => [r.user_id, r])
    )

    const rows: EODComplianceRow[] = (users || []).map((u: any) => {
      const report = reportMap.get(u.id)
      return {
        user_id: u.id,
        user_name: u.name,
        user_email: u.email,
        department_name: u.department?.name ?? null,
        status: report ? report.status : 'not_submitted',
        submitted_at: report?.submitted_at ?? null,
      }
    })

    return { success: true, data: rows }
  } catch (error) {
    console.error('[getEODCompliance] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// ---------------------------------------------------------------------------
// getWeeklyReports — fetch auto-generated weekly reports
// ---------------------------------------------------------------------------

export async function getWeeklyReports(params?: {
  userId?: string
  limit?: number
}): Promise<ActionResult<WeeklyReport[]>> {
  try {
    const { user: currentUser } = await requireRole([
      'super_admin',
      'admin',
      'employee',
    ])

    const supabase = await createClient()

    let query = supabase
      .from('weekly_report')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(params?.limit ?? 12)

    if (currentUser.role === 'employee') {
      query = query.eq('user_id', currentUser.id)
    } else if (params?.userId) {
      query = query.eq('user_id', params.userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getWeeklyReports] Supabase error:', error)
      return { success: false, error: 'Failed to fetch weekly reports' }
    }

    return { success: true, data: (data || []) as WeeklyReport[] }
  } catch (error) {
    console.error('[getWeeklyReports] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
