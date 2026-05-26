import { createServiceClient } from '@/lib/supabase/admin'

export const AuditActions = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DEACTIVATED: 'user.deactivated',
  USER_REACTIVATED: 'user.reactivated',
  ROLE_CHANGED: 'user.role_changed',
  DEPARTMENT_CREATED: 'department.created',
  DEPARTMENT_UPDATED: 'department.updated',
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_DELETED: 'task.deleted',
  EOD_SUBMITTED: 'eod.submitted',
  ATTENDANCE_CHECKIN: 'attendance.checkin',
  ATTENDANCE_CHECKOUT: 'attendance.checkout',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]

export async function logAuditEvent(params: {
  actorId: string
  action: string
  targetType: string
  targetId?: string
  details?: Record<string, unknown>
}) {
  try {
    const supabase = createServiceClient()
    await supabase.from('audit_log').insert({
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      details: params.details ?? null,
    })
  } catch (err) {
    console.error('[AuditLog] Failed:', err)
  }
}
