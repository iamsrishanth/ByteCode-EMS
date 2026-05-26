import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/export/weekly?weekStart=2026-05-18
 *
 * Exports weekly reports as CSV. Scoped by role.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
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
    const weekStart = searchParams.get('weekStart')
    
    let query = supabase
      .from('weekly_report')
      .select('*, app_user!inner(name, email, department_id)')
      .order('week_start', { ascending: false })
    
    if (profile.role === 'employee') {
      query = query.eq('user_id', user.id)
    } else if (profile.role === 'admin') {
      query = query.eq('app_user.department_id', profile.department_id!)
    }
    
    if (weekStart) query = query.eq('week_start', weekStart)
    
    const { data, error } = await query
    
    if (error) throw error
    
    const header = 'Name,Email,Week Start,Week End,Leads,Calls,Tasks Completed,EOD Submitted,Days Present,Note'
    const rows = (data as any[]).map((r: any) => {
      const name = r.app_user?.name ?? ''
      const email = r.app_user?.email ?? ''
      const note = (r.employee_note || '').replace(/"/g, '""')
      return `"${name}","${email}","${r.week_start}","${r.week_end}","${r.leads_total || 0}","${r.calls_total || 0}","${r.tasks_completed || 0}","${r.eod_submitted || 0}","${r.days_present || 0}","${note}"`
    })
    
    const csv = [header, ...rows].join('\n')
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=weekly-reports-${weekStart || 'all'}.csv`,
      },
    })
  } catch (err) {
    console.error('[Export Weekly] Error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
