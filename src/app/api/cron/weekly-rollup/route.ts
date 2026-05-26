import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/admin'

/**
 * POST /api/cron/weekly-rollup
 *
 * Triggered by pg_cron (primary) or Vercel Cron (backup) on Saturdays.
 * Calls process_weekly_rollup() which aggregates weekly data into
 * weekly_report rows for the Mon-Sat week that just ended.
 *
 * Protected by CRON_SECRET via middleware.
 */
export async function POST() {
  try {
    const supabase = createServiceClient()

    const { error } = await supabase.rpc('process_weekly_rollup')

    if (error) {
      console.error('[weekly-rollup] Failed:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Count reports generated
    const { count, error: countError } = await supabase
      .from('weekly_report')
      .select('*', { count: 'exact', head: true })
      .gte('generated_at', new Date(Date.now() - 3600000).toISOString()) // last hour

    return NextResponse.json({
      success: true,
      message: `Weekly rollup completed. ${count} reports generated.`,
      reportCount: count ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[weekly-rollup] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
