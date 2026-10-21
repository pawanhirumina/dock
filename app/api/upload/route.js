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
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'dev-dashboard', resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve(result)
      )
      uploadStream.end(buffer)
    })

    const supabase = createAdminClient()
    const { data, error } = await supabase.from('images').insert({
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
    }).select().single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e) {
    console.error('UPLOAD FAILED:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}