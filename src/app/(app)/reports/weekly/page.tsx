'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertCircleIcon,
  RefreshCwIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { getWeeklyReports } from '../actions'
import type { WeeklyReport } from '@/types'
import { cn, formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function WeeklyReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getWeeklyReports({ limit: 12 })
      if (result.success) {
        setReports(result.data)
      } else {
        setError(result.error)
      }
    } catch {
      setError('Failed to load weekly reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Weekly Reports
          </h1>
          <p className="text-sm text-slate-500">
            Auto-generated weekly performance summaries
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={loadReports}>
          <RefreshCwIcon
            className={cn('size-4', loading && 'animate-spin')}
          />
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <RefreshCwIcon className="mx-auto size-8 animate-spin text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">
              Loading weekly reports...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircleIcon className="mx-auto size-8 text-red-400" />
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadReports}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && reports.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100">
              <FileTextIcon className="size-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">
              No weekly reports yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Weekly reports are auto-generated at the end of each week based
              on your EOD submissions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {!loading && !error && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} size="sm">
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <button
                    className="mt-0.5 text-slate-400 hover:text-slate-600"
                    onClick={() =>
                      setExpandedId(
                        expandedId === report.id ? null : report.id
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
                        <CalendarIcon className="size-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          Week of {formatDate(report.week_start)}
                        </span>
                        <span className="text-xs text-slate-400">
                          to {formatDate(report.week_end)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <CheckCircleIcon className="size-3 text-green-500" />
                          {report.tasks_completed} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="size-3 text-blue-500" />
                          {report.days_present}d present
                        </span>
                      </div>
                    </div>

                    {expandedId === report.id && (
                      <div className="mt-3 space-y-3">
                        {report.employee_note && (
                          <div className="rounded-md bg-slate-50 p-3">
                            <h4 className="mb-1 text-xs font-medium text-slate-500 uppercase">
                              Employee Note
                            </h4>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {report.employee_note}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-md bg-green-50 p-2 text-center">
                            <p className="text-xs text-green-600">Tasks</p>
                            <p className="text-lg font-bold text-green-700">
                              {report.tasks_completed}
                            </p>
                          </div>
                          <div className="rounded-md bg-blue-50 p-2 text-center">
                            <p className="text-xs text-blue-600">EODs Submitted</p>
                            <p className="text-lg font-bold text-blue-700">
                              {report.eod_submitted}/6
                            </p>
                          </div>
                          <div className="rounded-md bg-purple-50 p-2 text-center">
                            <p className="text-xs text-purple-600">Days Present</p>
                            <p className="text-lg font-bold text-purple-700">
                              {report.days_present}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400">
                          Generated on{' '}
                          {formatDate(report.generated_at)}
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
  )
}
