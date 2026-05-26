import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/export/attendance?month=2026-05&userId=...&format=csv
 *
 * Exports attendance records as CSV. Scoped by role:
 * - Employee: own records only
 * - Admin: own department
 * - Super Admin: all records
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: profile } = await supabase
      .from('app_user')
      .select('role, department_id')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM
    const userId = searchParams.get('userId')
    
    // Build query
    let query = supabase
      .from('attendance')
      .select('*, app_user!inner(name, email, department_id)')
      .order('work_date', { ascending: false })
    
    // Role-based scoping
    if (profile.role === 'employee') {
      query = query.eq('user_id', user.id)
    } else if (profile.role === 'admin') {
      query = query.eq('app_user.department_id', profile.department_id!)
    }
    // super_admin sees all
    
    if (month) {
      query = query.gte('work_date', `${month}-01`).lt('work_date', getNextMonth(month))
    }
    
    if (userId && profile.role !== 'employee') {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Build CSV
    const header = 'Name,Email,Date,Check In,Check Out,Status,Hours'
    const rows = (data as any[]).map((r: any) => {
      const name = r.app_user?.name ?? ''
      const email = r.app_user?.email ?? ''
      return `"${name}","${email}","${r.work_date}","${r.check_in_at || ''}","${r.check_out_at || ''}","${r.status}","${r.total_hours || ''}"`
    })
    
    const csv = [header, ...rows].join('\n')
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=attendance-${month || 'all'}.csv`,
      },
    })
  } catch (err) {
    console.error('[Export Attendance] Error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

function getNextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}
