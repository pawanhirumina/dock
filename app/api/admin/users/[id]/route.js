import { createAdminClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

export async function DELETE(req, { params }) {
  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}