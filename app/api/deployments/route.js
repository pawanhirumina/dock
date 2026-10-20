import { getAllDeployments } from '@/lib/vercel'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const deployments = await getAllDeployments()
    return NextResponse.json(deployments)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
