'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  SearchIcon,
  PlusIcon,
  Trash2Icon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { getTasks, createTask, updateTaskStatus, deleteTask, getProfile } from './actions'
import type { TaskWithAssignee, TaskFilters } from './actions'
import type { TaskPriority, TaskStatus, ActionResult } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_OPTIONS: { value: TaskPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const PRIORITY_VARIANTS: Record<TaskPriority, 'ghost' | 'outline' | 'secondary' | 'default' | 'destructive'> = {
  low: 'ghost',
  medium: 'outline',
  high: 'secondary',
  urgent: 'destructive',
}

const STATUS_VARIANTS: Record<TaskStatus, 'ghost' | 'outline' | 'secondary' | 'default' | 'destructive'> = {
  todo: 'ghost',
  in_progress: 'secondary',
  blocked: 'destructive',
  done: 'default',
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('employee')

  // Filters
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>(
    'all'
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<{ id: string; name: string; email: string; department_id: string | null }[]>([])

  // Detail dialog
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(
    null
  )
  const [detailOpen, setDetailOpen] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<TaskWithAssignee | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)

  // Expanded cards
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ---- Fetch tasks ----
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: TaskFilters = {
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery || undefined,
      }
      const result = await getTasks(filters)
      if (result.success) {
        setTasks(result.data)
      } else {
        setError(result.error)
      }
    } catch (e) {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, searchQuery])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    async function init() {
      const roleResult = await getProfile()
      if (roleResult.success) {
        setUserRole(roleResult.data.user.role)
      }
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('app_user')
          .select('id, name, email, department_id')
          .eq('status', 'active')
          .order('name')
        setUsers(data || [])
      } catch { /* ignore */ }
    }
    init()
  }, [])

  // ---- Status change handler ----
  async function handleStatusChange(
    taskId: string,
    newStatus: TaskStatus
  ) {
    const result = await updateTaskStatus(taskId, newStatus)
    if (result.success) {
      toast.success(`Task status updated to ${newStatus.replace('_', ' ')}`)
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      )
    } else {
      toast.error(result.error || 'Failed to update status')
    }
  }

  // ---- Create task ----
  async function handleCreate() {
    if (!newTitle.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      const result = await createTask({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        assigned_to: newAssignee || undefined,
        priority: newPriority,
        due_date: newDueDate || undefined,
      })
      if (result.success) {
        toast.success('Task created')
        setCreateOpen(false)
        setNewTitle('')
        setNewDescription('')
        setNewPriority('medium')
        setNewDueDate('')
        fetchTasks()
      } else {
        toast.error(result.error || 'Failed to create task')
      }
    } catch {
      toast.error('Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  // ---- Delete task ----
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const result = await deleteTask({ id: deleteTarget.id })
      if (result.success) {
        toast.success('Task deleted')
        setDeleteTarget(null)
        setDetailOpen(false)
        fetchTasks()
      } else {
        toast.error(result.error || 'Failed to delete task')
      }
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  // ---- Helpers ----
  function openDetail(task: TaskWithAssignee) {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tasks
          </h1>
          <p className="text-sm text-slate-500">
            Manage and track your team&apos;s tasks
          </p>
        </div>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button size="sm" />}>
              <PlusIcon className="size-4" />
              New Task
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Task title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newPriority}
                      onValueChange={(v) =>
                        v && setNewPriority(v as TaskPriority)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.filter(
                          (o) => o.value !== 'all'
                        ).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select
                    value={(newAssignee || 'none') as string}
                    onValueChange={(v) => setNewAssignee(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a person..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter showCloseButton>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Task'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card size="sm">
        <CardContent className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  v && setStatusFilter(v as TaskStatus | 'all')
                }
              >
                <SelectTrigger size="sm" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(v) =>
                  v && setPriorityFilter(v as TaskPriority | 'all')
                }
              >
                <SelectTrigger size="sm" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={fetchTasks}
                title="Refresh"
              >
                <RefreshCwIcon className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <RefreshCwIcon className="mx-auto size-8 animate-spin text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">Loading tasks...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircleIcon className="mx-auto size-8 text-red-400" />
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={fetchTasks}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100">
              <SearchIcon className="size-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">
              No tasks found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Create a new task to get started'}
            </p>
            {isAdmin && !searchQuery && (
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <PlusIcon className="size-4" />
                New Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task List */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => {
            const overdue = isOverdue(task.due_date) && task.status !== 'done'
            return (
              <Card
                key={task.id}
                size="sm"
                className={cn(
                  'cursor-pointer transition-shadow hover:shadow-md',
                  overdue && 'ring-2 ring-red-200'
                )}
                onClick={() => openDetail(task)}
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    {/* Expand/Collapse arrow */}
                    <button
                      className="mt-0.5 text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(
                          expandedId === task.id ? null : task.id
                        )
                      }}
                    >
                      {expandedId === task.id ? (
                        <ChevronUpIcon className="size-4" />
                      ) : (
                        <ChevronDownIcon className="size-4" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              task.status === 'done' &&
                                'text-slate-400 line-through'
                            )}
                          >
                            {task.title}
                          </span>
                          {overdue && (
                            <Badge variant="destructive" className="text-[10px]">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={PRIORITY_VARIANTS[task.priority]}
                            className="text-[10px]"
                          >
                            {task.priority}
                          </Badge>
                          {/* Status dropdown */}
                          <Select
                            value={task.status}
                            onValueChange={(v) => {
                              if (v) handleStatusChange(task.id, v as TaskStatus)
                            }}
                          >
                            <SelectTrigger
                              size="sm"
                              className="h-6 gap-1 rounded-md px-1.5 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.filter(
                                (o) => o.value !== 'all'
                              ).map((o) => (
                                <SelectItem
                                  key={o.value}
                                  value={o.value}
                                >
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <UserIcon className="size-3" />
                          {task.assignee_name}
                        </span>
                        {task.due_date && (
                          <span
                            className={cn(
                              'flex items-center gap-1',
                              overdue && 'font-medium text-red-600'
                            )}
                          >
                            <CalendarIcon className="size-3" />
                            {formatDate(task.due_date)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          {formatDate(task.created_at)}
                        </span>
                      </div>

                      {/* Expanded description */}
                      {expandedId === task.id && task.description && (
                        <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="sm:max-w-lg"
          showCloseButton
        >
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedTask.description && (
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-slate-500 uppercase">
                      Description
                    </h4>
                    <p className="text-sm text-slate-700">
                      {selectedTask.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Priority
                    </span>
                    <Badge
                      variant={
                        PRIORITY_VARIANTS[selectedTask.priority]
                      }
                      className="ml-2"
                    >
                      {selectedTask.priority}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Status
                    </span>
                    <Badge
                      variant={
                        STATUS_VARIANTS[selectedTask.status]
                      }
                      className="ml-2"
                    >
                      {selectedTask.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Assigned To
                    </span>
                    <p>{selectedTask.assignee_name}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Assigned By
                    </span>
                    <p>{selectedTask.assigner_name}</p>
                  </div>
                  {selectedTask.due_date && (
                    <div>
                      <span className="text-xs font-medium text-slate-500">
                        Due Date
                      </span>
                      <p>{formatDate(selectedTask.due_date)}</p>
                    </div>
                  )}
                  {selectedTask.completed_at && (
                    <div>
                      <span className="text-xs font-medium text-slate-500">
                        Completed
                      </span>
                      <p>{formatDate(selectedTask.completed_at)}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Created
                    </span>
                    <p>{formatDate(selectedTask.created_at)}</p>
                  </div>
                </div>
              </div>
              <DialogFooter showCloseButton>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(selectedTask)}
                    disabled={deleting}
                  >
                    <Trash2Icon className="size-4" />
                    Delete
                  </Button>
                )}
                <Select
                  value={selectedTask.status}
                  onValueChange={(v) => {
                    if (v) {
                      handleStatusChange(
                        selectedTask.id,
                        v as TaskStatus
                      )
                      setSelectedTask((prev) =>
                        prev ? { ...prev, status: v as TaskStatus } : null
                      )
                    }
                  }}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter(
                      (o) => o.value !== 'all'
                    ).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
            This action cannot be undone.
          </p>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
