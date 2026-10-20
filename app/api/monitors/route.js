import { createAdminClient } from '@/lib/supabase/client.js'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('monitors').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return Response.json(data || [])
  } catch (e) {
    console.error("MONITORS GET ERROR:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const supabase = createAdminClient()
    const { name, url } = await req.json()
    const { data, error } = await supabase.from('monitors').insert({ name, url }).select().single()
    if (error) throw error
    return Response.json(data)
  } catch (e) {
    console.error("MONITORS POST ERROR:", e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}


export async function DELETE(req) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: "id required" }, { status: 400 })
    const { error } = await supabase.from('monitors').delete().eq('id', id)
    if (error) throw error
    return Response.json({ ok: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
