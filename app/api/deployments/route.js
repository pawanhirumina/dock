import { getAllDeployments } from '@/lib/vercel'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // 1. AUTH - fix your pentest fail (was 200 without login)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: { getAll: () => cookieStore.getAll() }
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.VERCEL_TOKEN && !process.env.VC_API_TOKEN) {
      console.error('Missing VERCEL_TOKEN in env')
      return NextResponse.json({ error: 'Server misconfigured: missing VERCEL_TOKEN' }, { status: 500 })
    }

    const deployments = await getAllDeployments()
    return NextResponse.json({ deployments }, {
      headers: { 'Cache-Control': 'no-store' }
    })

  } catch (e) {
    console.error('GET /api/deployments failed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}