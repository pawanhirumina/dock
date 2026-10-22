import { createAdminClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ users: data.users })
}

export async function POST(req) {
  const { email, password } = await req.json()
  
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const admin = createAdminClient()
  
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-verified
    user_metadata: { created_by: 'admin-panel' }
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  return NextResponse.json({ user: data.user })
}