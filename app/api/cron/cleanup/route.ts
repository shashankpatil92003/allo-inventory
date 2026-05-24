import { NextResponse } from 'next/server'
import { releaseExpiredReservations } from '@/lib/cleanup'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await releaseExpiredReservations()
  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}