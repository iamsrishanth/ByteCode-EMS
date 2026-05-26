import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUsers, getDepartmentsForSelect } from './actions'
import type { UserWithDepartment } from './actions'
import UsersClient from './users-client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()

  // Auth & role check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/admin/users')
  }

  const { data: profile } = await supabase
    .from('app_user')
    .select('role, department_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Fetch initial data
  const [usersResult, deptsResult] = await Promise.all([
    getUsers({}),
    getDepartmentsForSelect({}),
  ])

  const users: UserWithDepartment[] = usersResult.success ? usersResult.data : []
  const departments = deptsResult.success ? deptsResult.data : []

  if (!usersResult.success) {
    console.error('[UsersPage] Failed to load users:', usersResult.error)
  }

  return (
    <UsersClient
      initialUsers={users}
      departments={departments}
      currentUserRole={profile.role}
      currentUserDepartmentId={profile.department_id ?? null}
    />
  )
}
