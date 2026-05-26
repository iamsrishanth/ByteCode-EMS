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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PlusIcon,
  SearchIcon,
  MoreHorizontalIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  Loader2Icon,
  UsersIcon,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { UserWithDepartment } from './actions'
import {
  getUsers,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  getDepartmentsForSelect,
} from './actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleBadgeVariant(role: string) {
  switch (role) {
    case 'super_admin':
      return 'default' as const
    case 'admin':
      return 'secondary' as const
    default:
      return 'ghost' as const
  }
}

function roleLabel(role: string) {
  switch (role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    default:
      return 'Employee'
  }
}

function statusBadgeVariant(status: string) {
  return status === 'active' ? 'default' : 'destructive'
}

// ---------------------------------------------------------------------------
// Types for forms
// ---------------------------------------------------------------------------

interface UserFormData {
  email: string
  name: string
  role: string
  department_id: string | null
}

const emptyForm: UserFormData = {
  email: '',
  name: '',
  role: 'employee',
  department_id: null,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UsersClientProps {
  initialUsers: UserWithDepartment[]
  departments: { id: string; name: string }[]
  currentUserRole: string
  currentUserDepartmentId: string | null
}

export default function UsersClient({
  initialUsers,
  departments,
  currentUserRole,
  currentUserDepartmentId,
}: UsersClientProps) {
  const isSuperAdmin = currentUserRole === 'super_admin'

  // Data
  const [users, setUsers] = useState<UserWithDepartment[]>(initialUsers)
  const [loading, setLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserWithDepartment | null>(null)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<UserWithDepartment | null>(null)
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [promoteTarget, setPromoteTarget] = useState<UserWithDepartment | null>(null)
  const [promoteToRole, setPromoteToRole] = useState('')

  // Form state
  const [form, setForm] = useState<UserFormData>(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // ---------------------------------------------------------------------------
  // Fetch users with current filters
  // ---------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const result = await getUsers({
      search: search || undefined,
      role: roleFilter && roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
      department_id: deptFilter && deptFilter !== 'all' ? deptFilter : undefined,
    })
    if (result.success) {
      setUsers(result.data)
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }, [search, roleFilter, statusFilter, deptFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ---------------------------------------------------------------------------
  // Form handlers
  // ---------------------------------------------------------------------------

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.email) errors.email = 'Email is required'
    if (!form.name) errors.name = 'Name is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreateUser() {
    if (!validateForm()) return

    setFormLoading(true)
    const result = await createUser({
      email: form.email,
      name: form.name,
      role: form.role as 'employee' | 'admin' | 'super_admin',
      department_id: form.department_id || null,
    })

    if (result.success) {
      toast.success(`User "${form.name}" created successfully.`)
      setAddDialogOpen(false)
      setForm(emptyForm)
      fetchUsers()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  async function handleUpdateUser() {
    if (!editUser) return

    const updates: Record<string, unknown> = {}
    if (form.role !== editUser.role) updates.role = form.role
    if (form.department_id !== editUser.department_id)
      updates.department_id = form.department_id
    if (form.name !== editUser.name) updates.name = form.name

    if (Object.keys(updates).length === 0) {
      toast.info('No changes detected.')
      setEditDialogOpen(false)
      return
    }

    setFormLoading(true)
    const result = await updateUser({
      id: editUser.id,
      ...updates,
    })

    if (result.success) {
      toast.success('User updated successfully.')
      setEditDialogOpen(false)
      setEditUser(null)
      fetchUsers()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return

    setFormLoading(true)
    const result = await deactivateUser({ id: deactivateTarget.id })

    if (result.success) {
      toast.success(`User "${deactivateTarget.name}" deactivated.`)
      setDeactivateDialogOpen(false)
      setDeactivateTarget(null)
      fetchUsers()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  async function handleReactivate(user: UserWithDepartment) {
    setFormLoading(true)
    const result = await reactivateUser({ id: user.id })

    if (result.success) {
      toast.success(`User "${user.name}" reactivated.`)
      fetchUsers()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  async function handlePromote() {
    if (!promoteTarget) return

    setFormLoading(true)
    const result = await updateUser({
      id: promoteTarget.id,
      role: promoteToRole as 'admin',
    })

    if (result.success) {
      toast.success(
        `User "${promoteTarget.name}" promoted to ${roleLabel(promoteToRole)}.`
      )
      setPromoteDialogOpen(false)
      setPromoteTarget(null)
      fetchUsers()
    } else {
      toast.error(result.error)
    }
    setFormLoading(false)
  }

  // ---------------------------------------------------------------------------
  // Dialog openers
  // ---------------------------------------------------------------------------

  function openAddDialog() {
    setForm({
      email: '',
      name: '',
      role: 'employee',
      department_id: currentUserDepartmentId,
    })
    setFormErrors({})
    setAddDialogOpen(true)
  }

  function openEditDialog(user: UserWithDepartment) {
    setEditUser(user)
    setForm({
      email: user.email,
      name: user.name,
      role: user.role,
      department_id: user.department_id,
    })
    setFormErrors({})
    setEditDialogOpen(true)
  }

  // ---------------------------------------------------------------------------
  // The visible department list for selects
  // ---------------------------------------------------------------------------

  const visibleDepartments = isSuperAdmin
    ? departments
    : departments.filter((d) => d.id === currentUserDepartmentId)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Filters */}
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? '')}>
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? '')}>
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {isSuperAdmin && departments.length > 1 && (
            <Select value={deptFilter} onValueChange={(v) => setDeptFilter(v ?? '')}>
              <SelectTrigger size="sm" className="w-[160px]">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button onClick={openAddDialog} size="sm">
          <PlusIcon className="size-4" />
          Add User
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="size-6 animate-spin text-slate-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <UsersIcon className="size-12 mb-2 opacity-30" />
            <p className="text-sm">No users found.</p>
            <p className="text-xs mt-1">
              {search || roleFilter || statusFilter || deptFilter
                ? 'Try adjusting your filters.'
                : 'Click "Add User" to create the first user.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name / Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <UserIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(user.role)}>
                      {roleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {user.department_name || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {(user as any).job_title || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        user.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      )}
                    >
                      {user.status === 'active' ? (
                        <CheckCircleIcon className="size-3" />
                      ) : (
                        <XCircleIcon className="size-3" />
                      )}
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {formatDate(user.created_at)}
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
                          onClick={() => openEditDialog(user)}
                        >
                          Edit
                        </DropdownMenuItem>

                        {user.status === 'active' ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setDeactivateTarget(user)
                              setDeactivateDialogOpen(true)
                            }}
                            className="text-red-600"
                          >
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleReactivate(user)}
                          >
                            Reactivate
                          </DropdownMenuItem>
                        )}

                        {/* Promote: only for super_admin, and only to admin */}
                        {isSuperAdmin &&
                          user.role === 'employee' &&
                          user.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setPromoteTarget(user)
                                setPromoteToRole('admin')
                                setPromoteDialogOpen(true)
                              }}
                            >
                              Promote to Admin
                            </DropdownMenuItem>
                          )}

                        {isSuperAdmin &&
                          user.role === 'admin' &&
                          user.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setPromoteTarget(user)
                                setPromoteToRole('super_admin')
                                setPromoteDialogOpen(true)
                              }}
                            >
                              Promote to Super Admin
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ───── Add User Dialog ───── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a new user. They will receive a password reset email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
              {formErrors.email && (
                <p className="text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                placeholder="John Doe"
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
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v ?? 'employee' })}
              >
                <SelectTrigger id="add-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-dept">Department</Label>
              <Select
                value={form.department_id ?? 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, department_id: v === 'none' || v === null ? null : v })
                }
              >
                <SelectTrigger id="add-dept" className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {visibleDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button onClick={handleCreateUser} disabled={formLoading}>
              {formLoading && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Edit User Dialog ───── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update role, department, or name for {editUser?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v ?? 'employee' })}
              >
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dept">Department</Label>
              <Select
                value={form.department_id ?? 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, department_id: v === 'none' || v === null ? null : v })
                }
              >
                <SelectTrigger id="edit-dept" className="w-full">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {visibleDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button onClick={handleUpdateUser} disabled={formLoading}>
              {formLoading && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Deactivate Confirmation ───── */}
      <Dialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{' '}
              <strong>{deactivateTarget?.name}</strong>? They will no longer be
              able to sign in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={formLoading}
            >
              {formLoading && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───── Promote Confirmation ───── */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Promote to {roleLabel(promoteToRole)}</DialogTitle>
            <DialogDescription>
              <div className="flex items-start gap-2 mt-1">
                <AlertTriangleIcon className="size-5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  You are about to promote{' '}
                  <strong>{promoteTarget?.name}</strong> to{' '}
                  <strong>{roleLabel(promoteToRole)}</strong>. This grants them
                  additional permissions. Continue?
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button onClick={handlePromote} disabled={formLoading}>
              {formLoading && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Confirm Promotion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
