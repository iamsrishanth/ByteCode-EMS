'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  PlusIcon,
  Building2Icon,
  UsersIcon,
  TargetIcon,
  PhoneIcon,
  MoreHorizontalIcon,
  Loader2Icon,
  Edit2Icon,
  AlertTriangleIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DepartmentWithStats } from './actions'
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  getEligibleHeads,
  canDeleteDepartment,
} from './actions'

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

interface DeptFormData {
  name: string
  description: string
  head_id: string | null
  leads_target: string
  calls_target: string
}

const emptyDeptForm: DeptFormData = {
  name: '',
  description: '',
  head_id: null,
  leads_target: '',
  calls_target: '',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DepartmentsClientProps {
  initialDepartments: DepartmentWithStats[]
  initialHeads: { id: string; name: string; email: string; role: string }[]
}

export default function DepartmentsClient({
  initialDepartments,
  initialHeads,
}: DepartmentsClientProps) {
  // Data
  const [departments, setDepartments] = useState<DepartmentWithStats[]>(
    initialDepartments
  )
  const [heads, setHeads] = useState(initialHeads)
  const [loading, setLoading] = useState(false)

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editDept, setEditDept] = useState<DepartmentWithStats | null>(null)
  const [deleteWarnOpen, setDeleteWarnOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DepartmentWithStats | null>(null)
  const [deleteInfo, setDeleteInfo] = useState<{
    has_active_users: boolean
    user_count: number
  } | null>(null)

  // Form
  const [form, setForm] = useState<DeptFormData>(emptyDeptForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // ---------------------------------------------------------------------------
  // Fetch data
  // ---------------------------------------------------------------------------

  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    const result = await getDepartments({})
    if (result.success) {
      setDepartments(result.data)
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }, [])

  const fetchHeads = useCallback(async () => {
    const result = await getEligibleHeads({})
    if (result.success) {
      setHeads(result.data)
    }
  }, [])

  useEffect(() => {
    fetchHeads()
  }, [fetchHeads])

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  function validateDeptForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Department name is required'
    if (form.leads_target && isNaN(Number(form.leads_target)))
      errors.leads_target = 'Must be a number'
    if (form.calls_target && isNaN(Number(form.calls_target)))
      errors.calls_target = 'Must be a number'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleCreate() {
    if (!validateDeptForm()) return

    setFormLoading(true)
    const result = await createDepartment({
      name: form.name,
      description: form.description || undefined,
      head_id: form.head_id || null,
      leads_target: form.leads_target
        ? parseInt(form.leads_target, 10)
        : null,
      calls_target: form.calls_target
        ? parseInt(form.calls_target, 10)
        : null,
    })

    if (result.success) {
      toast.success(`Department "${form.name}" created.`)
      setAddDialogOpen(false)
      setForm(emptyDeptForm)
      fetchDepartments()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  async function handleUpdate() {
    if (!editDept) return
    if (!validateDeptForm()) return

    const updates: Record<string, unknown> = {}
    if (form.name !== editDept.name) updates.name = form.name
    if (form.description !== (editDept.description ?? ''))
      updates.description = form.description || null
    if (form.head_id !== editDept.head_id)
      updates.head_id = form.head_id || null
    if (parseInt(form.leads_target || '0') !== (editDept.leads_target ?? 0))
      updates.leads_target = form.leads_target
        ? parseInt(form.leads_target, 10)
        : null
    if (parseInt(form.calls_target || '0') !== (editDept.calls_target ?? 0))
      updates.calls_target = form.calls_target
        ? parseInt(form.calls_target, 10)
        : null

    if (Object.keys(updates).length === 0) {
      toast.info('No changes detected.')
      setEditDialogOpen(false)
      return
    }

    setFormLoading(true)
    const result = await updateDepartment({
      id: editDept.id,
      ...updates,
    })

    if (result.success) {
      toast.success('Department updated.')
      setEditDialogOpen(false)
      setEditDept(null)
      fetchDepartments()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  async function handleToggleStatus(dept: DepartmentWithStats) {
    const newStatus = dept.status === 'active' ? 'inactive' : 'active'
    setFormLoading(true)

    // If deactivating, check for active users
    if (newStatus === 'inactive' && dept.employee_count > 0) {
      toast.error(
        `Cannot deactivate department with ${dept.employee_count} active users. Reassign them first.`
      )
      setFormLoading(false)
      return
    }

    const result = await updateDepartment({
      id: dept.id,
      status: newStatus as 'active' | 'inactive',
    })

    if (result.success) {
      toast.success(
        `Department "${dept.name}" ${newStatus === 'active' ? 'activated' : 'deactivated'}.`
      )
      fetchDepartments()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  async function checkCanDelete(dept: DepartmentWithStats) {
    setDeleteTarget(dept)
    setDeleteWarnOpen(true)

    const result = await canDeleteDepartment({ id: dept.id })
    if (result.success) {
      setDeleteInfo(result.data)
    }
  }

  // ---------------------------------------------------------------------------
  // Dialog openers
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setForm(emptyDeptForm)
    setFormErrors({})
    setAddDialogOpen(true)
  }

  function openEditDialog(dept: DepartmentWithStats) {
    setEditDept(dept)
    setForm({
      name: dept.name,
      description: dept.description ?? '',
      head_id: dept.head_id,
      leads_target: dept.leads_target?.toString() ?? '',
      calls_target: dept.calls_target?.toString() ?? '',
    })
    setFormErrors({})
    setEditDialogOpen(true)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {departments.length} department{departments.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={openAddDialog} size="sm">
          <PlusIcon className="size-4" />
          Add Department
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading && departments.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="size-6 animate-spin text-slate-400" />
          </div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Building2Icon className="size-12 mb-2 opacity-30" />
            <p className="text-sm">No departments yet.</p>
            <p className="text-xs mt-1">
              Click &ldquo;Add Department&rdquo; to create one.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Leads Target</TableHead>
                <TableHead>Calls Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Building2Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {dept.name}
                        </p>
                        {dept.description && (
                          <p className="truncate text-xs text-slate-400">
                            {dept.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {dept.head_name || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <UsersIcon className="size-3.5 text-slate-400" />
                      {dept.employee_count}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <TargetIcon className="size-3.5 text-slate-400" />
                      {dept.leads_target ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                      <PhoneIcon className="size-3.5 text-slate-400" />
                      {dept.calls_target ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        dept.status === 'active' ? 'default' : 'secondary'
                      }
                      className={cn(
                        dept.status === 'inactive' &&
                          'bg-slate-100 text-slate-500'
                      )}
                    >
                      {dept.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" />
                        }
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(dept)}
                        >
                          <Edit2Icon className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(dept)}
                        >
                          {dept.status === 'active'
                            ? 'Deactivate'
                            : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => checkCanDelete(dept)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ───── Add Department Dialog ───── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>
              Create a new department in the organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-dept-name">Name</Label>
              <Input
                id="add-dept-name"
                placeholder="e.g., Sales"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
              {formErrors.name && (
                <p className="text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-dept-desc">Description</Label>
              <Input
                id="add-dept-desc"
                placeholder="Optional description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-dept-head">Department Head</Label>
              <Select
                value={form.head_id ?? 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, head_id: v === 'none' || v === null ? null : v })
                }
              >
                <SelectTrigger id="add-dept-head" className="w-full">
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No head assigned</SelectItem>
                  {heads.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-leads-target">Leads Target</Label>
                <Input
                  id="add-leads-target"
                  type="number"
                  placeholder="0"
                  value={form.leads_target}
                  onChange={(e) =>
                    setForm({ ...form, leads_target: e.target.value })
                  }
                />
                {formErrors.leads_target && (
                  <p className="text-xs text-red-600">
                    {formErrors.leads_target}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-calls-target">Calls Target</Label>
                <Input
                  id="add-calls-target"
                  type="number"
                  placeholder="0"
                  value={form.calls_target}
                  onChange={(e) =>
                    setForm({ ...form, calls_target: e.target.value })
                  }
                />
                {formErrors.calls_target && (
                  <p className="text-xs text-red-600">
                    {formErrors.calls_target}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button onClick={handleCreate} disabled={formLoading}>
              {formLoading && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Edit Department Dialog ───── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update details for {editDept?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-dept-name">Name</Label>
              <Input
                id="edit-dept-name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
              {formErrors.name && (
                <p className="text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dept-desc">Description</Label>
              <Input
                id="edit-dept-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dept-head">Department Head</Label>
              <Select
                value={form.head_id ?? 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, head_id: v === 'none' || v === null ? null : v })
                }
              >
                <SelectTrigger id="edit-dept-head" className="w-full">
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No head assigned</SelectItem>
                  {heads.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} ({h.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-leads-target">Leads Target</Label>
                <Input
                  id="edit-leads-target"
                  type="number"
                  placeholder="0"
                  value={form.leads_target}
                  onChange={(e) =>
                    setForm({ ...form, leads_target: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-calls-target">Calls Target</Label>
                <Input
                  id="edit-calls-target"
                  type="number"
                  placeholder="0"
                  value={form.calls_target}
                  onChange={(e) =>
                    setForm({ ...form, calls_target: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button onClick={handleUpdate} disabled={formLoading}>
              {formLoading && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Delete Warning Dialog ───── */}
      <Dialog open={deleteWarnOpen} onOpenChange={setDeleteWarnOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cannot Delete Department</DialogTitle>
            <DialogDescription>
              {deleteInfo?.has_active_users ? (
                <div className="flex items-start gap-2 mt-1">
                  <AlertTriangleIcon className="size-5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>{deleteTarget?.name}</strong> has{' '}
                    <strong>{deleteInfo.user_count}</strong> active user
                    {deleteInfo.user_count !== 1 ? 's' : ''}. Please reassign or
                    deactivate all users before deleting this department.
                  </span>
                </div>
              ) : (
                <span>
                  Use the Supabase dashboard or a database tool to delete empty
                  departments. This operation is not supported from the UI to
                  prevent accidental data loss.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="secondary"
              onClick={() => setDeleteWarnOpen(false)}
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
