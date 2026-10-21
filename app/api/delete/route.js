import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { createAdminClient } from '@/lib/supabase/client'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
})

export async function POST(req) {
  try {
    const { id, public_id } = await req.json()
    console.log('Deleting:', id, public_id)

    // 1. Delete from Cloudinary
    const cloudResult = await cloudinary.uploader.destroy(public_id)
    console.log('Cloudinary delete:', cloudResult)

    // 2. Delete from Supabase
    const supabase = createAdminClient()
    const { error } = await supabase.from('images').delete().eq('id', id)
    
    if (error) throw error

    return NextResponse.json({ status: "ok", cloudinary: cloudResult })
  } catch (e) {
    console.error('DELETE FAILED:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}