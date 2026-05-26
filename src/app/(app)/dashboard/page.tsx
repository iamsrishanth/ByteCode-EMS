import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Clock,
  CheckSquare,
  FileText,
  Users,
  Building2,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  LogIn,
  LogOut,
  Target,
  BarChart3,
  UserCheck,
  UserX,
  Timer,
  ClipboardList,
  ChevronRight,
} from 'lucide-react'
import { cn, formatDate, formatTime, isSunday } from '@/lib/utils'
import type {
  AppUser,
  Department,
  Task,
  Attendance,
  EODReport,
  DailyMetrics,
} from '@/types'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeClass(status: string) {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'late':
      return 'bg-amber-100 text-amber-800 border-amber-300'
    case 'half_day':
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'absent':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'submitted':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'missed':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'late':
      return 'bg-amber-100 text-amber-800 border-amber-300'
    case 'todo':
      return 'bg-slate-100 text-slate-800 border-slate-300'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'blocked':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'done':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-300'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-300'
    case 'low':
      return 'bg-slate-100 text-slate-800 border-slate-300'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300'
  }
}

function statusLabel(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function priorityLabel(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

const isSalesDept = (dept: Department | null) =>
  dept?.name?.toLowerCase().includes('sales') ?? false

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-12 animate-pulse rounded bg-slate-200" />
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-1 h-4 w-48 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded bg-slate-100"
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded bg-slate-100"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="size-8 text-amber-500 mb-2" />
        <p className="text-sm text-slate-500">Please log in to view the dashboard.</p>
        <Link href="/login" className="mt-2 text-sm text-blue-600 hover:underline">
          Go to Login
        </Link>
      </div>
    )
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('app_user')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<AppUser>()

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="size-8 text-amber-500 mb-2" />
        <p className="text-sm text-slate-500">
          User profile not found. Please contact an administrator.
        </p>
      </div>
    )
  }

  // Fetch department
  let department: Department | null = null
  if (profile.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('*')
      .eq('id', profile.department_id)
      .maybeSingle<Department>()
    department = dept ?? null
  }

  const today = new Date().toISOString().split('T')[0]

  // =========================================================================
  // ROLE: Employee
  // =========================================================================
  if (profile.role === 'employee') {
    // --- Queries ---
    const { data: todayAttendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .maybeSingle<Attendance>()

    const { data: todayTasksRaw } = await supabase
      .from('tasks')
      .select('status')
      .eq('assigned_to', profile.id)

    const tasks = todayTasksRaw as Pick<Task, 'status'>[] | null
    const taskCounts = { todo: 0, in_progress: 0, blocked: 0, done: 0, total: 0 }
    if (tasks) {
      for (const t of tasks) {
        taskCounts.total++
        if (t.status === 'todo') taskCounts.todo++
        else if (t.status === 'in_progress') taskCounts.in_progress++
        else if (t.status === 'blocked') taskCounts.blocked++
        else if (t.status === 'done') taskCounts.done++
      }
    }

    const { data: todayEOD } = await supabase
      .from('eod_reports')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .maybeSingle<EODReport>()

    // Sales metrics
    let todayMetrics: DailyMetrics | null = null
    if (isSalesDept(department)) {
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', profile.id)
        .eq('date', today)
        .maybeSingle<DailyMetrics>()
      todayMetrics = metrics ?? null
    }

    const isSundayToday = isSunday(today)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-slate-500">
            {isSundayToday ? "Today is Sunday — enjoy your day off!" : "Here's your daily overview."}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Today's Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Clock className="size-4" />
                Today&apos;s Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayAttendance ? (
                <div className="space-y-1">
                  <Badge
                    variant="outline"
                    className={cn('text-sm', statusBadgeClass(todayAttendance.status))}
                  >
                    {statusLabel(todayAttendance.status)}
                  </Badge>
                  {todayAttendance.check_in && (
                    <p className="text-xs text-slate-400">
                      In: {formatTime(todayAttendance.check_in)}
                      {todayAttendance.check_out && ` • Out: ${formatTime(todayAttendance.check_out)}`}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  {isSundayToday ? 'Day off' : 'Not checked in'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <CheckSquare className="size-4" />
                Today&apos;s Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{taskCounts.total}</p>
              {taskCounts.total > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {taskCounts.todo > 0 && (
                    <span className="text-xs text-slate-500">{taskCounts.todo} todo</span>
                  )}
                  {taskCounts.in_progress > 0 && (
                    <span className="text-xs text-blue-600">{taskCounts.in_progress} in progress</span>
                  )}
                  {taskCounts.blocked > 0 && (
                    <span className="text-xs text-red-600">{taskCounts.blocked} blocked</span>
                  )}
                  {taskCounts.done > 0 && (
                    <span className="text-xs text-green-600">{taskCounts.done} done</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* EOD Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <FileText className="size-4" />
                EOD Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSundayToday ? (
                <p className="text-sm text-slate-400">Not required on Sunday</p>
              ) : todayEOD ? (
                <div className="space-y-1">
                  <Badge
                    variant="outline"
                    className={cn('text-sm', statusBadgeClass(todayEOD.status))}
                  >
                    {statusLabel(todayEOD.status)}
                  </Badge>
                  <p className="text-xs text-slate-400">
                    Submitted at {formatTime(todayEOD.submitted_at)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-amber-600 font-medium">Not submitted</p>
                  <Link
                    href="/reports"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    Submit EOD <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales metrics (if sales dept) */}
          {isSalesDept(department) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Target className="size-4" />
                  Leads & Calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-700">
                      {todayMetrics?.leads ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-700">
                      {todayMetrics?.calls ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">Calls</p>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Leads target: 5</span>
                    <span>{todayMetrics ? Math.round((todayMetrics.leads / 5) * 100) : 0}%</span>
                  </div>
                  <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-500"
                      style={{
                        width: `${Math.min(
                          todayMetrics ? (todayMetrics.leads / 5) * 100 : 0,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Building2 className="size-4" />
                  Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-slate-900">
                  {department?.name ?? 'Unassigned'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick actions */}
        {!isSundayToday && (
          <div className="flex flex-wrap gap-3">
            {!todayAttendance && (
              <Link href="/attendance">
                <Button>
                  <LogIn className="size-4" />
                  Check In
                </Button>
              </Link>
            )}
            {todayAttendance?.check_in && !todayAttendance?.check_out && (
              <Link href="/attendance">
                <Button variant="outline">
                  <LogOut className="size-4" />
                  Check Out
                </Button>
              </Link>
            )}
            {!todayEOD && todayAttendance && (
              <Link href="/reports">
                <Button variant="secondary">
                  <FileText className="size-4" />
                  Submit EOD
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Today's tasks detail */}
        {taskCounts.total > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <ClipboardList className="size-4" />
                Task Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {(['todo', 'in_progress', 'blocked', 'done'] as const).map((s) => {
                  const count = taskCounts[s]
                  if (count === 0 && s !== 'todo') return null
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-xs', statusBadgeClass(s))}>
                        {statusLabel(s)}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700">{count}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // =========================================================================
  // ROLE: Admin
  // =========================================================================
  if (profile.role === 'admin') {
    const deptId = department?.id

    // --- Queries (all scoped to department) ---

    // Active users in department
    const { data: deptUsers } = deptId
      ? await supabase
          .from('app_user')
          .select('*')
          .eq('department_id', deptId)
          .eq('status', 'active')
          .order('name')
      : { data: [] }
    const deptUserIds = (deptUsers ?? []).map((u: AppUser) => u.id)

    // Today's attendance for department
    const { data: deptAttendance } = deptId
      ? await supabase
          .from('attendance')
          .select('*')
          .in('user_id', deptUserIds)
          .eq('date', today)
      : { data: [] }
    const attendanceMap = new Map(
      (deptAttendance ?? []).map((a: Attendance) => [a.user_id, a])
    )

    // EOD compliance today
    const { data: deptEODs } = deptId
      ? await supabase
          .from('eod_reports')
          .select('*')
          .in('user_id', deptUserIds)
          .eq('date', today)
      : { data: [] }
    const eodSubmitters = new Set((deptEODs ?? []).map((e: EODReport) => e.user_id))
    const nonSubmitters = (deptUsers ?? []).filter((u: AppUser) => !eodSubmitters.has(u.id))

    // Overdue tasks
    const { data: overdueTasks } = deptId
      ? await supabase
          .from('tasks')
          .select('*')
          .in('assigned_to', deptUserIds)
          .lt('due_date', today)
          .neq('status', 'done')
          .order('due_date', { ascending: true })
          .limit(10)
      : { data: [] }

    // Build a user name lookup map for the overdue tasks
    const userNameMap = new Map(
      (deptUsers ?? []).map((u: AppUser) => [u.id, u.name])
    )

    // Sales metrics (if sales dept)
    let deptMetrics: DailyMetrics[] | null = null
    if (isSalesDept(department)) {
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('*')
        .in('user_id', deptUserIds)
        .eq('date', today)
      deptMetrics = (metrics as DailyMetrics[]) ?? []
    }

    const totalUsers = (deptUsers ?? []).length
    const presentCount = (deptAttendance ?? []).filter(
      (a: Attendance) => a.status === 'present' || a.status === 'late' || a.status === 'half_day'
    ).length
    const absentCount = totalUsers - presentCount
    const eodSubmitted = (deptEODs ?? []).length

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {department?.name ?? 'Team'} Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            {totalUsers} team member{totalUsers !== 1 ? 's' : ''} • Today&apos;s overview
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <UserCheck className="size-4" />
                Present Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">{presentCount}</p>
              <p className="text-xs text-slate-400">out of {totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <UserX className="size-4" />
                Absent Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-700">{absentCount}</p>
              <p className="text-xs text-slate-400">not checked in</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <FileText className="size-4" />
                EOD Submitted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-700">{eodSubmitted}</p>
              <p className="text-xs text-slate-400">out of {totalUsers}</p>
            </CardContent>
          </Card>

          {isSalesDept(department) ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <BarChart3 className="size-4" />
                  Sales Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-700">
                      {deptMetrics?.reduce((sum, m) => sum + m.leads, 0) ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">Leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-700">
                      {deptMetrics?.reduce((sum, m) => sum + m.calls, 0) ?? 0}
                    </p>
                    <p className="text-xs text-slate-400">Calls</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <TrendingUp className="size-4" />
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">
                  {totalUsers > 0 ? Math.round((presentCount / totalUsers) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-400">attendance rate today</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Team Attendance Today */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Users className="size-4" />
                Team Attendance Today
              </CardTitle>
              <Link
                href="/attendance"
                className="text-xs text-blue-600 hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {!deptUsers || deptUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Users className="size-6 mb-1" />
                  <p className="text-sm">No team members</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deptUsers.map((u: AppUser) => {
                    const att = attendanceMap.get(u.id)
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {u.name}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0',
                            att
                              ? statusBadgeClass(att.status)
                              : statusBadgeClass('absent')
                          )}
                        >
                          {att ? statusLabel(att.status) : 'Absent'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* EOD Compliance + Overdue Tasks */}
          <div className="space-y-6">
            {/* EOD non-submitters */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <AlertCircle className="size-4" />
                  EOD Pending ({nonSubmitters.length})
                </CardTitle>
                <Link
                  href="/reports"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Reports
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {nonSubmitters.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-green-600">
                    All team members have submitted their EOD today!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {nonSubmitters.slice(0, 8).map((u: AppUser) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <span className="text-sm text-slate-900">{u.name}</span>
                        <Badge
                          variant="outline"
                          className="bg-red-100 text-red-800 border-red-300 text-xs"
                        >
                          Missing
                        </Badge>
                      </div>
                    ))}
                    {nonSubmitters.length > 8 && (
                      <div className="px-4 py-2 text-xs text-slate-400">
                        +{nonSubmitters.length - 8} more
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Timer className="size-4" />
                  Overdue Tasks
                </CardTitle>
                <Link
                  href="/tasks"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {!overdueTasks || overdueTasks.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-400">
                    No overdue tasks — great job team!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {overdueTasks.slice(0, 8).map((t: any) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {t.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {userNameMap.get(t.assigned_to) ?? 'Unknown'} • Due{' '}
                            {formatDate(t.due_date!)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs shrink-0 ml-2',
                            statusBadgeClass(t.priority)
                          )}
                        >
                          {priorityLabel(t.priority)}
                        </Badge>
                      </div>
                    ))}
                    {overdueTasks.length > 8 && (
                      <div className="px-4 py-2 text-xs text-slate-400">
                        +{overdueTasks.length - 8} more
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // ROLE: Super Admin
  // =========================================================================

  // --- Queries ---
  const { count: totalEmployees } = await supabase
    .from('app_user')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: totalDepartments } = await supabase
    .from('departments')
    .select('*', { count: 'exact', head: true })

  const { data: allDepartments } = await supabase
    .from('departments')
    .select('*')
    .order('name')

  const { count: presentToday } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)
    .in('status', ['present', 'late', 'half_day'])

  const { count: eodSubmittedToday } = await supabase
    .from('eod_reports')
    .select('*', { count: 'exact', head: true })
    .eq('date', today)

  // Get all active users for EOD non-submitter list
  const { data: allActiveUsers } = await supabase
    .from('app_user')
    .select('id, name, email, department_id')
    .eq('status', 'active')

  // EOD submitters today
  const { data: allEODs } = await supabase
    .from('eod_reports')
    .select('user_id')
    .eq('date', today)

  const eodSubmitterSet = new Set((allEODs ?? []).map((e: { user_id: string }) => e.user_id))
  const orgNonSubmitters = (allActiveUsers ?? []).filter(
    (u: { id: string }) => !eodSubmitterSet.has(u.id)
  )

  // Get department member counts via a single query
  const deptMemberCounts: Record<string, number> = {}
  const { data: deptCounts } = await supabase
    .from('app_user')
    .select('department_id')
    .eq('status', 'active')
    .not('department_id', 'is', null)

  for (const row of deptCounts ?? []) {
    const did = (row as any).department_id as string
    deptMemberCounts[did] = (deptMemberCounts[did] ?? 0) + 1
  }

  const attendanceRate =
    (totalEmployees ?? 0) > 0
      ? Math.round(((presentToday ?? 0) / (totalEmployees ?? 1)) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Organisation Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Company-wide overview for {formatDate(today)}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Users className="size-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalEmployees ?? 0}</p>
            <p className="text-xs text-slate-400">active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Building2 className="size-4" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-900">{totalDepartments ?? 0}</p>
            <p className="text-xs text-slate-400">active departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <UserCheck className="size-4" />
              Present Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{presentToday ?? 0}</p>
            <div className="mt-1 flex items-center gap-1">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-green-500"
                  style={{ width: `${attendanceRate}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">{attendanceRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <FileText className="size-4" />
              EOD Submitted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-700">{eodSubmittedToday ?? 0}</p>
            <p className="text-xs text-slate-400">
              of {totalEmployees ?? 0} employees
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Building2 className="size-4" />
              Departments Overview
            </CardTitle>
            <Link
              href="/departments"
              className="text-xs text-blue-600 hover:underline"
            >
              Manage
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!allDepartments || allDepartments.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No departments created yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {allDepartments.map((d: Department) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {d.name}
                      </p>
                      {d.description && (
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">
                          {d.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {deptMemberCounts[d.id] ?? 0} members
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* EOD compliance + quick links */}
        <div className="space-y-6">
          {/* Non-submitters today */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <AlertCircle className="size-4" />
                EOD Pending ({orgNonSubmitters.length})
              </CardTitle>
              <Link
                href="/reports"
                className="text-xs text-blue-600 hover:underline"
              >
                Reports
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {orgNonSubmitters.length === 0 ? (
                <div className="px-4 py-4 text-sm text-green-600">
                  All employees have submitted EOD today!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                  {orgNonSubmitters.slice(0, 10).map((u: { id: string; name: string; email: string }) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div>
                        <p className="text-sm text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-red-100 text-red-800 border-red-300 text-xs"
                      >
                        Missing
                      </Badge>
                    </div>
                  ))}
                  {orgNonSubmitters.length > 10 && (
                    <div className="px-4 py-2 text-xs text-slate-400">
                      +{orgNonSubmitters.length - 10} more
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <ChevronRight className="size-4" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/users">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="size-4" />
                    Manage Users
                  </Button>
                </Link>
                <Link href="/departments">
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="size-4" />
                    Manage Departments
                  </Button>
                </Link>
                <Link href="/attendance">
                  <Button variant="outline" className="w-full justify-start">
                    <Clock className="size-4" />
                    Attendance
                  </Button>
                </Link>
                <Link href="/reports">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="size-4" />
                    Reports
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
