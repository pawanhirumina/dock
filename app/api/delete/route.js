import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/client'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

export async function POST(req) {

  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, public_id } = await req.json()
    if (!id || !public_id) {
      return NextResponse.json({ error: 'Missing id or public_id' }, { status: 400 })
    }

    const cloudResult = await cloudinary.uploader.destroy(public_id)

    const supabase = createAdminClient()
    const { error } = await supabase.from('images').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ status: "ok", cloudinary: cloudResult })
  } catch (e) {
    console.error('DELETE FAILED:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}