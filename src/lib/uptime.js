import { createAdminClient } from './supabase/client'

export async function checkAllMonitors() {
  const supabase = createAdminClient()
  const { data: monitors } = await supabase.from('monitors').select('*')
  if (!monitors) return
  
  for (const m of monitors) {
    const start = Date.now()
    let status = 0
    let isUp = false
    try {
      const res = await fetch(m.url, { method: 'GET', signal: AbortSignal.timeout(10000) })
      status = res.status
      isUp = res.ok
    } catch (e) {
      status = 0
      isUp = false
    }
    const responseTime = Date.now() - start

    await supabase.from('uptime_checks').insert({
      monitor_id: m.id,
      status,
      response_time: responseTime
    })

    const { data: recent } = await supabase.from('uptime_checks')
      .select('status').eq('monitor_id', m.id).order('created_at', { ascending: false }).limit(100)
    
    const upCount = recent?.filter(c => c.status >= 200 && c.status < 400).length || 0
    const uptimePct = recent?.length ? (upCount / recent.length) * 100 : 100

    await supabase.from('monitors').update({
      status: isUp ? 'up' : 'down',
      response_time: responseTime,
      last_checked: new Date().toISOString(),
      uptime_pct: uptimePct
    }).eq('id', m.id)
  }
}
