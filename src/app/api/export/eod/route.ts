import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/export/eod?date=2026-05-26&userId=...&format=csv
 *
 * Exports EOD reports as CSV. Scoped by role.
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
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const userId = searchParams.get('userId')
    
    let query = supabase
      .from('eod_report')
      .select('*, app_user!inner(name, email, department_id)')
      .order('report_date', { ascending: false })
    
    if (profile.role === 'employee') {
      query = query.eq('user_id', user.id)
    } else if (profile.role === 'admin') {
      query = query.eq('app_user.department_id', profile.department_id!)
    }
    
    if (startDate) query = query.gte('report_date', startDate)
    if (endDate) query = query.lte('report_date', endDate)
    if (userId && profile.role !== 'employee') query = query.eq('user_id', userId)
    
    const { data, error } = await query
    
    if (error) throw error
    
    const header = 'Name,Email,Date,Summary,Hours,Status,Submitted At'
    const rows = (data as any[]).map((r: any) => {
      const name = r.app_user?.name ?? ''
      const email = r.app_user?.email ?? ''
      const summary = (r.summary || '').replace(/"/g, '""').replace(/\n/g, ' ')
      return `"${name}","${email}","${r.report_date}","${summary}","${r.hours_worked || ''}","${r.status}","${r.submitted_at || ''}"`
    })
    
    const csv = [header, ...rows].join('\n')
    const filename = `eod-reports-${startDate || 'all'}.csv`
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${filename}`,
      },
    })
  } catch (err) {
    console.error('[Export EOD] Error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
