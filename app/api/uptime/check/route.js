import { checkAllMonitors } from '@/lib/uptime'
export async function GET() {
  await checkAllMonitors()
  return Response.json({ ok: true })
}
