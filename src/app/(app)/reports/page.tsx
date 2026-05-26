'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  SendIcon,
  ClockIcon,
  HistoryIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  BarChart3Icon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

import {
  submitEOD,
  getTodayEOD,
  getEODHistory,
  getEODCompliance,
  getProfile,
} from './actions'
import type { EODReportWithUser, EODComplianceRow } from './actions'
import type { EODStatus, ActionResult, EODReport } from '@/types'
import { cn, formatDate, formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EOD_STATUS_BADGE: Record<
  EODStatus | 'not_submitted',
  'default' | 'destructive' | 'secondary' | 'ghost'
> = {
  submitted: 'default',
  missed: 'destructive',
  late: 'secondary',
  not_submitted: 'ghost',
}

const EOD_STATUS_ICON: Record<EODStatus | 'not_submitted', React.ReactNode> = {
  submitted: <CheckCircleIcon className="size-4 text-green-500" />,
  late: <ClockIcon className="size-4 text-amber-500" />,
  missed: <XCircleIcon className="size-4 text-red-500" />,
  not_submitted: <AlertCircleIcon className="size-4 text-slate-400" />,
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('submit')
  const [userRole, setUserRole] = useState<string>('employee')
  const [userDept, setUserDept] = useState<string | null>(null)

  // ---- Submit EOD state ----
  const [todayEOD, setTodayEOD] = useState<EODReport | null>(null)
  const [eodLoading, setEodLoading] = useState(true)
  const [summary, setSummary] = useState('')
  const [hoursWorked, setHoursWorked] = useState('')
  const [leads, setLeads] = useState('')
  const [calls, setCalls] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  // ---- History state ----
  const [history, setHistory] = useState<EODReportWithUser[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ---- Compliance state ----
  const [compliance, setCompliance] = useState<EODComplianceRow[]>([])
  const [complianceLoading, setComplianceLoading] = useState(false)
  const [complianceDate, setComplianceDate] = useState('')

  // ---- Load today's EOD ----
  const loadTodayEOD = useCallback(async () => {
    setEodLoading(true)
    try {
      const result = await getTodayEOD()
      if (result.success) {
        setTodayEOD(result.data)
        setAlreadySubmitted(!!result.data)
        if (result.data) {
          setSummary(result.data.summary)
          setHoursWorked(String(result.data.hours_worked))
        }
      }
    } catch {
      // ignore
    } finally {
      setEodLoading(false)
    }
  }, [])

  // ---- Load history ----
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const result = await getEODHistory({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      if (result.success) {
        setHistory(result.data)
      } else {
        setHistoryError(result.error)
      }
    } catch {
      setHistoryError('Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [dateFrom, dateTo])

  // ---- Load compliance ----
  const loadCompliance = useCallback(async () => {
    setComplianceLoading(true)
    try {
      const result = await getEODCompliance(complianceDate || undefined)
      if (result.success) {
        setCompliance(result.data)
        // Infer role from having multiple users
        if (result.data.length > 1) {
          setUserRole('admin')
        }
      }
    } catch {
      // ignore
    } finally {
      setComplianceLoading(false)
    }
  }, [complianceDate])

  useEffect(() => {
    // Load profile for role/department detection
    async function loadProfile() {
      const res = await getProfile()
      if (res.success) {
        setUserRole(res.data.user.role)
        setUserDept(res.data.department?.name ?? null)
      }
    }
    loadProfile()
    loadTodayEOD()
    loadHistory()
    loadCompliance()
  }, [loadTodayEOD, loadHistory, loadCompliance])

  // ---- Submit handler ----
  async function handleSubmit() {
    if (summary.length < 10) {
      toast.error('Summary must be at least 10 characters')
      return
    }
    if (!hoursWorked || Number(hoursWorked) <= 0) {
      toast.error('Hours worked must be a positive number')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        summary: summary.trim(),
        hours_worked: Number(hoursWorked),
      }

      // If sales department, include metrics
      if (userDept?.toLowerCase().includes('sales')) {
        if (leads) payload.leads = Number(leads)
        if (calls) payload.calls = Number(calls)
      }

      const result = await submitEOD(payload)
      if (result.success) {
        toast.success(
          alreadySubmitted
            ? 'EOD report updated'
            : 'EOD report submitted'
        )
        setAlreadySubmitted(true)
        loadTodayEOD()
        loadHistory()
      } else {
        toast.error(result.error || 'Failed to submit EOD report')
      }
    } catch {
      toast.error('Failed to submit EOD report')
    } finally {
      setSubmitting(false)
    }
  }

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          EOD Reports
        </h1>
        <p className="text-sm text-slate-500">
          End-of-day reports and compliance tracking
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="submit">
            <SendIcon className="size-4" />
            Submit EOD
          </TabsTrigger>
          <TabsTrigger value="history">
            <HistoryIcon className="size-4" />
            History
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="compliance">
              <UsersIcon className="size-4" />
              Compliance
            </TabsTrigger>
          )}
        </TabsList>

        {/* ================================================================ */}
        {/* Tab 1: Submit EOD                                                */}
        {/* ================================================================ */}
        <TabsContent value="submit">
          <div className="mt-4 space-y-4">
            {eodLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <RefreshCwIcon className="size-6 animate-spin text-slate-400" />
                </CardContent>
              </Card>
            ) : alreadySubmitted ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <CheckCircleIcon className="mx-auto size-10 text-green-500" />
                  <h3 className="mt-3 text-sm font-medium text-slate-900">
                    EOD report already submitted for today
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Status:{' '}
                    <Badge
                      variant={
                        EOD_STATUS_BADGE[todayEOD?.status ?? 'submitted']
                      }
                      className="ml-1"
                    >
                      {todayEOD?.status ?? 'submitted'}
                    </Badge>
                  </p>
                  {todayEOD?.submitted_at && (
                    <p className="mt-1 text-xs text-slate-400">
                      Submitted at {formatDateTime(todayEOD.submitted_at)}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setAlreadySubmitted(false)}
                  >
                    Edit submission
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {alreadySubmitted
                      ? 'Update Today\'s Report'
                      : 'Submit Today\'s Report'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Summary (min 10 characters)</Label>
                    <Textarea
                      placeholder="What did you work on today?"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Hours Worked</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="8"
                        value={hoursWorked}
                        onChange={(e) =>
                          setHoursWorked(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Sales department extra fields */}
                  {userDept?.toLowerCase().includes('sales') && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h4 className="mb-2 text-xs font-semibold text-slate-500 uppercase">
                        Sales Metrics
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Leads</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={leads}
                            onChange={(e) =>
                              setLeads(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Calls</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={calls}
                            onChange={(e) =>
                              setCalls(e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={submitting}>
                      {submitting ? (
                        <>
                          <RefreshCwIcon className="size-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <SendIcon className="size-4" />
                          {alreadySubmitted
                            ? 'Update Report'
                            : 'Submit Report'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* Tab 2: History                                                   */}
        {/* ================================================================ */}
        <TabsContent value="history">
          <div className="mt-4 space-y-4">
            {/* Date filters */}
            <Card size="sm">
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-36"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-36"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={loadHistory}
                  >
                    <RefreshCwIcon className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loading */}
            {historyLoading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCwIcon className="size-6 animate-spin text-slate-400" />
              </div>
            )}

            {/* Error */}
            {!historyLoading && historyError && (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertCircleIcon className="mx-auto size-8 text-red-400" />
                  <p className="mt-2 text-sm text-red-600">
                    {historyError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={loadHistory}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Empty */}
            {!historyLoading &&
              !historyError &&
              history.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <HistoryIcon className="mx-auto size-10 text-slate-300" />
                    <h3 className="mt-3 text-sm font-medium text-slate-900">
                      No EOD reports found
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Submit your first report in the &quot;Submit
                      EOD&quot; tab
                    </p>
                  </CardContent>
                </Card>
              )}

            {/* History list */}
            {!historyLoading &&
              !historyError &&
              history.length > 0 && (
                <div className="space-y-2">
                  {history.map((report) => (
                    <Card key={report.id} size="sm">
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <button
                            className="mt-0.5 text-slate-400 hover:text-slate-600"
                            onClick={() =>
                              setExpandedId(
                                expandedId === report.id
                                  ? null
                                  : report.id
                              )
                            }
                          >
                            {expandedId === report.id ? (
                              <ChevronUpIcon className="size-4" />
                            ) : (
                              <ChevronDownIcon className="size-4" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatDate(report.date)}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {report.user_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    EOD_STATUS_BADGE[
                                      report.status
                                    ]
                                  }
                                  className="text-[10px]"
                                >
                                  {EOD_STATUS_ICON[report.status]}
                                  <span className="ml-1">
                                    {report.status}
                                  </span>
                                </Badge>
                                <span className="text-xs text-slate-400">
                                  {report.hours_worked}h
                                </span>
                              </div>
                            </div>

                            {expandedId === report.id && (
                              <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                                <p>{report.summary}</p>
                                <p className="mt-1 text-slate-400">
                                  Submitted:{' '}
                                  {formatDateTime(
                                    report.submitted_at
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* Tab 3: Compliance (Admin only)                                    */}
        {/* ================================================================ */}
        {isAdmin && (
          <TabsContent value="compliance">
            <div className="mt-4 space-y-4">
              {/* Date picker */}
              <Card size="sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={complianceDate}
                      onChange={(e) =>
                        setComplianceDate(e.target.value)
                      }
                      className="w-40"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={loadCompliance}
                    >
                      <RefreshCwIcon className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Loading */}
              {complianceLoading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCwIcon className="size-6 animate-spin text-slate-400" />
                </div>
              )}

              {/* Compliance Table */}
              {!complianceLoading && compliance.length > 0 && (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compliance.map((row) => (
                          <TableRow key={row.user_id}>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">
                                  {row.user_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {row.user_email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {row.department_name || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  EOD_STATUS_BADGE[
                                    row.status
                                  ]
                                }
                                className="text-[10px]"
                              >
                                {EOD_STATUS_ICON[row.status]}
                                <span className="ml-1">
                                  {row.status === 'not_submitted'
                                    ? 'Not Submitted'
                                    : row.status}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {row.submitted_at
                                ? formatDateTime(
                                    row.submitted_at
                                  )
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}

              {/* Empty compliance */}
              {!complianceLoading && compliance.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BarChart3Icon className="mx-auto size-10 text-slate-300" />
                    <h3 className="mt-3 text-sm font-medium text-slate-900">
                      No data available
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Select a date to view team compliance
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
