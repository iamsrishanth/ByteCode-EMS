import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDepartments, getEligibleHeads } from './actions'
import type { DepartmentWithStats } from './actions'
import DepartmentsClient from './departments-client'

export const dynamic = 'force-dynamic'

export default async function DepartmentsPage() {
  const supabase = await createClient()

  // Auth & role check: super_admin only
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/admin/departments')
  }

  const { data: profile } = await supabase
    .from('app_user')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // Fetch initial data
  const [deptsResult, headsResult] = await Promise.all([
    getDepartments({}),
    getEligibleHeads({}),
  ])

  const departments: DepartmentWithStats[] = deptsResult.success
    ? deptsResult.data
    : []
  const heads = headsResult.success ? headsResult.data : []

  if (!deptsResult.success) {
    console.error(
      '[DepartmentsPage] Failed to load departments:',
      deptsResult.error
    )
  }

  return (
    <DepartmentsClient
      initialDepartments={departments}
      initialHeads={heads}
    />
  )
}
